.pragma library

// What a cursor is filled with: 30 surfaces, drawn small enough for a cursor.
//
// A surface is { key, label, about, open?, noShadow?, paint(S) } and paint returns the
// SVG for one shape of the cursor. S gives:
//   S.fill()          the shape in its fill (a color, a gradient or glass)
//   S.clip(svg)       svg kept inside the shape
//   S.rect(paint, a)  a rectangle over the whole cursor, for S.clip
//   S.under(svg)      something drawn under the shape (a side, a glow)
//   S.c1, S.c2, S.acc the first, second and accent colors as #rrggbb; S.ink reads on c1
//   S.light(c, t), S.dark(c, t), S.mix(a, b, t)
//   S.box [x0, y0, x1, y1], S.cx, S.cy, S.w, S.h; S.tip and S.tail, two ends of the shape
//   S.k.lin(x1, y1, x2, y2, stops), S.k.rad(cx, cy, r, stops), S.k.pat(w, h, svg, deg),
//   S.k.blur(sd): ids to use as url(#id); stops are [[offset, color, opacity?], ...]
//   S.rnd()           a random number, the same every time for the same cursor
// `open` marks a surface you can see through, so lines are cut out around it.

function f(v) { return String(Math.round(v * 1000) / 1000); }
function circle(x, y, r, fill, extra) { return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + fill + '"' + (extra || "") + '/>'; }
function poly(pts, fill, extra) { return '<path d="M' + pts.map((p) => f(p[0]) + " " + f(p[1])).join(" L") + ' Z" fill="' + fill + '"' + (extra || "") + '/>'; }
function line(pts, stroke, w, extra) {
    return '<path d="M' + pts.map((p) => f(p[0]) + " " + f(p[1])).join(" L") + '" fill="none" stroke="' + stroke + '" stroke-width="' + f(w)
        + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || "") + '/>';
}
function gloss(S, a) {
    const g = S.k.lin(0, S.box[1], 0, S.cy, [[0, "#fff", a], [1, "#fff", 0]]);
    return S.clip(S.rect("url(#" + g + ")"));
}

var list = [
    { key: "filled", label: "Solid", about: "Filled in, nothing more.",
      paint: (S) => S.fill() },
    { key: "faint", label: "Faint", about: "A light wash you can see through.", open: true,
      paint: (S) => '<g opacity=".38">' + S.fill() + '</g>' },
    { key: "twotone", label: "Two-tone", about: "Two halves side by side, in the first and the second color.",
      paint: (S) => S.fill() + S.clip('<rect x="' + f(S.cx) + '" y="-4" width="40" height="40" fill="' + S.c2 + '"/>') },
    { key: "split", label: "Split", about: "The tail cut off in the second color.",
      paint: (S) => {
          const ax = S.tail[0] - S.tip[0], ay = S.tail[1] - S.tip[1];
          const mx = S.tip[0] + ax * 0.62, my = S.tip[1] + ay * 0.62, px = -ay, py = ax;
          return S.fill() + S.clip(poly([[mx + px * 9, my + py * 9], [mx - px * 9, my - py * 9],
                                         [mx - px * 9 + ax * 9, my - py * 9 + ay * 9], [mx + px * 9 + ax * 9, my + py * 9 + ay * 9]], S.c2));
      } },
    { key: "frost", label: "Frost", about: "Milky and speckled.",
      paint: (S) => {
          let dots = "";
          for (let i = 0; i < 40; i++) dots += circle(S.box[0] + S.rnd() * S.w, S.box[1] + S.rnd() * S.h, 0.12 + S.rnd() * 0.22, "#fff", ' opacity="' + f(0.25 + S.rnd() * 0.4) + '"');
          return '<g opacity=".8">' + S.fill() + '</g>' + S.clip(S.rect("#fff", ' opacity=".18"') + dots) + gloss(S, 0.3);
      } },
    { key: "bevel", label: "Bevel", about: "Pressed out, lit from the top left.",
      paint: (S) => {
          const g = S.k.lin(S.box[0], S.box[1], S.box[2], S.box[3], [[0, "#fff", 0.5], [0.45, "#fff", 0], [0.55, "#000", 0], [1, "#000", 0.38]]);
          return S.fill() + S.clip(S.rect("url(#" + g + ")"));
      } },
    { key: "keycap", label: "Keycap", about: "Stands on a darker side, like a key.",
      paint: (S) => {
          S.under('<g transform="translate(0 1.1)">' + S.sil(S.dark(S.c1, 0.4), 0) + '</g>');
          return S.fill() + gloss(S, 0.28);
      } },
    { key: "metal", label: "Metal", about: "Brushed metal in your color.",
      paint: (S) => {
          const g = S.k.lin(0, S.box[1], 0, S.box[3], [[0, S.light(S.c1, 0.55)], [0.35, S.c1], [0.55, S.dark(S.c1, 0.3)], [0.75, S.light(S.c1, 0.3)], [1, S.dark(S.c1, 0.25)]]);
          const p = S.k.pat(4, 0.7, '<rect width="4" height="0.25" fill="#fff" opacity=".18"/>', 0);
          return S.sil("url(#" + g + ")", 0) + S.clip(S.rect("url(#" + p + ")"));
      } },
    { key: "carbon", label: "Carbon", about: "Woven carbon fibre.",
      paint: (S) => {
          const a = S.dark(S.c1, 0.6), b = S.dark(S.c1, 0.35);
          const p = S.k.pat(2, 2, '<rect width="1" height="1" fill="' + b + '"/><rect x="1" y="1" width="1" height="1" fill="' + b + '"/>'
              + '<rect width="1" height=".45" fill="#fff" opacity=".12"/><rect x="1" y="1" width=".45" height="1" fill="#fff" opacity=".12"/>', 45);
          return S.sil(a, 0) + S.clip(S.rect("url(#" + p + ")")) + gloss(S, 0.18);
      } },
    { key: "crt", label: "Old screen", about: "Scanlines on a glowing screen.",
      paint: (S) => {
          const p = S.k.pat(1, 1.1, '<rect width="1" height=".45" fill="#000" opacity=".38"/>', 0);
          const v = S.k.rad(S.cx, S.cy, Math.max(S.w, S.h) * 0.7, [[0.5, "#000", 0], [1, "#000", 0.4]]);
          return S.fill() + S.clip(S.rect("url(#" + p + ")") + S.rect("url(#" + v + ")"));
      } }
];

var byKey = {};
var keys = [];
var labels = {};
var abouts = {};
for (var i = 0; i < list.length; i++) {
    byKey[list[i].key] = list[i];
    keys.push(list[i].key);
    labels[list[i].key] = list[i].label;
    abouts[list[i].key] = list[i].about;
}
