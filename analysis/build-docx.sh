#!/usr/bin/env bash
# Compile analysis Markdown files to DOCX via pandoc + mermaid-filter
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# mermaid-filter needs Chromium; use system Chrome on macOS if bundled Chromium missing
if [[ -z "${PUPPETEER_EXECUTABLE_PATH:-}" && -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]]; then
  export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
fi
export PUPPETEER_CACHE_DIR="${PUPPETEER_CACHE_DIR:-$HOME/.cache/puppeteer}"

mkdir -p docx docx/results

compile() {
  local src="$1"
  local dest="$2"
  echo "converting $src -> $dest"
  pandoc "$src" --filter mermaid-filter -o "$dest"
}

# Main report chapters (01-11) + README
for file in README.md [0-9][0-9]-*.md; do
  [[ -f "$file" ]] || continue
  compile "$file" "docx/${file%.md}.docx"
done

# Live test results
for file in results/*.md; do
  [[ -f "$file" ]] || continue
  base=$(basename "$file" .md)
  compile "$file" "docx/results/${base}.docx"
done

# Static code review evidence (optional appendix)
if [[ -f evidence/STATIC-CODE-REVIEW-EVIDENCE.md ]]; then
  compile "evidence/STATIC-CODE-REVIEW-EVIDENCE.md" "docx/evidence-STATIC-CODE-REVIEW.docx"
fi

echo ""
echo "Done. Output:"
ls -la docx/*.docx 2>/dev/null || true
ls -la docx/results/*.docx 2>/dev/null || true
