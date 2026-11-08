#!/usr/bin/env bash
# Natomas Sport Association - Tailwind CSS Production Build Script
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

# Ensure standalone Tailwind CLI binary exists
if [ ! -f "./tailwindcss" ]; then
  echo "Downloading Tailwind standalone CLI for macOS x64..."
  curl -sL "https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.17/tailwindcss-macos-x64" -o ./tailwindcss
  chmod +x ./tailwindcss
fi

echo "Compiling minified Tailwind CSS for production..."
./tailwindcss -i assets/css/input.css -o assets/css/tailwind.min.css --minify

echo "✅ Successfully built assets/css/tailwind.min.css!"
