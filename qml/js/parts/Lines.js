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
      } },
    { key: "wavy", label: "Wavy", about: "Waves all the way round.", traced: true, reach: (w) => w + 0.5,
      draw: (L) => { for (const p of L.paths(L.w / 2 + 0.2)) L.over(L.outside(L.stroke(L.displaced(p, 0.25, (s) => 0.42 * Math.sin(s * 2.6)), L.paint, L.w * 0.75))); } },
    { key: "sawtooth", label: "Sawtooth", about: "Zigzags all the way round.", traced: true, reach: (w) => w + 0.5,
      draw: (L) => {
          for (const p of L.paths(L.w / 2 + 0.2))
              L.over(L.outside(L.stroke(L.displaced(p, 0.2, (s) => 0.5 * (2 * Math.abs((s / 1.5) % 1 - 0.5) * 2 - 1)), L.paint, L.w * 0.7)));
      } },
    { key: "rope", label: "Rope", about: "Twists like rope.", traced: true, reach: (w) => w + 0.3,
      draw: (L) => {
          L.ring(0, L.w + 0.3, L.dark(L.c, 0.3));
          for (const p of L.paths((L.w + 0.3) / 2)) {
              let twists = "";
              for (const q of L.walk(p, 0.8)) {
                  const a = Math.atan2(q.ty, q.tx) + 0.9, h = (L.w + 0.3) * 0.62;
                  twists += '<path d="M' + f(q.x - Math.cos(a) * h) + " " + f(q.y - Math.sin(a) * h) + " L" + f(q.x + Math.cos(a) * h) + " " + f(q.y + Math.sin(a) * h)
                      + '" stroke="' + L.light(L.c, 0.4) + '" stroke-width=".28" stroke-linecap="round"/>';
              }
              L.over(L.outside(twists));
          }
      } },
    { key: "chain", label: "Chain", about: "Links all the way round, one flat and one on its side.", traced: true, reach: (w) => w + 0.4,
      draw: (L) => {
          for (const p of L.paths(L.w / 2 + 0.2)) {
              let links = "", n = 0;
              for (const q of L.walk(p, 1.15)) {
                  const a = Math.atan2(q.ty, q.tx) * 180 / Math.PI, flat = n++ % 2 === 0;
                  links += '<ellipse cx="' + f(q.x) + '" cy="' + f(q.y) + '" rx="' + f(flat ? 0.75 : 0.5) + '" ry="' + f(flat ? 0.38 : 0.12)
                      + '" transform="rotate(' + f(a) + " " + f(q.x) + " " + f(q.y) + ')" fill="none" stroke="' + L.c + '" stroke-width=".26"/>';
              }
              L.over(L.outside(links));
          }
      } },
    { key: "beads", label: "Beads", about: "Beads strung round the edge.", traced: true, reach: (w) => w + 0.3,
      draw: (L) => {
          const r = Math.max(0.35, L.w * 0.5 + 0.1);
          for (const p of L.paths(r)) {
              let beads = "";
              for (const q of L.walk(p, r * 2.2))
                  beads += circle(q.x, q.y, r, L.c) + circle(q.x - r * 0.3, q.y - r * 0.3, r * 0.35, "#fff", ' opacity=".55"');
              L.over(L.outside(beads));
          }
      } },
    { key: "ladder", label: "Ladder", about: "Rungs between two lines.", traced: true, reach: (w) => w + 0.8,
      draw: (L) => {
          const W = L.w + 0.8;
          L.ring(0, 0.28, L.paint);
          L.ring(W - 0.28, W, L.paint);
          for (const p of L.paths(W / 2)) {
              let rungs = "";
              for (const q of L.walk(p, 0.85))
                  rungs += '<path d="M' + f(q.x - q.nx * W / 2) + " " + f(q.y - q.ny * W / 2) + " L" + f(q.x + q.nx * W / 2) + " " + f(q.y + q.ny * W / 2)
                      + '" stroke="' + L.c + '" stroke-width=".22"/>';
              L.over(L.outside(rungs));
          }
      } },
    { key: "sketch", label: "Sketched", about: "Drawn by hand, twice over.", traced: true, reach: (w) => w + 0.4,
      draw: (L) => {
          for (const p of L.paths(L.w / 2)) {
              const a = L.wobble(1.3), b = L.wobble(4.7);
              L.over(L.outside(L.stroke(L.displaced(p, 0.3, (s) => a(s) * 0.35), L.paint, L.w * 0.55, ' opacity=".9"')
                  + L.stroke(L.displaced(p, 0.3, (s) => b(s) * 0.4 + 0.15), L.paint, L.w * 0.4, ' opacity=".7"')));
          }
      } },
    { key: "gilded", label: "Gilded frame", about: "A gold-leaf frame in your line color.", reach: (w) => w + 0.7,
      draw: (L) => {
          const g = L.k.lin(L.box[0], L.box[1], L.box[2], L.box[3], [[0, L.light(L.c, 0.6)], [0.3, L.c], [0.55, L.dark(L.c, 0.4)], [0.8, L.light(L.c, 0.5)], [1, L.c]]);
          L.ring(0, L.w + 0.7, "url(#" + g + ")");
          L.ring(0, 0.22, L.dark(L.c, 0.55));
          L.ring(L.w + 0.48, L.w + 0.7, L.dark(L.c, 0.55));
      } },
    { key: "glitch", label: "Glitch", about: "Slips into cyan and magenta.", reach: (w) => w + 0.6,
      draw: (L) => {
          L.over('<g opacity=".8" transform="translate(-.55 .1)">' + L.outside(L.band(0, L.w, "#ff2fa0")) + '</g>');
          L.over('<g opacity=".8" transform="translate(.55 -.1)">' + L.outside(L.band(0, L.w, "#22e6ff")) + '</g>');
          L.ring(0, L.w * 0.6, L.paint);
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
