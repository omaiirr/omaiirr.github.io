import pathlib

items = [
    ("tabs", "Sidebar: Background (picture) + Colors (wheel) + Overlay placeholder"),
    ("autodetect", "Auto-detect from Background (palette)"),
    ("save", "Editor Save (floppy)"),
    ("footermenu", "Footer menu: Preview (eye) + Export/Import placeholders"),
    ("tasksave", "Task popup Save (floppy)"),
    ("exitbar", "Fullscreen exit bar (bolt)"),
    ("rowmenu", "Row menu: Rename (pencil) + Edit/Delete glyphs"),
    ("badge", "Custom theme active badge (palette)"),
]

cards = []
for name, label in items:
    p = pathlib.Path(f"scene-lab/zz-uo-zoom-{name}.png")
    cards.append(f"""<div class=card><img src="zz-uo-zoom-{name}.png">
<div class=lbl>{label}</div></div>""" if p.exists() else f'<div class=card><div class=miss>{name} missing</div><div class=lbl>{label}</div></div>')

pathlib.Path("scene-lab/zz-uo-zoom-icons8.html").write_text(f"""<!doctype html><meta charset=utf-8><title>icons8 zoom review</title>
<style>
body{{background:#0a1222;color:#e6edf7;font:14px system-ui;padding:24px}}
h1{{font-size:18px;margin-bottom:16px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:20px}}
.card{{background:#131f38;border:1px solid #26334f;border-radius:10px;padding:14px}}
img{{max-width:100%;border-radius:6px;image-rendering:auto;display:block}}
.miss{{height:100px;display:flex;align-items:center;justify-content:center;opacity:.4}}
.lbl{{font-size:11px;opacity:.7;margin-top:10px}}
</style>
<h1>icons8 wiring — 4x close-ups (14px icons rendered at deviceScaleFactor 4)</h1>
<div class=grid>{''.join(cards)}</div>""")
print("wrote scene-lab/zz-uo-zoom-icons8.html")
