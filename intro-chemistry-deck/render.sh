#!/bin/bash
# renders Intro_to_Chemistry.pptx to .render/sheetN.jpg (4 slides per image) for visual checking
S=/root/.claude/skills/synced/3502a2cc-8e63-45b7-b58f-57a9c498ef8e_bad45074-8b43-4c1a-8313-13d84e2fd9a5/pptx
cd "$(dirname "$0")" && mkdir -p .render && cd .render
rm -f s-*.jpg sheet*.jpg Intro_to_Chemistry.pdf
python3 $S/scripts/office/soffice.py --headless --convert-to pdf ../Intro_to_Chemistry.pptx >/dev/null 2>&1
pdftoppm -jpeg -r 72 Intro_to_Chemistry.pdf s
python3 - <<'PY'
from PIL import Image
import glob
fs=sorted(glob.glob("s-*.jpg"))
for k in range(0,len(fs),4):
    ims=[Image.open(f) for f in fs[k:k+4]]
    w,h=ims[0].size
    sheet=Image.new("RGB",(w*2+10,h*2+10),(255,255,255))
    for i,im in enumerate(ims):
        sheet.paste(im,((i%2)*(w+10),(i//2)*(h+10)))
    sheet.save(f"sheet{k//4+1}.jpg",quality=88)
PY
ls
