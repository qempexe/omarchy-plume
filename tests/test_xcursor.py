#!/usr/bin/python3
"""Checks tools/xcursor.py: a small Hyprcursor theme comes out as XCursor files with the
right sizes, hotspot, frames and links. Needs rsvg-convert.

    python3 tests/test_xcursor.py
"""
import importlib.util, os, struct, tempfile, unittest, zipfile

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
spec = importlib.util.spec_from_file_location("xcursor", os.path.join(ROOT, "tools", "xcursor.py"))
X = importlib.util.module_from_spec(spec)
spec.loader.exec_module(X)

SQUARE = (b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
          b'<rect x="0" y="0" width="16" height="32" fill="#ff0000" fill-opacity="0.5"/></svg>')


def hlc(path, meta, files):
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("meta.hl", meta)
        for name, data in files.items():
            z.writestr(name, data)


def images(path):
    with open(path, "rb") as fh:
        d = fh.read()
    magic, _, _, n = struct.unpack("<4sIII", d[:16])
    out = []
    for i in range(n):
        _, _, pos = struct.unpack("<III", d[16 + 12 * i:28 + 12 * i])
        h = struct.unpack("<9I", d[pos:pos + 36])
        out.append((h[2], h[4], h[5], h[6], h[7], h[8], d[pos + 36:pos + 40]))
    return magic, out


class XcursorTests(unittest.TestCase):
    def test_theme(self):
        with tempfile.TemporaryDirectory() as t:
            os.makedirs(os.path.join(t, "hyprcursors"))
            hlc(os.path.join(t, "hyprcursors", "left_ptr.hlc"),
                "hotspot_x = 0.25\nhotspot_y = 0.5\ndefine_override = default\ndefine_override = ../x\n"
                "define_size = 0, left_ptr.svg\n", {"left_ptr.svg": SQUARE})
            hlc(os.path.join(t, "hyprcursors", "wait.hlc"),
                "define_size = 0, a.svg, 40\ndefine_size = 0, b.svg, 40\n", {"a.svg": SQUARE, "b.svg": SQUARE})
            self.assertEqual(X.convert(t, 24), 2)

            magic, imgs = images(os.path.join(t, "cursors", "left_ptr"))
            self.assertEqual(magic, b"Xcur")
            self.assertEqual([(i[0], i[1], i[2], i[3], i[4]) for i in imgs], [(24, 24, 24, 6, 12), (48, 48, 48, 12, 24)])
            b, g, r, a = imgs[0][6]
            self.assertEqual((b, g), (0, 0))
            self.assertTrue(120 <= a <= 135 and abs(r - a) <= 1, "premultiplied: half red is (a, 0, 0) at half alpha")

            self.assertEqual(os.readlink(os.path.join(t, "cursors", "default")), "left_ptr")
            self.assertEqual(sorted(os.listdir(os.path.join(t, "cursors"))), ["default", "left_ptr", "wait"], "no odd names")
            _, frames = images(os.path.join(t, "cursors", "wait"))
            self.assertEqual([(f[0], f[5]) for f in frames], [(24, 40), (24, 40), (48, 40), (48, 40)])

    def test_png_filters(self):
        """rsvg-convert picks a filter per row; a gradient takes several."""
        svg = (b'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><defs><linearGradient id="g">'
               b'<stop offset="0" stop-color="#102030"/><stop offset="1" stop-color="#f0e0d0" stop-opacity="0.3"/>'
               b'</linearGradient></defs><circle cx="20" cy="20" r="18" fill="url(#g)"/></svg>')
        w, h, px = X.draw(svg, 40)
        self.assertEqual((w, h, len(px)), (40, 40, 6400))
        self.assertEqual(px[0:4], b"\0\0\0\0", "the corner is outside the circle")
        self.assertGreater(px[(20 * 40 + 3) * 4 + 3], 200, "the left of the circle is solid")


if __name__ == "__main__":
    unittest.main(verbosity=2)
