#!/usr/bin/env bash
# Download TinyCLIP ViT-40M/32 Text-19M ONNX artifacts for fine-grained hauling
# zero-shot classification. ~90 MB total.
set -euo pipefail

MODEL_DIR="${1:-models/tinyclip40}"
mkdir -p "$MODEL_DIR"

BASE="https://huggingface.co/onnx-community/TinyCLIP-ViT-40M-32-Text-19M-LAION400M-ONNX/resolve/main"

curl -L --fail -o "$MODEL_DIR/model_q4f16.onnx" "$BASE/onnx/model_q4f16.onnx"
curl -L --fail -o "$MODEL_DIR/tokenizer.json" "$BASE/tokenizer.json"
curl -L --fail -o "$MODEL_DIR/preprocessor_config.json" "$BASE/preprocessor_config.json"
curl -L --fail -o "$MODEL_DIR/config.json" "$BASE/config.json"

echo "TinyCLIP 40M artifacts downloaded to $MODEL_DIR"
