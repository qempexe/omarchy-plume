#!/usr/bin/python3
"""Adds an XCursor copy to a cursor Plume made, for programs that only know XCursor
(GTK 3 ones such as WebKitGTK apps, and X11 ones in XWayland).

    python3 -I tools/xcursor.py ~/.local/share/icons/plume-a 24

Reads every hyprcursors/<name>.hlc in the folder, draws its SVG pictures with
rsvg-convert (part of librsvg, which Hyprcursor itself needs) at the size and at twice
the size, and writes cursors/<name> with a link for every other name it goes by. Each
file is written beside and moved into place, so a program never reads half of one.
Only the standard library; prints how many cursors it wrote.
"""
import os, struct, subprocess, sys, tempfile, zipfile, zlib

NAME_RE = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.")
IMAGE = 0xFFFD0002


def plain(name):
    return bool(name) and set(name) <= NAME_RE and name not in (".", "..")


def png_rgba(data):
    """Pixels of an 8-bit RGBA PNG, the kind rsvg-convert writes: (w, h, bytes)."""
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG")
    pos, idat, w, h = 8, b"", 0, 0
    while pos < len(data):
        n, kind = struct.unpack(">I4s", data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + n]
        if kind == b"IHDR":
            w, h, depth, color, _, _, interlace = struct.unpack(">IIBBBBB", body)
            if (depth, color, interlace) != (8, 6, 0):
                raise ValueError("not an 8-bit RGBA PNG")
        elif kind == b"IDAT":
            idat += body
        pos += 12 + n
    raw, stride, out, prev = zlib.decompress(idat), w * 4, bytearray(), bytearray(w * 4)
    for y in range(h):
        row = y * (stride + 1)
        f, line = raw[row], bytearray(raw[row + 1:row + 1 + stride])
        for i in range(stride):
            a = line[i - 4] if i >= 4 else 0
            b = prev[i]
            c = prev[i - 4] if i >= 4 else 0
            if f == 1: line[i] = (line[i] + a) & 255
            elif f == 2: line[i] = (line[i] + b) & 255
            elif f == 3: line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        out += line
        prev = line
    return w, h, bytes(out)


def argb(rgba):
    """RGBA to XCursor's pixels: premultiplied, B G R A in memory."""
    out = bytearray(len(rgba))
    for i in range(0, len(rgba), 4):
        r, g, b, a = rgba[i:i + 4]
        out[i:i + 4] = bytes((b * a // 255, g * a // 255, r * a // 255, a))
    return bytes(out)


def xcursor(images):
    """[(size, w, h, xhot, yhot, delay, pixels)] to the bytes of one XCursor file."""
    pos = 16 + 12 * len(images)
    head, toc, body = struct.pack("<4sIII", b"Xcur", 16, 0x10000, len(images)), b"", b""
    for size, w, h, xh, yh, delay, px in images:
        toc += struct.pack("<III", IMAGE, size, pos)
        chunk = struct.pack("<9I", 36, IMAGE, size, 1, w, h, xh, yh, delay) + px
        body += chunk
        pos += len(chunk)
    return head + toc + body


def draw(svg, px):
    r = subprocess.run(["rsvg-convert", "-w", str(px), "-h", str(px), "-f", "png"],
                       input=svg, capture_output=True, timeout=20, check=True)
    return png_rgba(r.stdout)


def read_shape(path):
    """One .hlc: its hotspot (as a share of the picture), its frames and its other names."""
    hot, frames, names = [0.0, 0.0], [], []
    with zipfile.ZipFile(path) as z:
        for line in z.read("meta.hl").decode("utf-8").splitlines():
            k, _, v = (s.strip() for s in line.partition("="))
            if k == "hotspot_x": hot[0] = float(v)
            elif k == "hotspot_y": hot[1] = float(v)
            elif k == "define_override": names.append(v)
            elif k == "define_size":
                parts = [p.strip() for p in v.split(",")]
                frames.append((z.read(parts[1]), int(parts[2]) if len(parts) > 2 else 0))
    return hot, frames, names


def write(path, data):
    tmp = tempfile.NamedTemporaryFile(dir=os.path.dirname(path), prefix=".new.", delete=False)
    with tmp:
        tmp.write(data)
    os.chmod(tmp.name, 0o644)
    os.replace(tmp.name, path)


def link(dir_, name, target):
    tmp = os.path.join(dir_, ".new." + name)
    if os.path.lexists(tmp):
        os.remove(tmp)
    os.symlink(target, tmp)
    os.replace(tmp, os.path.join(dir_, name))


def convert(theme, size):
    src, out = os.path.join(theme, "hyprcursors"), os.path.join(theme, "cursors")
    os.makedirs(out, exist_ok=True)
    made = 0
    for f in sorted(os.listdir(src)):
        name = f[:-4]
        if not f.endswith(".hlc") or not plain(name):
            continue
        hot, frames, names = read_shape(os.path.join(src, f))
        images = []
        for px in (size, size * 2):
            for svg, delay in frames:
                w, h, rgba = draw(svg, px)
                images.append((px, w, h, min(w - 1, round(hot[0] * w)), min(h - 1, round(hot[1] * h)), delay, argb(rgba)))
        if not images:
            continue
        write(os.path.join(out, name), xcursor(images))
        for other in names:
            if plain(other) and other != name:
                link(out, other, name)
        made += 1
    return made


def main(argv):
    if len(argv) != 3 or not argv[2].isdigit() or not 8 <= int(argv[2]) <= 256:
        sys.exit(__doc__)
    theme = os.path.realpath(argv[1])
    if not os.path.isdir(os.path.join(theme, "hyprcursors")):
        sys.exit("no hyprcursors/ in " + theme)
    print(convert(theme, int(argv[2])))


if __name__ == "__main__":
    main(sys.argv)
