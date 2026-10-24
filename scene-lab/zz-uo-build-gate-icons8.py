import pathlib

pairs = [
    ("Editor — tabs / Save / auto-detect", "zz-uo-before-s6-editor.png", "zz-uo-after-icons8-editor.png"),
    ("Footer menu — Preview (eye)", "zz-uo-before-s6-footermenu.png", "zz-uo-after-icons8-footermenu.png"),
    ("Colors tab — wheel", "zz-uo-before-s6-colors.png", "zz-uo-after-icons8-colors.png"),
    ("Task popup — Save", None, "zz-uo-after-icons8-taskpopup.png"),
    ("Exit bar — bolt", None, "zz-uo-after-icons8-exitbar.png"),
    ("Row menu — Rename pencil", "zz-uo-before-s6-rowmenu.png", "zz-uo-after-icons8-rowmenu.png"),
    ("Badge — palette", None, "zz-uo-after-icons8-badge.png"),
]

def img(name):
    if not name or not pathlib.Path("scene-lab/" + name).exists():
        return '<div class=miss>n/a</div>'
    return f'<img src="{name}">'

rows = []
for label, before, after in pairs:
    rows.append(f"""<tr><td class=lbl>{label}</td>
<td>{img(before)}<div class=cap>BEFORE (placeholders)</div></td>
<td>{img(after)}<div class=cap after>AFTER (icons8)</div></td></tr>""")

pathlib.Path("scene-lab/zz-uo-gate-icons8.html").write_text(f"""<!doctype html><meta charset=utf-8><title>Gate — icons8 asset drop</title>
<style>
body{{background:#0a1222;color:#e6edf7;font:14px system-ui;padding:24px}}
h1{{font-size:20px;margin-bottom:4px}} .sub{{opacity:.6;font-size:12px;margin-bottom:20px}}
table{{border-collapse:collapse;width:100%}}
td{{padding:10px 12px;border-bottom:1px solid #1e2a44;vertical-align:top}}
.lbl{{width:170px;font-size:12px;opacity:.8;padding-top:14px}}
img{{width:480px;border-radius:8px;border:1px solid #26334f;display:block}}
.miss{{width:480px;height:120px;background:#101a30;border-radius:8px;display:flex;align-items:center;justify-content:center;opacity:.4}}
.cap{{font-size:10px;opacity:.5;margin-top:4px;text-transform:uppercase;letter-spacing:.08em}}
.cap.after{{color:#7ee787;opacity:.9}}
</style>
<h1>icons8 asset drop — 12 slots wired</h1>
<div class=sub>Palette (badge + auto-detect x4) = icons8-color-48 traced · Background = icons8-picture.svg · Colors = icons8-color-50 traced · Preview = icons8-eye-24 traced · Save x2 = icons8-save-50 traced · Bolt = icons8-bolt-48 traced · Rename = icons8-edit-pencil.svg · gear/Overlay/Export/Import keep placeholders (no matching asset)</div>
<table>{''.join(rows)}</table>""")
print("wrote scene-lab/zz-uo-gate-icons8.html")
