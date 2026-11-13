#!/bin/sh
# Builds the SCORM 1.2 package (a zip with imsmanifest.xml at its top level).
#   sh build-scorm.sh        ->  dist/chirality-chairs-scorm12.zip
cd "$(dirname "$0")" || exit 1
mkdir -p dist
out=dist/chirality-chairs-scorm12.zip
[ -f "$out" ] && unlink "$out"
zip -q -X "$out" imsmanifest.xml index.html css/style.css js/cip.js js/molecules.js js/chair.js js/draw.js js/set.js js/scorm.js js/app.js && echo "built $out"
