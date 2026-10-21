.pragma library

// Small decorations set on the cursor's corners, sides and ends.
//
// An ornament is { key, label, about, draw(O) } and draw returns SVG. O gives:
//   O.corners   the shape's corners, the tip left out: [[x, y], ...]
//   O.sides     the middles of its two longest sides: [{ x, y, nx, ny, tx, ty }], n out, t along
//   O.tip, O.tail, O.axis (unit, tip to tail), O.box, O.cx, O.cy
//   O.s         the size the settings ask for (1 is the usual size)
//   O.c, O.c2   the ornament's color and the line's color; O.light(c, t), O.dark(c, t)
//   O.inner     the outline a little way inside, as a polygon (or null)
//   O.stroke(poly, paint, width, extra), O.inside(svg)

function f(v) { return String(Math.round(v * 1000) / 1000); }
function circle(x, y, r, fill, extra) { return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + fill + '"' + (extra || "") + '/>'; }
function shape(pts, fill, extra) { return '<path d="M' + pts.map((p) => f(p[0]) + " " + f(p[1])).join(" L") + ' Z" fill="' + fill + '"' + (extra || "") + '/>'; }
function path(d, stroke, w, extra) { return '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + f(w) + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || "") + '/>'; }
function star(x, y, r, k, n, fill, extra) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) { const a = Math.PI * i / n - Math.PI / 2, rr = i % 2 ? r * k : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
    return shape(pts, fill, extra);
}
function edge(O) { return ' stroke="' + O.dark(O.c, 0.55) + '" stroke-width=".18"'; }
function along(side, k) { return [side.x + side.tx * k, side.y + side.ty * k]; }

var list = [
    { key: "none", label: "None", about: "No ornaments.", draw: (O) => "" },
    { key: "studs", label: "Studs", about: "Studs in the corners.",
      draw: (O) => O.corners.map((p) => circle(p[0], p[1], 0.6 * O.s, O.c, edge(O)) + circle(p[0] - 0.18 * O.s, p[1] - 0.18 * O.s, 0.22 * O.s, "#fff", ' opacity=".6"')).join("") },
    { key: "rivets", label: "Rivets", about: "Rivets along the long sides.",
      draw: (O) => O.sides.map((sd) => [-2.4, 0, 2.4].map((k) => { const p = along(sd, k * O.s); return circle(p[0] - sd.nx * 0.9, p[1] - sd.ny * 0.9, 0.36 * O.s, O.c, edge(O)); }).join("")).join("") },
    { key: "pearls", label: "Pearls", about: "Pearls strung along the long sides.",
      draw: (O) => O.sides.map((sd) => [-2.4, -1.2, 0, 1.2, 2.4].map((k) => {
          const p = along(sd, k * O.s), r = 0.42 * O.s;
          return circle(p[0], p[1], r, O.light(O.c, 0.55)) + circle(p[0] - r * 0.35, p[1] - r * 0.35, r * 0.4, "#fff", ' opacity=".8"');
      }).join("")).join("") },
    { key: "crosses", label: "Crosses", about: "Crosses in the corners.",
      draw: (O) => O.corners.map((p) => { const r = 0.75 * O.s; return path("M" + f(p[0] - r) + " " + f(p[1]) + " H" + f(p[0] + r) + " M" + f(p[0]) + " " + f(p[1] - r) + " V" + f(p[1] + r), O.c, 0.38 * O.s); }).join("") },
    { key: "stars", label: "Stars", about: "Stars sparkle in the corners.",
      draw: (O) => O.corners.map((p) => star(p[0], p[1], 0.95 * O.s, 0.35, 4, O.c)).join("") },
    { key: "brackets", label: "Brackets", about: "Brackets mark the corners around the cursor.",
      draw: (O) => {
          const b = O.box, g = 0.9, l = 2.2 * O.s, w = 0.4;
          const x0 = b[0] - g, y0 = b[1] - g, x1 = b[2] + g, y1 = b[3] + g;
          return path("M" + f(x0) + " " + f(y0 + l) + " V" + f(y0) + " H" + f(x0 + l) + " M" + f(x1 - l) + " " + f(y0) + " H" + f(x1) + " V" + f(y0 + l)
              + " M" + f(x1) + " " + f(y1 - l) + " V" + f(y1) + " H" + f(x1 - l) + " M" + f(x0 + l) + " " + f(y1) + " H" + f(x0) + " V" + f(y1 - l), O.c, w);
      } },
    { key: "rosettes", label: "Rosettes", about: "Rosettes in the corners.",
      draw: (O) => O.corners.map((p) => {
          let out = "";
          for (let i = 0; i < 6; i++) { const a = Math.PI * i / 3; out += circle(p[0] + Math.cos(a) * 0.45 * O.s, p[1] + Math.sin(a) * 0.45 * O.s, 0.32 * O.s, O.c); }
          return out + circle(p[0], p[1], 0.28 * O.s, O.light(O.c, 0.6));
      }).join("") },
    { key: "diamonds", label: "Diamonds", about: "Diamonds in the middle of the long sides.",
      draw: (O) => O.sides.map((sd) => { const r = 0.85 * O.s, x = sd.x - sd.nx * 1, y = sd.y - sd.ny * 1; return shape([[x, y - r], [x + r * 0.7, y], [x, y + r], [x - r * 0.7, y]], O.c, edge(O)); }).join("") },
    { key: "fleurons", label: "Fleurons", about: "Little leaves in the middle of the long sides.",
      draw: (O) => O.sides.map((sd) => {
          const x = sd.x - sd.nx * 1.2, y = sd.y - sd.ny * 1.2, r = 0.9 * O.s, a = Math.atan2(-sd.ny, -sd.nx) * 180 / Math.PI;
          return '<g transform="translate(' + f(x) + " " + f(y) + ") rotate(" + f(a + 90) + ')"><path d="M0 ' + f(-r) + " Q" + f(r) + " " + f(-r * 0.2) + " 0 " + f(r)
              + " Q" + f(-r) + " " + f(-r * 0.2) + " 0 " + f(-r) + ' Z" fill="' + O.c + '"/><path d="M0 ' + f(-r * 0.6) + " V" + f(r * 0.6)
              + '" stroke="' + O.dark(O.c, 0.4) + '" stroke-width=".16"/></g>';
      }).join("") }
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
