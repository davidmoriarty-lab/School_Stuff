#!/bin/sh
# Builds the SCORM 1.2 package (a zip with imsmanifest.xml at its top level).
#   sh build-scorm.sh        ->  dist/buffers-lab-scorm12.zip
cd "$(dirname "$0")" || exit 1
mkdir -p dist
out=dist/buffers-lab-scorm12.zip
[ -f "$out" ] && unlink "$out"
zip -q -X "$out" imsmanifest.xml index.html css/style.css js/scorm.js js/chem.js js/glass.js js/lab.js js/notebook.js && echo "built $out"
