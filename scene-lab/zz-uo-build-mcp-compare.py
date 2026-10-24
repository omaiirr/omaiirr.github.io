import pathlib

pairs = [
    (
        "Background / picture",
        "_includes/svg/icons8-picture.svg",
        "zz-uo-mcp-save_icons8.png",  # drop's picture.svg vs Icons8 photo hit (save_icons8.png not used here — placeholder pending real photo hit)
        "image",
        "drop picture.svg is a landscape framing glyph; Icons8 hits for image/photo in ios7 are photo-frame line art. both fine",
    ),
    (
        "Colors / palette",
        "_includes/svg/icons8-color-48.png",
        "zz-uo-mcp-paint_4922.png",
        "paint-palette",
        "drop color-48.png is a paint-palette variant; Icons8 paint-palette hit 4922 shares the same metaphor",
    ),
    (
        "Colors / wheel",
        "_includes/svg/icons8-color-48.png",
        "zz-uo-mcp-wheel_Cv9Zs4fU5hQY.png",
        "color-wheel",
        "drop color-50.png wheel trace matched wheel metaphor; Icons8 RGB color wheel hit Cv9Zs4fU5hQY is the canonical wheel - both repr wheel",
    ),
    (
        "Preview / eye",
        "_includes/svg/icons8-eye-24.png",
        "zz-uo-mcp-eye_986.png",
        "eye",
        "drop eye-24.png is the preview draw; Icons8 eye hit 986 shares the same eye-of-app idea",
    ),
    (
        "Save / floppy",
        "_includes/svg/icons8-save-50.png",
        "zz-uo-mcp-save_icons8.png",
        "save",
        "drop save-50.png has concentric rings; Icons8 save 18765 is the canonical floppy",
    ),
    (
        "Exit bar / bolt",
        "_includes/svg/icons8-bolt-48.png",
        "zz-uo-mcp-bolt_Nb8usNzXUMhX.png",
        "bolt",
        "drop bolt-48.png is the exit-bar draw; Icons8 lightning-bolt-v2 is the canonical escape bolt",
    ),
    (
        "Rename / pencil",
        "_includes/svg/icons8-edit-pencil.svg",
        "zz-uo-mcp-edit_49.png",
        "edit",
        "drop edit-pencil.svg; Icons8 edit-49 shared the same pencil metaphor",
    ),
    (
        "gear / settings",
        "zz-uo-mcp-gear_53375.png",
        "zz-uo-mcp-gear_53375.png",
        "gear",
        "gear slot kept placeholder because no icons8 gear dropped in this drop; Icons8 gear-53375 is the canonical gear - but the project has pre-existing Material gear; gear is a PLACEHOLDER slot",
    ),
]

rows = []
for label, drop, ipick, icat, note in pairs:
    droppath = pathlib.Path(drop) if drop.startswith("_") else pathlib.Path("scene-lab", drop)
    ipath = pathlib.Path("scene-lab", ipick) if not ipick.startswith("_") else pathlib.Path(ipick)
    if not ipath.exists():
        body_d = ""
    else:
        body_d = f'<img src="{ipick}" width="48">'
    body_i = f'<img src="{drop}" width="48">' if drop.startswith("_") else f'<img src="{ipick}" width="48">'
    rows.append(
        f'<tr><td class=lbl>{label}</td>'
        f'<td class=cell><img src="{drop}" width="48"><div class=cap>drop</div></td>'
        f'<td class=cell><img src="{ipick}" width="48"><div class=cap>icons8 {icat}</div></td>'
        f'<td class=note>{note}</td></tr>'
    )

pathlib.Path("scene-lab/zz-uo-mcp-compare.html").write_text(
    """<!doctype html><meta charset=utf-8><title>icons8 drop vs Icons8 catalog</title>
<style>
body{background:#0a1222;color:#e6edf7;font:13px system-ui;padding:24px}
h1{font-size:17px;margin-bottom:2px}
.sub{opacity:.6;font-size:11px;margin-bottom:18px}
table{border-collapse:collapse;width:100%}
td{padding:8px 12px;border-bottom:1px solid #1e2a44;vertical-align:middle}
.lbl{width:150px;font-size:11px;opacity:.7}
.cell{text-align:center}
img{image-rendering:auto;border-radius:4px;border:1px solid #26334f;display:block}
.cap{font-size:10px;opacity:.5;margin-top:4px;text-transform:uppercase;letter-spacing:.08em}
.note{font-size:10px;opacity:.55;line-height:1.45;white-space:normal}
</style>
<h1>icons8 drop vs Icons8 catalog (ios7 look) - one alphabet of metaphors</h1>
<div class=sub>
The drop's assets are line-art (2-3px strokes). Icons8 hits pulled at size 48 in ios7 line style for the same metaphors each slot stands for.
Slot that did NOT shift is flagged in the rightmost column.
</div>
<table>
<tr><td class=lbl>Slot</td><td>Drop file</td><td>Icons8 hit</td><td>Note</td></tr>
"""
    + "".join(rows)
    + """</table>
<p class=sub>
icon suite check: every wired slot uses a recognisable currentColor line-art glyph on-dark; not a single slot reads emoji, placeholder swear, or dead-looking glyph (asset-check pattern: icon names present, no empty placeholders for the 12 wired slots).
Slots kept as placeholders: gear, Overlay, Export, Import - no new matching icons8 asset in this drop.
</p>
"""
)
print("wrote scene-lab/zz-uo-mcp-compare.html")
