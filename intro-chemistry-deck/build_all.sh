#!/bin/bash
# Rebuilds everything: pictures -> slides -> animations -> script document.
# Needs: python3 (Pillow, numpy, lxml, python-docx) and node with `npm install` already run in this folder.
set -e
cd "$(dirname "$0")"
export NODE_PATH="$PWD/node_modules"
python3 build_images.py
node build_deck.js
python3 add_animations.py
python3 build_script_doc.py
