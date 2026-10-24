# zz-uo-wire-icons8.py — wire the Oct-8 icons8 drop into the placeholder
# slots that have a matching new asset (round-6b-approved shells preserved).
# Exact-literal replacements; aborts if any expected count mismatches.
import re, sys, pathlib

TRACE = pathlib.Path("/tmp/trace-out.txt")
if not TRACE.exists():
    sys.exit("missing /tmp/trace-out.txt - run zz-uo-trace-icons8.py first")

traces = {}
for m in re.finditer(r"===== (\S+)\s+\((\d+)x(\d+)\)\s+paths=\d+\nviewBox=\"([^\"]+)\"\n(.+?)\n\n",
                     TRACE.read_text(), re.S):
    fn, w, h, vb, d = m.groups()
    traces[fn] = (vb, d.strip())

def fill_art(fn):
    vb, d = traces[fn]
    return vb, f'<path d="{d}"/>'

def line_art(fn):
    txt = pathlib.Path("_includes/svg/" + fn).read_text()
    inner = re.sub(r"^.*?<svg[^>]*>", "", txt, flags=re.S)
    inner = re.sub(r"</svg>.*$", "", inner, flags=re.S)
    inner = inner.replace("stroke:#000000", "stroke:currentColor")
    inner = inner.replace('stroke="#000000"', 'stroke="currentColor"')
    inner = re.sub(r"\s+", " ", inner).strip()
    return re.search(r'viewBox="([^"]+)"', txt).group(1), inner

STY = ' style="margin-right:6px;vertical-align:-2px"'
def shell(vb, inner, fill, styled=True):
    style = STY if styled else ""
    if fill:
        return (f'<svg width="14" height="14" viewBox="{vb}" fill="currentColor"'
                f'{style} aria-hidden="true">{inner}</svg>')
    return (f'<svg width="14" height="14" viewBox="{vb}" fill="none" stroke="currentColor" '
            f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"{style} '
            f'aria-hidden="true">{inner}</svg>')

# ---- new-art shells ----------------------------------------------------------
pvb, pin = fill_art("icons8-color-48.png")      # palette (badge + auto-detect)
wvb, win = fill_art("icons8-color-50.png")       # color wheel (Colors tab)
svb, sin = fill_art("icons8-save-50.png")        # disk (both Saves)
evb, ein = fill_art("icons8-eye-24.png")         # eye (Preview)
bvb, bin = fill_art("icons8-bolt-48.png")        # bolt (exit bar)
lvb, lin = line_art("icons8-picture.svg")        # picture (Background tab)
kvb, kin = line_art("icons8-edit-pencil.svg")    # pencil (Rename)

palette_styled = shell(pvb, pin, fill=True)
palette_plain  = shell(pvb, pin, fill=True, styled=False)
wheel = shell(wvb, win, fill=True)
save  = shell(svb, sin, fill=True)
eye   = shell(evb, ein, fill=True)
bolt  = shell(bvb, bin, fill=True)
pic   = shell(lvb, lin, fill=False)
pencil = shell(kvb, kin, fill=False)

# ---- exact placeholder literals (round-6b line shells) ------------------------
HEAD = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
ARIA = ' aria-hidden="true">'
PALETTE_IN = ('<path d="M12 3a9 9 0 1 0 0 18h1.8a2.2 2.2 0 0 0 0-4.4H13a2 2 0 0 1 0-4h4.5'
              'A3.5 3.5 0 0 0 21 9.1C21 5.7 17 3 12 3z"/><circle cx="7.5" cy="10.5" r="1.2"/>'
              '<circle cx="12" cy="7.5" r="1.2"/><circle cx="16.5" cy="10.5" r="1.2"/>')
PIC_IN = '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="M21 15l-5-5L5 21"/>'
COLORS_IN = '<path d="M4 18a8 8 0 0 1 16 0"/><path d="M7.5 18a4.5 4.5 0 0 1 9 0"/><path d="M12 18v.01"/>'
EYE_IN = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>'
SAVE_IN = '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>'
BOLT_IN = '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>'
PENCIL_IN = '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>'

def ph(inner, styled=True):
    return HEAD + (STY if styled else "") + ARIA + inner + "</svg>"

# (file, old, new, expected count)
edits = [
    ("_includes/theme-modal.html", ph(PALETTE_IN, styled=False), palette_plain, 1),      # badge
    ("_includes/theme-editor-modal.html", ph(PIC_IN), pic, 1),                           # Background tab
    ("_includes/theme-editor-modal.html", ph(COLORS_IN), wheel, 1),                      # Colors tab
    ("_includes/theme-editor-modal.html", ph(EYE_IN), eye, 1),                           # Preview
    ("_includes/theme-editor-modal.html", ph(SAVE_IN), save, 1),                         # teSaveBtn
    ("_includes/theme-editor-modal.html", ph(PALETTE_IN), palette_styled, 1),            # auto-detect static
    ("_includes/task-popup.html", ph(SAVE_IN), save, 1),                                 # task Save
    ("_includes/animation-containers.html", ph(BOLT_IN), bolt, 1),                       # exit bar
    ("assets/js/theme-engine.js", ph(PALETTE_IN), palette_styled, 3),                    # auto-detect x3
    ("assets/js/theme-engine.js", ph(PENCIL_IN), pencil, 1),                             # Rename
]

totals = {}
for path, old, new, expect in edits:
    p = pathlib.Path(path)
    src = p.read_text()
    n = src.count(old)
    if n != expect:
        sys.exit(f"FATAL {path}: expected {expect} occurrence(s), found {n} of:\n{old[:120]}...")
    p.write_text(src.replace(old, new))
    totals[path] = totals.get(path, 0) + n

for k, v in totals.items():
    print(f"wired {v}: {k}")
print("OK - 12 sites")
