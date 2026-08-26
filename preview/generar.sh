#!/usr/bin/env bash
# Genera las páginas de PREVISUALIZACIÓN a partir de las reales.
# Reescribe rutas a absolutas y redirige firebase.js/session.js/CDN a los mocks.
# Vuelve a correrlo cada vez que cambies el HTML de alguna página real.
set -euo pipefail
cd "$(dirname "$0")/.."   # raíz del repo
OUT=preview

IMPORTMAP='  <script type="importmap">
  { "imports": {
    "/js/firebase.js": "/preview/mock-firebase.js",
    "/js/session.js": "/preview/mock-session.js",
    "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js": "/preview/mock-firestore.js",
    "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js": "/preview/mock-auth.js"
  }}
  </script>'

for f in *.html; do
  [ "$f" = "index.html" ] && continue   # el index de preview es el menú (hecho a mano)
  awk -v im="$IMPORTMAP" '{ print } /<head>/ { print im }' "$f" \
    | sed -E \
        -e 's#href="css/#href="/css/#g' \
        -e 's#src="js/#src="/js/#g' \
        -e 's#href="([a-zA-Z0-9_-]+\.html)"#href="/preview/\1"#g' \
    > "$OUT/$f"
done
echo "Generadas $(ls "$OUT"/*.html | grep -vc "$OUT/index.html") páginas en $OUT/"
