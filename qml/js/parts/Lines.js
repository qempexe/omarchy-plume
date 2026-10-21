.pragma library

// The line around a cursor: 22 lines, drawn small enough for a cursor.
//
// A line is { key, label, about, reach?(w), traced?, draw(L) }. draw adds to L:
//   L.ring(from, to, paint)   a band around the edge, `from` and `to` outwards from it
//                             (below 0 is inside the shape)
//   L.over(svg)               anything else, drawn above the fill
// and can use:
//   L.paint, L.c   the line's paint (a color, or a gradient when lines fade) and its color
//   L.w            the width the settings ask for
//   L.paths(off)   the outline as polygons, `off` out from the edge (inside when below 0)
//   L.stroke(poly, paint, width, extra), L.walk(poly, step), L.displaced(poly, step, fn)
//   L.outside(svg), L.inside(svg): svg kept outside or inside the shape
//   L.light(c, t), L.dark(c, t), L.k.blur(sd), L.k.lin(...), L.wobble(seed)
// A `traced` line follows the outline as a path; parts drawn as plain strokes (the text
// beam, rings) get a plain line instead. `reach` is how far out it goes (default w).

function f(v) { return String(Math.round(v * 1000) / 1000); }
function circle(x, y, r, fill, extra) { return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + fill + '"' + (extra || "") + '/>'; }

function dashed(L, dash, cap) {
    for (const p of L.paths(L.w / 2)) L.over(L.outside(L.stroke(p, L.paint, L.w, ' stroke-dasharray="' + dash + '"' + (cap ? ' stroke-linecap="round"' : ' stroke-linecap="butt"'))));
}

var list = [
    { key: "none", label: "None", about: "No line.", reach: () => 0, draw: (L) => {} },
    { key: "solid", label: "Solid", about: "One clean line.", draw: (L) => L.ring(0, L.w, L.paint) },
    { key: "double", label: "Double", about: "A thinner line inside a gap.", reach: (w) => w + 0.6,
      draw: (L) => { L.ring(0, L.w * 0.55, L.paint); L.ring(L.w * 0.55 + 0.45, L.w + 0.6, L.paint); } },
    { key: "triple", label: "Triple", about: "Three fine lines.", reach: (w) => Math.max(0.3, w * 0.4) * 3 + 0.9,
      draw: (L) => { const t = Math.max(0.3, L.w * 0.4); for (let i = 0; i < 3; i++) L.ring(i * (t + 0.45), i * (t + 0.45) + t, L.paint); } },
    { key: "glow", label: "Glow ring", about: "A line that shines softly.", reach: (w) => w + 1,
      draw: (L) => {
          L.over('<g opacity=".9" filter="url(#' + L.k.blur(0.9) + ')">' + L.outside(L.band(0, L.w + 1.2, L.paint)) + '</g>');
          L.ring(0, L.w * 0.6, L.paint);
      } },
    { key: "neon", label: "Neon tube", about: "Glows, with a bright core.", reach: (w) => w + 1.2,
      draw: (L) => {
          L.over('<g filter="url(#' + L.k.blur(1.1) + ')">' + L.outside(L.band(0, L.w + 1.4, L.paint)) + '</g>');
          L.ring(0, L.w, L.paint);
          L.ring(L.w * 0.3, L.w * 0.72, L.light(L.c, 0.75));
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
