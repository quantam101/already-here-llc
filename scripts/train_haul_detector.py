#!/usr/bin/env python3
"""
Fine-tune a hauling-specific YOLO detector from the labeled feedback database.

Usage:
    python scripts/train_haul_detector.py --epochs 25 --imgsz 640 --batch 8

Outputs:
    - best/based .pt weights under runs/detect/haul_detector/weights
    - exported ONNX model at models/yolov8n-haul.onnx
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from runtime.photo_ai_feedback import FeedbackStore


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--org", default="training")
    parser.add_argument("--out-dir", default="data/yolo_training")
    parser.add_argument("--model", default="yolov8n.pt")
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--imgsz", type=int, default=416)
    parser.add_argument("--batch", type=int, default=4)
    parser.add_argument("--name", default="haul_detector")
    parser.add_argument("--workers", type=int, default=0)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--export-onnx", action="store_true", default=True)
    parser.add_argument("--onnx-path", default="models/yolov8n-haul.onnx")
    args = parser.parse_args()

    try:
        from ultralytics import YOLO
    except Exception as exc:  # pragma: no cover
        print(f"ultralytics not installed: {exc}")
        return 1

    store = FeedbackStore()
    data_yaml = store.export_yolo(args.org, out_dir=args.out_dir) + "/data.yaml"
    print(f"Exported YOLO dataset: {data_yaml}")

    model = YOLO(args.model)
    model.train(
        data=data_yaml,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        workers=args.workers,
        device=args.device,
        name=args.name,
        exist_ok=True,
        patience=0,
        verbose=True,
        plots=False,
        close_mosaic=0,
    )

    weights_dir = Path("runs/detect") / args.name / "weights"
    best_pt = weights_dir / "best.pt"
    if best_pt.exists():
        print(f"Best weights: {best_pt}")
        if args.export_onnx:
            print(f"Exporting ONNX -> {args.onnx_path}")
            best_model = YOLO(str(best_pt))
            best_model.export(format="onnx", imgsz=args.imgsz, half=False, simplify=True)
            exported = weights_dir / "best.onnx"
            if exported.exists():
                Path(args.onnx_path).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(exported, args.onnx_path)
                print(f"Copied ONNX model to {args.onnx_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
