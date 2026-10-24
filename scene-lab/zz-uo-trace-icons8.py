# zz-uo-trace-icons8.py — trace the new icons8 PNGs to single-color SVG paths
# (throwaway, round-6 recipe). Run with /tmp/potr-venv/bin/python.
import potrace, sys
from PIL import Image

SRC = "_includes/svg/"

# (file, expected dark-on-transparent?) -> print inner <path> markup
files = [
    "icons8-color-palette-50.png",
    "icons8-color-48.png",
    "icons8-color-50.png",
    "icons8-save-50.png",
    "icons8-eye-24.png",
    "icons8-bolt-48.png",
]

for fn in files:
    im = Image.open(SRC + fn).convert("RGBA")
    w, h = im.size
    px = im.load()
    # Build a boolean mask: dark pixels (any alpha>10 with low luminance) OR
    # non-transparent black art. These icons are black-on-transparent.
    bmp = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 96 and (r + g + b) < 384:  # visible dark pixel -> foreground
                bmp[y][x] = False  # potracer: False = traced (black) region
            else:
                bmp[y][x] = True
    bmp = [row for row in bmp]
    bm = potrace.Bitmap(bmp)
    path = bm.trace(turdsize=2, alphamax=1.0, opticurve=True, opttolerance=0.2)
    parts = []
    for curve in path:
        st = curve.start_point
        d = f"M{st.x:.2f},{st.y:.2f}"
        for seg in curve:
            if seg.is_corner:
                d += f"L{seg.c.x:.2f},{seg.c.y:.2f}L{seg.end_point.x:.2f},{seg.end_point.y:.2f}"
            else:
                d += (
                    f"C{seg.c1.x:.2f},{seg.c1.y:.2f} {seg.c2.x:.2f},{seg.c2.y:.2f}"
                    f" {seg.end_point.x:.2f},{seg.end_point.y:.2f}"
                )
        d += "Z"
        parts.append(d)
    print(f"===== {fn}  ({w}x{h})  paths={len(parts)}")
    print('viewBox="0 0 %d %d"' % (w, h))
    print(" ".join(parts))
    print()
