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
      } },
    { key: "dashed", label: "Dashed", about: "Dashes all the way round.", traced: true, draw: (L) => dashed(L, "1.8 1.1") },
    { key: "dotted", label: "Dotted", about: "Dots all the way round.", traced: true, draw: (L) => dashed(L, "0.01 " + f(L.w + 0.8), true) },
    { key: "dashdot", label: "Dash and dot", about: "A dash, then a dot.", traced: true, draw: (L) => dashed(L, "1.8 " + f(L.w * 0.5 + 0.7) + " 0.01 " + f(L.w * 0.5 + 0.7), true) },
    { key: "stitched", label: "Stitched", about: "Sewn like leather, just inside the edge.", traced: true,
      draw: (L) => {
          L.ring(0, Math.min(0.5, L.w * 0.5), L.paint);
          for (const p of L.paths(-0.95)) L.over(L.inside(L.stroke(p, L.light(L.c, 0.55), 0.3, ' stroke-dasharray="0.9 0.7"')));
      } },
    { key: "inset", label: "Inset line", about: "A line a little way inside.", traced: true, reach: () => 0,
      draw: (L) => { for (const p of L.paths(-0.75 - L.w * 0.35)) L.over(L.inside(L.stroke(p, L.paint, L.w * 0.7))); } },
    { key: "mat", label: "Mat", about: "A light band inside, like a picture behind glass.", reach: (w) => w * 0.5,
      draw: (L) => { L.ring(-1.3, 0, L.light(L.c, 0.75)); L.ring(0, L.w * 0.5, L.paint); } },
    { key: "rail", label: "Rail", about: "A heavy line on the lower right side only.", reach: (w) => w * 1.5,
      draw: (L) => {
          L.ring(0, Math.min(0.4, L.w * 0.35), L.paint);
          const id = L.k.id("m");
          L.k.def('<mask id="' + id + '" maskUnits="userSpaceOnUse" x="-4" y="-4" width="40" height="40"><path d="M' + f(L.cx + 30) + " " + f(L.cy - 30)
              + " L" + f(L.cx - 30) + " " + f(L.cy + 30) + " L" + f(L.cx + 30) + " " + f(L.cy + 30) + ' Z" fill="#fff"/></mask>');
          L.over('<g mask="url(#' + id + ')">' + L.outside(L.band(0, L.w * 1.5, L.paint)) + '</g>');
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
