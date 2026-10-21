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
      } },
    { key: "candy", label: "Candy", about: "Wide stripes, glossy like a sweet.",
      paint: (S) => {
          const p = S.k.pat(3.2, 3.2, '<rect width="1.6" height="3.2" fill="' + S.c2 + '"/>', 45);
          return S.fill() + S.clip(S.rect("url(#" + p + ")")) + gloss(S, 0.4);
      } },
    { key: "halftone", label: "Halftone", about: "Dots that grow toward the tail.",
      paint: (S) => {
          let dots = "";
          const ax = S.tail[0] - S.tip[0], ay = S.tail[1] - S.tip[1], len2 = ax * ax + ay * ay || 1;
          for (let y = S.box[1]; y <= S.box[3] + 1; y += 1.4)
              for (let x = S.box[0] + ((y / 1.4) % 2 ? 0.7 : 0); x <= S.box[2] + 1; x += 1.4) {
                  const t = Math.max(0, Math.min(1, ((x - S.tip[0]) * ax + (y - S.tip[1]) * ay) / len2));
                  dots += circle(x, y, 0.1 + 0.55 * t, S.c2);
              }
          return S.fill() + S.clip(dots);
      } },
    { key: "holo", label: "Hologram", about: "A rainbow sheen.",
      paint: (S) => {
          const g = S.k.lin(S.box[0], S.box[1], S.box[2], S.box[3], [[0, "#ff5f9e", 0.6], [0.2, "#ffd36b", 0.6], [0.4, "#7dffb0", 0.6],
                                                                     [0.6, "#6bd5ff", 0.6], [0.8, "#a78bff", 0.6], [1, "#ff5f9e", 0.6]]);
          return S.fill() + S.clip(S.rect("url(#" + g + ")")) + gloss(S, 0.35);
      } },
    { key: "comet", label: "Comet", about: "Fades in from nothing at the tail.", open: true,
      paint: (S) => {
          const g = S.k.lin(S.tail[0], S.tail[1], S.tip[0], S.tip[1], [[0, S.c1, 0], [0.75, S.c1, 1], [1, S.light(S.c1, 0.3), 1]]);
          return S.sil("url(#" + g + ")", 0);
      } },
    { key: "damask", label: "Damask", about: "An old wallpaper pattern.",
      paint: (S) => {
          const m = '<path d="M1.6 .2 Q2.3 1 1.6 1.6 Q.9 1 1.6 .2 M.2 1.6 Q1 2.3 1.6 1.6 Q1 .9 .2 1.6 M3 1.6 Q2.2 2.3 1.6 1.6 Q2.2 .9 3 1.6 M1.6 3 Q.9 2.2 1.6 1.6 Q2.3 2.2 1.6 3" fill="'
              + S.c2 + '" opacity=".55"/>';
          return S.fill() + S.clip(S.rect("url(#" + S.k.pat(3.2, 3.2, m, 0) + ")"));
      } },
    { key: "velvet", label: "Velvet", about: "Deep, with a soft sheen.",
      paint: (S) => {
          const g = S.k.rad(S.cx - S.w * 0.15, S.cy - S.h * 0.15, Math.max(S.w, S.h) * 0.8, [[0, S.light(S.c1, 0.2)], [0.5, S.c1], [1, S.dark(S.c1, 0.5)]]);
          const s = S.k.lin(S.box[0], S.box[1], S.box[2], S.box[3], [[0.3, "#fff", 0], [0.42, "#fff", 0.16], [0.54, "#fff", 0]]);
          return S.sil("url(#" + g + ")", 0) + S.clip(S.rect("url(#" + s + ")"));
      } },
    { key: "marble", label: "Marble", about: "Pale stone with winding veins.",
      paint: (S) => {
          let veins = "";
          for (let v = 0; v < 4; v++) {
              const pts = [];
              let x = S.box[0] + S.rnd() * S.w * 0.3, y = S.box[1] + S.rnd() * S.h;
              for (let i = 0; i < 7; i++) { pts.push([x, y]); x += S.w * 0.18; y += (S.rnd() - 0.5) * S.h * 0.3; }
              veins += line(pts, v % 2 ? S.dark(S.c2, 0.2) : S.c2, v % 2 ? 0.18 : 0.35, ' opacity=".7"');
          }
          return S.sil(S.light(S.c1, 0.4), 0) + S.clip(veins);
      } },
    { key: "ledge", label: "Ledge", about: "A thick darker strip along the bottom.",
      paint: (S) => S.fill() + S.clip('<rect x="-4" y="' + f(S.box[3] - S.h * 0.3) + '" width="40" height="40" fill="' + S.dark(S.c1, 0.35) + '"/>') },
    { key: "band", label: "Band", about: "A soft stripe of the second color through the middle.",
      paint: (S) => {
          const g = S.k.lin(S.box[0], S.box[3], S.box[2], S.box[1], [[0.3, S.c2, 0], [0.5, S.c2, 0.85], [0.7, S.c2, 0]]);
          return S.fill() + S.clip(S.rect("url(#" + g + ")"));
      } },
    { key: "underglow", label: "Underglow", about: "Light in the second color spills out underneath.",
      paint: (S) => {
          S.under('<g opacity=".95" filter="url(#' + S.k.blur(1.4) + ')" transform="translate(0 1.2)">' + S.sil(S.c2, 0.6) + '</g>');
          return S.fill();
      } },
    { key: "spiderweb", label: "Spiderweb", about: "A web spun from the tip.",
      paint: (S) => {
          let web = "";
          const R = Math.hypot(S.w, S.h);
          const base = Math.atan2(S.tail[1] - S.tip[1], S.tail[0] - S.tip[0]);
          const spokes = [];
          for (let i = -2; i <= 2; i++) spokes.push(base + i * 0.32);
          for (const a of spokes) web += line([S.tip, [S.tip[0] + Math.cos(a) * R, S.tip[1] + Math.sin(a) * R]], S.ink, 0.18, ' opacity=".45"');
          for (let k = 1; k <= 4; k++) {
              const r = k * R / 5;
              web += line(spokes.map((a) => [S.tip[0] + Math.cos(a) * r, S.tip[1] + Math.sin(a) * r]), S.ink, 0.16, ' opacity=".4"');
          }
          return S.fill() + S.clip(web);
      } },
    { key: "wood", label: "Wood", about: "Grain around a knot.",
      paint: (S) => {
          let rings = "";
          const kx = S.cx + S.w * 0.15, ky = S.cy + S.h * 0.1;
          for (let k = 1; k <= 9; k++) {
              const pts = [];
              for (let i = 0; i <= 24; i++) {
                  const a = 2 * Math.PI * i / 24, r = k * 0.9 * (1 + 0.12 * Math.sin(a * 3 + k));
                  pts.push([kx + Math.cos(a) * r * 1.6, ky + Math.sin(a) * r * 0.8]);
              }
              rings += line(pts, S.dark(S.c1, 0.35), 0.2, ' opacity=".55"');
          }
          return S.fill() + S.clip(rings);
      } },
    { key: "terrazzo", label: "Terrazzo", about: "Chips of stone in your colors.",
      paint: (S) => {
          let chips = "";
          const cols = [S.c2, S.acc, S.light(S.c1, 0.5), S.dark(S.c1, 0.4)];
          for (let i = 0; i < 26; i++) {
              const x = S.box[0] + S.rnd() * S.w, y = S.box[1] + S.rnd() * S.h, r = 0.35 + S.rnd() * 0.55, n = 3 + Math.floor(S.rnd() * 3);
              const pts = [];
              for (let j = 0; j < n; j++) { const a = 2 * Math.PI * j / n + S.rnd(); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
              chips += poly(pts, cols[i % cols.length]);
          }
          return S.fill() + S.clip(chips);
      } },
    { key: "crackle", label: "Crackle", about: "A cracked glaze.",
      paint: (S) => {
          let cracks = "";
          for (let c = 0; c < 6; c++) {
              const pts = [];
              let x = S.box[0] + S.rnd() * S.w, y = S.box[1] + S.rnd() * S.h, a = S.rnd() * 6.28;
              for (let i = 0; i < 6; i++) { pts.push([x, y]); a += (S.rnd() - 0.5) * 1.4; x += Math.cos(a) * 1.6; y += Math.sin(a) * 1.6; }
              cracks += line(pts, S.dark(S.c1, 0.55), 0.18, ' opacity=".7"');
          }
          return S.fill() + gloss(S, 0.2) + S.clip(cracks);
      } },
    { key: "topo", label: "Contours", about: "The lines of a map.",
      paint: (S) => {
          let lines = "";
          for (let k = 1; k <= 7; k++) {
              const pts = [];
              for (let i = 0; i <= 28; i++) {
                  const a = 2 * Math.PI * i / 28, r = k * 1.15 * (1 + 0.18 * Math.sin(a * 2 + 1.3) + 0.08 * Math.sin(a * 5));
                  pts.push([S.cx + Math.cos(a) * r, S.cy + Math.sin(a) * r * 0.85]);
              }
              lines += line(pts, S.ink, 0.17, ' opacity=".42"');
          }
          return S.fill() + S.clip(lines);
      } },
    { key: "nebula", label: "Nebula", about: "Clouds and stars.",
      paint: (S) => {
          const cloud = (x, y, r, c, a) => { const g = S.k.rad(x, y, r, [[0, c, a], [1, c, 0]]); return circle(x, y, r, "url(#" + g + ")"); };
          let stars = "";
          for (let i = 0; i < 14; i++) stars += circle(S.box[0] + S.rnd() * S.w, S.box[1] + S.rnd() * S.h, 0.08 + S.rnd() * 0.16, "#fff", ' opacity="' + f(0.5 + S.rnd() * 0.5) + '"');
          return S.sil(S.dark(S.c1, 0.6), 0) + S.clip(cloud(S.cx - S.w * 0.2, S.cy - S.h * 0.15, S.w * 0.6, S.c2, 0.8)
              + cloud(S.cx + S.w * 0.2, S.cy + S.h * 0.2, S.w * 0.55, S.acc, 0.6) + cloud(S.cx, S.cy, S.w * 0.35, S.light(S.c1, 0.3), 0.5) + stars);
      } },
    { key: "leather", label: "Leather", about: "A pebbled grain.",
      paint: (S) => {
          let grain = "";
          for (let i = 0; i < 70; i++)
              grain += circle(S.box[0] + S.rnd() * S.w, S.box[1] + S.rnd() * S.h, 0.25 + S.rnd() * 0.3, i % 2 ? "#000" : "#fff", ' opacity="' + (i % 2 ? ".16" : ".1") + '"');
          return S.fill() + S.clip(grain) + gloss(S, 0.12);
      } },
    { key: "stained", label: "Stained glass", about: "Panes of color held by dark lead.",
      paint: (S) => {
          const cols = [S.c1, S.c2, S.acc, S.light(S.c1, 0.35), S.light(S.c2, 0.3)];
          const step = 3.4, pts = [];
          for (let y = S.box[1] - step; y <= S.box[3] + step; y += step) {
              const row = [];
              for (let x = S.box[0] - step; x <= S.box[2] + step; x += step) row.push([x + (S.rnd() - 0.5) * 1.6, y + (S.rnd() - 0.5) * 1.6]);
              pts.push(row);
          }
          let panes = "";
          for (let j = 0; j < pts.length - 1; j++) for (let i = 0; i < pts[j].length - 1; i++) {
              const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i + 1], dd = pts[j + 1][i];
              const lead = ' stroke="' + S.dark(S.c1, 0.75) + '" stroke-width=".32" stroke-linejoin="round"';
              panes += poly([a, b, c], cols[(i + j) % cols.length], lead) + poly([a, c, dd], cols[(i + j + 2) % cols.length], lead);
          }
          return S.fill() + S.clip(panes) + gloss(S, 0.2);
      } },
    { key: "shadow", label: "Only a shadow", about: "Nothing but the shadow, and the lines and ornaments.", open: true,
      paint: (S) => "" },
    { key: "clear", label: "Clear", about: "Nothing at all, so only the lines and ornaments are left.", open: true, noShadow: true,
      paint: (S) => "" }
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
