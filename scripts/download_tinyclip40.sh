#!/usr/bin/env bash
# Download TinyCLIP ViT-40M/32 Text-19M ONNX artifacts for fine-grained hauling
# zero-shot classification. ~90 MB total.
set -euo pipefail

MODEL_DIR="${1:-models/tinyclip40}"
mkdir -p "$MODEL_DIR"

BASE="https://huggingface.co/onnx-community/TinyCLIP-ViT-40M-32-Text-19M-LAION400M-ONNX/resolve/main"

declare -A CHECKSUMS=(
  ["model_q4f16.onnx"]=1429bf85b449a8353ac716e07b693513597525b54e3b8f0abe5ab1d243b8d4ee
  ["tokenizer.json"]=6d9109cc838977f3ca94a379eec36aecc7c807e1785cd729660ca2fc0171fb35
  ["preprocessor_config.json"]=5df7e578c37e907a431daf47fd592fc49fa50d23ed4c41285a0a34a58a9d2e06
  ["config.json"]=3dbcf9357680164a897fa5ac6ec1dd99688bb242be5171b38319380350d802c9
)

for filename in "${!CHECKSUMS[@]}"; do
  url="$BASE/${filename}"
  [[ "$filename" == "model_q4f16.onnx" ]] && url="$BASE/onnx/model_q4f16.onnx"
  dest="$MODEL_DIR/$filename"
  curl -L --fail -o "$dest" "$url"
  echo "${CHECKSUMS[$filename]}  $dest" | sha256sum -c -
done

echo "TinyCLIP 40M artifacts downloaded and verified to $MODEL_DIR"
