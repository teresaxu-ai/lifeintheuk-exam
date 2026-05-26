#!/usr/bin/env python3
"""Generate PNG app icons for the Life in the UK Test app.

Uses only Python built-ins (struct, zlib, math) — no external dependencies.
Renders a stylised Union Jack with 4x supersampling for clean diagonal edges.

Usage:
    python generate_icons.py
Outputs:
    apple-touch-icon.png   (180 × 180 – iOS home-screen icon)
    icons/icon-192.png     (192 × 192 – PWA manifest icon)
    icons/icon-512.png     (512 × 512 – PWA manifest icon)
"""

import math
import os
import struct
import zlib

# ── Colour palette ─────────────────────────────────────────────────────────
UNION_BLUE  = (1,   33,  105)   # Royal Blue  #012169
UNION_RED   = (200, 16,  46)    # Union Red   #C8102E
WHITE       = (255, 255, 255)

# ── Union Jack pixel function (accepts float coordinates for AA) ────────────

def union_jack_color(x: float, y: float, size: int) -> tuple[int, int, int, int]:
    """Return RGBA colour for position (x, y) inside a size×size icon."""
    half = size / 2.0
    cx   = x - half          # centred coords; right/down = positive
    cy   = y - half

    # Stripe half-widths expressed as a fraction of the icon half-size
    white_cross = half * 0.20    # St George white cross
    red_cross   = half * 0.125   # St George red cross (narrower)
    white_diag  = half * 0.17    # St Andrew/Patrick white diagonals
    red_diag    = half * 0.095   # St Patrick red diagonals

    # Distance from each diagonal axis
    d1 = abs(cy - cx) / math.sqrt(2)    # distance from ╲ diagonal
    d2 = abs(cy + cx) / math.sqrt(2)    # distance from ╱ diagonal

    # ── Layer back → front ─────────────────────────────────────────────────
    r, g, b = UNION_BLUE

    # St Andrew's white diagonals
    if d1 < white_diag or d2 < white_diag:
        r, g, b = WHITE

    # St Patrick's red diagonals (counterchanged: offset by half-stripe on
    # each side of the axis so the red sits in alternating quadrants)
    # Top-right & bottom-left quadrants: ╲ diagonal carries the red
    # Top-left  & bottom-right quadrants: ╱ diagonal carries the red
    if cx >= 0:
        if cy <= 0:                       # top-right quadrant
            if d1 < red_diag:
                r, g, b = UNION_RED
        else:                             # bottom-right quadrant
            if d2 < red_diag:
                r, g, b = UNION_RED
    else:
        if cy <= 0:                       # top-left quadrant
            if d2 < red_diag:
                r, g, b = UNION_RED
        else:                             # bottom-left quadrant
            if d1 < red_diag:
                r, g, b = UNION_RED

    # St George's white cross
    if abs(cx) < white_cross or abs(cy) < white_cross:
        r, g, b = WHITE

    # St George's red cross (narrower)
    if abs(cx) < red_cross or abs(cy) < red_cross:
        r, g, b = UNION_RED

    return r, g, b, 255


# ── PNG encoder ────────────────────────────────────────────────────────────

def _png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def render_png(size: int) -> bytes:
    """Render the icon at `size` × `size` with 4× supersampling."""
    SAMPLES = 4
    step    = 1.0 / SAMPLES
    start   = step / 2.0

    raw = bytearray()
    for py in range(size):
        raw += b"\x00"      # PNG filter byte: None
        for px in range(size):
            tr = tg = tb = ta = 0
            for sy in range(SAMPLES):
                for sx in range(SAMPLES):
                    fx = px + start + sx * step
                    fy = py + start + sy * step
                    r, g, b, a = union_jack_color(fx, fy, size)
                    tr += r; tg += g; tb += b; ta += a
            n = SAMPLES * SAMPLES
            raw += bytes([tr // n, tg // n, tb // n, ta // n])

    sig  = b"\x89PNG\r\n\x1a\n"
    ihdr = _png_chunk(b"IHDR",
                      struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    idat = _png_chunk(b"IDAT", zlib.compress(bytes(raw), 6))
    iend = _png_chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


# ── Main ───────────────────────────────────────────────────────────────────

def main() -> None:
    os.makedirs("icons", exist_ok=True)

    targets = [
        ("apple-touch-icon.png", 180),
        ("icons/icon-192.png",   192),
        ("icons/icon-512.png",   512),
    ]

    for path, size in targets:
        data = render_png(size)
        with open(path, "wb") as fh:
            fh.write(data)
        print(f"  ✓  {path}  ({size}×{size})")

    print("\nAll icons generated.")


if __name__ == "__main__":
    main()
