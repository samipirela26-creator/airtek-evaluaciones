#!/usr/bin/env bash
# Levanta un servidor local en la raíz del repo y abre el menú de previsualización.
# Uso:  bash preview/servir.sh   →  luego abre http://localhost:5510/preview/index.html
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${1:-5510}"
echo "Previsualización en:  http://localhost:$PORT/preview/index.html"
echo "(Ctrl+C para detener)"
python3 -m http.server "$PORT"
