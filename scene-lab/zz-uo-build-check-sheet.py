# build-icons8-check-sheet.py — contact sheet: original (base64) vs traced, at 14/48px.
import base64, re, pathlib

SRC = pathlib.Path("_includes/svg/")
OUT = pathlib.Path("scene-lab/zz-uo-icons8-check.html")

trace = pathlib.Path("/tmp/trace-out.txt").read_text()
blocks = {}
for m in re.finditer(r"===== (\S+)\s+\((\d+)x(\d+)\)\s+paths=\d+\nviewBox=\"([^\"]+)\"\n(.+?)\n\n", trace, re.S):
    fn, w, h, vb, d = m.groups()
    blocks[fn] = (vb, d.strip())

pngs = ["icons8-color-palette-50.png", "icons8-color-48.png", "icons8-color-50.png",
        "icons8-save-50.png", "icons8-eye-24.png", "icons8-bolt-48.png"]
svgs = ["icons8-picture.svg", "icons8-edit-pencil.svg", "icons8-edit.svg",
        "icons8-edit (1).svg", "icons8-.svg"]

rows = []
for fn in pngs:
    vb, d = blocks[fn]
    b64 = base64.b64encode((SRC / fn).read_bytes()).decode()
    traced = (f'<svg width="48" height="48" viewBox="{vb}" fill="currentColor" aria-hidden="true"><path d="{d}"/></svg>'
              f'<svg width="14" height="14" viewBox="{vb}" fill="currentColor" aria-hidden="true"><path d="{d}"/></svg>')
    rows.append(f"""<tr><td class=lbl>{fn}<br><span class=dim>traced</span></td>
<td><img src="data:image/png;base64,{b64}" width=48 height=48></td><td class=tr>{traced}</td></tr>""")
for fn in svgs:
    txt = (SRC / fn).read_text()
    inner = re.sub(r"^.*?<svg[^>]*>", "", txt, flags=re.S)
    inner = re.sub(r"</svg>.*$", "", inner, flags=re.S)
    vb = re.search(r'viewBox="([^"]+)"', txt).group(1)
    shell = ('<svg width="48" height="48" viewBox="%s" fill="none" stroke="currentColor" '
             'stroke-linecap="round" stroke-linejoin="round">%s</svg>'
             '<svg width="14" height="14" viewBox="%s" fill="none" stroke="currentColor" '
             'stroke-linecap="round" stroke-linejoin="round">%s</svg>') % (vb, inner, vb, inner)
    b64 = base64.b64encode((SRC / fn).read_bytes()).decode()
    rows.append(f"""<tr><td class=lbl>{fn}<br><span class=dim>svg as-is</span></td>
<td><img src="data:image/svg+xml;base64,{b64}" width=48 height=48></td><td class=tr>{shell}</td></tr>""")

OUT.write_text(f"""<!doctype html><meta charset=utf-8><title>icons8 check</title>
<style>body{{background:#0a1222;color:#e6edf7;font:13px system-ui;padding:20px}}
table{{border-collapse:collapse}}td{{padding:8px 16px;border-bottom:1px solid #1e2a44;vertical-align:middle}}
.lbl{{font-size:11px;opacity:.75}} .dim{{opacity:.5}} .tr{{display:flex;gap:24px;align-items:center;
background:#131f38;padding:8px 12px;border-radius:8px}} img{{image-rendering:pixelated}}
h2{{margin:24px 0 8px}}</style>
<h2>icons8 drop — original (left) vs wired form at 48px &amp; 14px (right)</h2>
<table>{''.join(rows)}</table>""")
print("wrote", OUT)
