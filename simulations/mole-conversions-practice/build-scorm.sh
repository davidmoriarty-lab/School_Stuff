#!/bin/sh
# Builds the SCORM 1.2 package (a zip with imsmanifest.xml at its top level).
#   sh build-scorm.sh        ->  dist/mole-conversions-practice-scorm12.zip
cd "$(dirname "$0")" || exit 1
mkdir -p dist
out=dist/mole-conversions-practice-scorm12.zip
[ -f "$out" ] && unlink "$out"
zip -q -X "$out" imsmanifest.xml index.html css/base.css css/practice.css js/data.js js/chem.js js/steps.js js/problems.js js/diagrams.js js/ui.js js/scorm.js js/assignment.js && echo "built $out"
