#!/bin/bash
# Compila la web, genera los PDF y publica dist/ en la rama gh-pages (GitHub Pages).
#   bash scripts/deploy.sh
set -e
cd "$(dirname "$0")/.."
npx tsx scripts/validate.ts > /dev/null
npm run build
npx tsx scripts/pdf.ts
touch dist/.nojekyll
TMP="$(mktemp -d)"
cp -R dist/. "$TMP"
(
  cd "$TMP"
  git init -q -b gh-pages
  git add -A
  git commit -q -m "Publicar Churri-doku" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  git push -q -f "$(git -C "$OLDPWD" remote get-url origin)" gh-pages
)
rm -rf "$TMP"
echo "Publicado: https://vlebronpt-lang.github.io/churri-doku/"
