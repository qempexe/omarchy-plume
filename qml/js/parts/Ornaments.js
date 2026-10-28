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
      }).join("") },
    { key: "filigree", label: "Filigree", about: "A fine frame inside, with rosettes and diamonds.",
      draw: (O) => {
          let out = O.inner ? O.inside(O.stroke(O.inner, O.c, 0.2, ' opacity=".85"')) : "";
          for (const p of O.corners) out += circle(p[0], p[1], 0.3 * O.s, O.c);
          for (const sd of O.sides) { const x = sd.x - sd.nx * 1.3, y = sd.y - sd.ny * 1.3, r = 0.45 * O.s; out += shape([[x, y - r], [x + r, y], [x, y + r], [x - r, y]], O.c); }
          return out;
      } },
    { key: "flourish", label: "Flourish", about: "A swirl from the middle of the cursor.",
      draw: (O) => {
          const pts = [];
          for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 3, r = 0.2 + t * 2.6 * O.s; pts.push([O.cx + Math.cos(a) * r, O.cy + Math.sin(a) * r]); }
          return O.inside(path("M" + pts.map((p) => f(p[0]) + " " + f(p[1])).join(" L"), O.c, 0.3));
      } },
    { key: "scrolls", label: "Scrolls", about: "Scrolls curl at the tail.",
      draw: (O) => {
          let out = "";
          const px = -O.axis[1], py = O.axis[0];
          for (const side of [-1, 1]) {
              const pts = [];
              for (let i = 0; i <= 30; i++) {
                  const t = i / 30, a = side * t * Math.PI * 2.2, r = (1.4 - t * 1.1) * O.s;
                  const cx = O.tail[0] - O.axis[0] * 1.6 + px * side * 1.3, cy = O.tail[1] - O.axis[1] * 1.6 + py * side * 1.3;
                  pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
              }
              out += path("M" + pts.map((p) => f(p[0]) + " " + f(p[1])).join(" L"), O.c, 0.32);
          }
          return out;
      } },
    { key: "chevrons", label: "Chevrons", about: "Chevrons point out of the tip and the tail.",
      draw: (O) => {
          const chev = (p, dx, dy) => {
              const r = 0.9 * O.s, px = -dy, py = dx, x = p[0] + dx * 1.6, y = p[1] + dy * 1.6;
              return path("M" + f(x - dx * r + px * r) + " " + f(y - dy * r + py * r) + " L" + f(x) + " " + f(y) + " L" + f(x - dx * r - px * r) + " " + f(y - dy * r - py * r), O.c, 0.4);
          };
          return chev(O.tip, -O.axis[0], -O.axis[1]) + chev(O.tail, O.axis[0], O.axis[1]);
      } },
    { key: "fans", label: "Fans", about: "Little fans open in the corners.",
      draw: (O) => O.corners.map((p) => {
          let out = "";
          const a0 = Math.atan2(O.cy - p[1], O.cx - p[0]), r = 1.3 * O.s;
          for (let i = -2; i <= 2; i++) { const a = a0 + i * 0.32; out += path("M" + f(p[0]) + " " + f(p[1]) + " L" + f(p[0] + Math.cos(a) * r) + " " + f(p[1] + Math.sin(a) * r), O.c, 0.22); }
          return O.inside(out);
      }).join("") },
    { key: "deco", label: "Deco", about: "Three stepped lines into each corner, the way the twenties did it.",
      draw: (O) => {
          const b = O.box;
          let out = "";
          for (let k = 0; k < 3; k++) {
              const g = 0.5 + k * 0.6, l = (1.2 + k * 0.7) * O.s;
              out += path("M" + f(b[0] - g) + " " + f(b[1] - g + l) + " V" + f(b[1] - g) + " H" + f(b[0] - g + l), O.c, 0.22)
                   + path("M" + f(b[2] + g) + " " + f(b[3] + g - l) + " V" + f(b[3] + g) + " H" + f(b[2] + g - l), O.c, 0.22);
          }
          return out;
      } },
    { key: "crown", label: "Crown", about: "A little crown inside, near the tail.",
      draw: (O) => {
          const r = 1.1 * O.s, x = O.tail[0] - O.axis[0] * 3.6, y = O.tail[1] - O.axis[1] * 3.6;
          const pts = [[x - r, y + r * 0.6], [x - r, y - r * 0.2], [x - r * 0.5, y + r * 0.2], [x, y - r * 0.7], [x + r * 0.5, y + r * 0.2], [x + r, y - r * 0.2], [x + r, y + r * 0.6]];
          return shape(pts, O.c, edge(O)) + circle(x, y - r * 0.9, 0.2 * O.s, O.light(O.c, 0.5));
      } },
    { key: "laurels", label: "Laurels", about: "Two half wreaths hold the cursor.",
      draw: (O) => {
          let out = "";
          const R = Math.max(O.box[2] - O.box[0], O.box[3] - O.box[1]) * 0.62;
          for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
              const a = Math.PI / 2 + side * (0.5 + i * 0.36), x = O.cx + Math.cos(a) * R, y = O.cy + Math.sin(a) * R;
              const ang = a * 180 / Math.PI + (side > 0 ? 60 : 120), r = 0.75 * O.s;
              out += '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(r) + '" ry="' + f(r * 0.38) + '" transform="rotate(' + f(ang) + " " + f(x) + " " + f(y)
                  + ')" fill="' + O.c + '"/>';
          }
          return out;
      } }
];

var byKey = {};
var keys = [];
var labels = {};
var abouts = {};
for (let i = 0; i < list.length; i++) {
    byKey[list[i].key] = list[i];
    keys.push(list[i].key);
    labels[list[i].key] = list[i].label;
    abouts[list[i].key] = list[i].about;
}
