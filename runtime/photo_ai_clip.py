"""
TinyCLIP-based zero-shot classifier for fine-grained hauling-item recognition.

Downloads an ONNX TinyCLIP model on first use and labels cropped detections
with hauling-specific names ("motor scooter", "pool table", "bicycle helmet", etc.).
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

_CLIP_MEAN = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
_CLIP_STD = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)


@dataclass(frozen=True)
class ClipLabel:
    key: str
    prompt: str
    score: float


class TinyClipClassifier:
    """Lazy singleton for local zero-shot image classification with TinyCLIP ONNX."""

    _instance: Optional["TinyClipClassifier"] = None

    def __new__(cls) -> "TinyClipClassifier":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._session = None
            cls._instance._tokenizer = None
            cls._instance._model_dir: Optional[Path] = None
        return cls._instance

    @property
    def available(self) -> bool:
        if os.environ.get("HAUL_CLIP_ENABLED", "true").lower() in ("0", "false", "no", "off"):
            return False
        model_dir = self._model_dir_path()
        if not model_dir.exists():
            return False
        model_path = model_dir / "model_q4f16.onnx"
        tokenizer_path = model_dir / "tokenizer.json"
        return model_path.exists() and tokenizer_path.exists()

    def _model_dir_path(self) -> Path:
        if self._model_dir is not None:
            return self._model_dir
        return Path(
            os.environ.get("HAUL_CLIP_MODEL_DIR", "models/tinyclip40")
        ).resolve()

    def set_model_dir(self, model_dir: str) -> None:
        self._model_dir = Path(model_dir).resolve()
        self._session = None
        self._tokenizer = None

    def _load(self) -> None:
        if self._session is not None and self._tokenizer is not None:
            return

        from onnxruntime import InferenceSession
        from tokenizers import Tokenizer

        model_dir = self._model_dir_path()
        if not self.available:
            raise RuntimeError(
                f"TinyCLIP model files not found in {model_dir}. "
                "Run scripts/download_tinyclip40.sh or set HAUL_CLIP_MODEL_DIR."
            )

        self._session = InferenceSession(
            str(model_dir / "model_q4f16.onnx"),
            providers=["CPUExecutionProvider"],
        )
        self._tokenizer = Tokenizer.from_file(str(model_dir / "tokenizer.json"))

        # Cache preprocessor config.
        cfg_path = model_dir / "preprocessor_config.json"
        if cfg_path.exists():
            with cfg_path.open() as fh:
                self._preprocessor = json.load(fh)
        else:
            self._preprocessor = {
                "crop_size": {"height": 224, "width": 224},
                "size": {"shortest_edge": 224},
                "image_mean": [0.48145466, 0.4578275, 0.40821073],
                "image_std": [0.26862954, 0.26130258, 0.27577711],
            }

    def _preprocess_image(self, image: Any) -> np.ndarray:
        from PIL import Image as PILImage

        if not isinstance(image, PILImage.Image):
            image = PILImage.fromarray(image)
        size = self._preprocessor["crop_size"]
        image = image.convert("RGB").resize((size["width"], size["height"]))
        arr = np.array(image).astype(np.float32) / 255.0
        mean = np.array(self._preprocessor["image_mean"], dtype=np.float32)
        std = np.array(self._preprocessor["image_std"], dtype=np.float32)
        normalized = ((arr - mean) / std).transpose(2, 0, 1).astype(np.float32)
        return normalized[None, ...]

    def _tokenize(self, texts: List[str], max_length: int = 77) -> Tuple[np.ndarray, np.ndarray]:
        input_ids: List[List[int]] = []
        attention_masks: List[List[int]] = []
        for text in texts:
            encoded = self._tokenizer.encode(text)
            ids = encoded.ids[:max_length]
            mask = [1] * len(ids)
            pad = max_length - len(ids)
            ids.extend([0] * pad)
            mask.extend([0] * pad)
            input_ids.append(ids)
            attention_masks.append(mask)
        return (
            np.array(input_ids, dtype=np.int64),
            np.array(attention_masks, dtype=np.int64),
        )

    def classify(
        self,
        image: Any,
        candidates: List[str],
        prompt_template: str = "a photo of a {}",
    ) -> Optional[ClipLabel]:
        """
        Zero-shot classify an image crop against a list of candidate labels.
        Returns the highest-scoring label and its raw CLIP logit score.
        """
        if not candidates:
            return None

        self._load()
        prompts = [prompt_template.format(c) for c in candidates]
        input_ids, attention_mask = self._tokenize(prompts)
        pixel_values = self._preprocess_image(image)

        outputs = self._session.run(
            None,
            {
                "input_ids": input_ids,
                "pixel_values": pixel_values,
                "attention_mask": attention_mask,
            },
        )
        logits = outputs[0][0]
        best_idx = int(np.argmax(logits))
        return ClipLabel(key=candidates[best_idx], prompt=prompts[best_idx], score=float(logits[best_idx]))


def get_classifier() -> TinyClipClassifier:
    return TinyClipClassifier()
