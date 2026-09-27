"""Render every source document to an image and link it from its Markdown file.

Usage (run inside the knowledge-base folder):
    pip install pypdfium2 pillow
    python scripts/add_images.py "<path to Case 1_ Manufacturing Knowledge Hub>"

For each documents/<TAG>/<DOC_ID>.md it reads `source_file` from the front matter,
renders page 1 of the PDF (or converts the P&ID PNG) to images/<DOC_ID>.png,
adds `image: "images/<DOC_ID>.png"` to the front matter and an "## Image" section
at the end of the body. Safe to run again: existing links are not duplicated.
"""
import glob, json, os, re, sys
from PIL import Image
import pypdfium2 as pdfium

SRC = sys.argv[1]
KB = sys.argv[2] if len(sys.argv) > 2 else "."
WIDTH = 1400  # px; big enough to read a drawing, small enough to ship

os.makedirs(os.path.join(KB, "images"), exist_ok=True)
done = 0
for md in sorted(glob.glob(os.path.join(KB, "documents", "*", "*.md"))):
    text = open(md, encoding="utf-8").read()
    doc_id = json.loads(re.search(r'^doc_id: (.*)$', text, re.M).group(1))
    src = json.loads(re.search(r'^source_file: (.*)$', text, re.M).group(1))
    rel = f"images/{doc_id}.png"
    out = os.path.join(KB, rel)
    path = os.path.join(SRC, src)
    if src.lower().endswith(".pdf"):
        img = pdfium.PdfDocument(path)[0].render(scale=WIDTH / 595).to_pil()
    else:
        img = Image.open(path)
    img = img.convert("RGB")
    if img.width > WIDTH:
        img = img.resize((WIDTH, round(img.height * WIDTH / img.width)), Image.LANCZOS)
    # 256-colour palette: drawings and OPL sheets are flat colours, so this looks the same at a third of the size
    img = img.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    img.save(out, "PNG", optimize=True)
    text2 = re.sub(r"images/" + re.escape(doc_id) + r"\.jpg", rel, text)
    if text2 != text:
        text = text2
        open(md, "w", encoding="utf-8").write(text)
        old = os.path.join(KB, "images", doc_id + ".jpg")
        if os.path.exists(old):
            os.remove(old)
    if "\nimage:" not in text:
        text = text.replace("\nkb_generated:", f'\nimage: "{rel}"\nkb_generated:', 1)
        # image goes at the end so it does not swallow the text under the title
        text = text.rstrip("\n") + f"\n\n## Image\n\n![{doc_id}](../../{rel})\n"
        open(md, "w", encoding="utf-8").write(text)
    done += 1
print(f"{done} images -> {os.path.join(KB, 'images')}")
