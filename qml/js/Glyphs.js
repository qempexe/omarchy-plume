.pragma library
.import "Arrows.js" as Arrows

// The shapes of every cursor a theme made in Plume holds, in cursor units: the cursor
// is 32 across, x to the right, y down. Cursor.js gives them their colors, lines and
// shadow.
//
// A glyph is { hot, layers, rot?, tip?, inward? }:
//   hot      where the click lands, [x, y]
//   layers   drawn in order, each { pieces, box, badge? }; the pieces of one layer melt
//            into one shape and get one outline around all of them
//   rot      degrees the whole glyph turns about the middle (for the resize arrows)
//   tip, inward   for arrows: the tip and the unit vector pointing into the arrow
//
// A piece is one of
//   { t: "poly", p: [[x, y], ...] }        { t: "rect", x, y, w, h, r, rot? }
//   { t: "circle", cx, cy, r }             { t: "stroke", d, w }  (a line of width w)
// and any of them may carry op (0..1). A badge layer's `marks` are drawn on top of it
// in a color that reads on the badge.

var TIP = [7, 5.5];
var LEAN = -26;
var C = 16;

function rotate(p, deg, cx, cy) {
    const a = deg * Math.PI / 180, s = Math.sin(a), c = Math.cos(a);
    const x = p[0] - cx, y = p[1] - cy;
    return [cx + x * c - y * s, cy + x * s + y * c];
}
function norm(v) { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }
function boxOf(pts) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    return [x0, y0, x1, y1];
}
function n(v) { return Math.round(v * 100) / 100; }
function circlePath(cx, cy, r) {
    return "M" + n(cx + r) + " " + n(cy) + " A" + n(r) + " " + n(r) + " 0 1 1 " + n(cx - r) + " " + n(cy)
        + " A" + n(r) + " " + n(r) + " 0 1 1 " + n(cx + r) + " " + n(cy);
}
function arcPath(cx, cy, r, a0, a1) {
    const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)], p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    const large = ((a1 - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) > Math.PI ? 1 : 0;
    return "M" + n(p0[0]) + " " + n(p0[1]) + " A" + n(r) + " " + n(r) + " 0 " + large + " 1 " + n(p1[0]) + " " + n(p1[1]);
}

// ---- the arrow ---------------------------------------------------------------------------

function arrow(key) {
    const A = Arrows.byKey[key] || Arrows.list[0];
    if (A.dot) {
        const c = [9.5, 9.5];
        return { hot: c, layers: [{ pieces: [{ t: "circle", cx: c[0], cy: c[1], r: A.dot }],
                 box: [c[0] - A.dot, c[1] - A.dot, c[0] + A.dot, c[1] + A.dot] }] };
    }
    const pts = A.points.map((p) => {
        const q = A.upright ? rotate(p, LEAN, 0, 0) : p;
        return [q[0] + TIP[0], q[1] + TIP[1]];
    });
    const tip = pts[0];
    const e1 = norm([pts[1][0] - tip[0], pts[1][1] - tip[1]]);
    const e2 = norm([pts[pts.length - 1][0] - tip[0], pts[pts.length - 1][1] - tip[1]]);
    return { hot: tip, tip: tip, inward: norm([e1[0] + e2[0], e1[1] + e2[1]]),
             layers: [{ pieces: [{ t: "poly", p: pts }], box: boxOf(pts) }] };
}

// an arrow with a round badge at its tail, for help, copy, link, menus and progress
var BADGE = [24.2, 24.2];
function badged(key, marks) {
    const g = arrow(key);
    g.layers.push({ badge: true, pieces: [{ t: "circle", cx: BADGE[0], cy: BADGE[1], r: 5.4 }],
                    box: [18.8, 18.8, 29.6, 29.6], marks: marks });
    return g;
}
function badgeMark(kind) {
    const x = BADGE[0], y = BADGE[1];
    switch (kind) {
    case "help": return [{ t: "stroke", w: 1.3, d: "M" + n(x - 1.9) + " " + n(y - 1.6) + " A1.95 1.95 0 1 1 " + n(x + 1) + " " + n(y + 0.1)
                           + " Q" + n(x) + " " + n(y + 0.6) + " " + n(x) + " " + n(y + 1.6) },
                         { t: "circle", cx: x, cy: y + 3.3, r: 0.8 }];
    case "copy": return [{ t: "stroke", w: 1.4, d: "M" + n(x - 2.6) + " " + n(y) + " H" + n(x + 2.6) + " M" + n(x) + " " + n(y - 2.6) + " V" + n(y + 2.6) }];
    case "alias": return [{ t: "stroke", w: 1.25, d: "M" + n(x - 2.4) + " " + n(y + 2.6) + " V" + n(y + 1) + " Q" + n(x - 2.4) + " " + n(y - 1.4)
                            + " " + n(x) + " " + n(y - 1.4) + " H" + n(x + 2.4) },
                          { t: "stroke", w: 1.25, d: "M" + n(x + 1) + " " + n(y - 2.9) + " L" + n(x + 2.5) + " " + n(y - 1.4) + " L" + n(x + 1) + " " + n(y + 0.1) }];
    case "menu": return [{ t: "stroke", w: 1.1, d: "M" + n(x - 2.5) + " " + n(y - 1.9) + " H" + n(x + 2.5)
                           + " M" + n(x - 2.5) + " " + n(y) + " H" + n(x + 2.5) + " M" + n(x - 2.5) + " " + n(y + 1.9) + " H" + n(x + 2.5) }];
    }
    return [];
}

// ---- busy -----------------------------------------------------------------------------------
// One frame of a spinner, f in 0 .. frames-1, around cx, cy with radius r.

var spinnerKeys = ["ring", "dots", "orbit"];
var spinnerLabels = { ring: "Ring", dots: "Dots", orbit: "Orbit" };

function spinner(style, cx, cy, r, f, frames, w) {
    const turn = 2 * Math.PI * f / frames - Math.PI / 2;
    if (style === "dots") {
        const out = [];
        for (let i = 0; i < 8; i++) {
            const a = 2 * Math.PI * i / 8 - Math.PI / 2;
            const age = ((f / frames * 8 - i) % 8 + 8) % 8;
            out.push({ t: "circle", cx: cx + r * Math.cos(a), cy: cy + r * Math.sin(a), r: r * 0.24, op: Math.max(0.2, 1 - age / 8) });
        }
        return out;
    }
    if (style === "orbit") {
        const p = (a, k) => ({ t: "circle", cx: cx + r * Math.cos(a), cy: cy + r * Math.sin(a), r: r * k });
        return [{ t: "circle", cx: cx, cy: cy, r: r * 0.22, op: 0.55 }, p(turn, 0.3), p(turn + Math.PI, 0.22)];
    }
    return [{ t: "stroke", w: w, d: circlePath(cx, cy, r), op: 0.3 },
            { t: "stroke", w: w, d: arcPath(cx, cy, r, turn, turn + Math.PI * 0.6) }];
}

// ---- hands ------------------------------------------------------------------------------------

var handKeys = ["hand", "arrow", "ring"];
var handLabels = { hand: "Hand", arrow: "Arrow and dot", ring: "Ring" };

function rect(x, y, w, h, r, rot) { return { t: "rect", x: x, y: y, w: w, h: h, r: r, rot: rot || 0 }; }
function line(d, w, op) { return { t: "stroke", d: d, w: w, op: op }; }

function pointing(style, arrowKey) {
    if (style === "arrow") {
        const g = arrow(arrowKey);
        g.layers.push({ badge: true, pieces: [{ t: "circle", cx: 22.5, cy: 22.5, r: 3.4 }], box: [19, 19, 26, 26], marks: [] });
        return g;
    }
    if (style === "ring")
        return { hot: [C, C], layers: [{ pieces: [line(circlePath(C, C, 6.6), 2.2), { t: "circle", cx: C, cy: C, r: 1.4 }], box: [9, 9, 23, 23] }] };
    return { hot: [13.4, 3.4], layers: [{ box: [5, 3, 27, 28], pieces: [
        rect(11.2, 3.2, 4.4, 15, 2.2), rect(15.4, 11.6, 4.1, 8, 2), rect(19.3, 12.6, 3.9, 7.5, 1.9),
        rect(22.9, 14.2, 3.4, 6.4, 1.7), rect(11.2, 14.5, 15.1, 13.3, 4.5), rect(5.6, 15.6, 8.4, 4, 2, 38)] }],
        creases: [line("M15.45 13.4 V17 M19.35 14.4 V17.4 M22.95 16 V18", 0.7, 0.45)] };
}
function openHand() {
    return { hot: [17, 16], layers: [{ box: [6, 5, 26, 28], pieces: [
        rect(11, 6.5, 3.7, 13, 1.85), rect(14.8, 5, 3.7, 14, 1.85), rect(18.6, 6, 3.6, 13, 1.8),
        rect(22.2, 8.5, 3.3, 10.5, 1.65), rect(11, 15, 14.5, 12.5, 4.5), rect(6, 16, 8, 3.8, 1.9, 35)] }],
        creases: [line("M14.75 15.6 V18.4 M18.55 15.6 V18.4 M22.15 16 V18.4", 0.7, 0.4)] };
}
function fist() {
    return { hot: [17, 16], layers: [{ box: [7, 9, 26, 27], pieces: [
        rect(10, 12.5, 15.5, 14.5, 4.6), rect(10, 9.8, 4, 6, 2), rect(13.9, 9, 4, 6, 2),
        rect(17.8, 9.3, 4, 6, 2), rect(21.6, 10.4, 3.9, 6, 1.9), rect(7.4, 15.5, 10, 3.8, 1.9, 12)] }],
        creases: [line("M13.95 10.8 V13.4 M17.85 10.6 V13.4 M21.65 11.4 V13.6", 0.7, 0.4)] };
}

// ---- text -------------------------------------------------------------------------------------

var beamKeys = ["beam", "slim", "caret"];
var beamLabels = { beam: "Beam", slim: "Slim", caret: "Caret" };

function beam(style, rot) {
    let pieces;
    if (style === "slim")
        pieces = [line("M16 8 V24", 1.15), line("M13.9 7.2 H18.1", 1.15), line("M13.9 24.8 H18.1", 1.15)];
    else if (style === "caret")
        pieces = [line("M16 6.5 V25.5", 2.3)];
    else
        pieces = [line("M16 7.8 V24.2", 1.7), line("M12.8 6.6 Q16 6.6 16 8.4 Q16 6.6 19.2 6.6", 1.5),
                  line("M12.8 25.4 Q16 25.4 16 23.6 Q16 25.4 19.2 25.4", 1.5)];
    return { hot: [C, C], rot: rot || 0, layers: [{ pieces: pieces, box: [12, 6, 20, 26] }] };
}

// ---- signs ------------------------------------------------------------------------------------

function notAllowed() {
    return { hot: [C, C], layers: [{ box: [7, 7, 25, 25],
        pieces: [line(circlePath(C, C, 8.2), 2.6), line("M10.2 21.8 L21.8 10.2", 2.6)] }] };
}
function crosshair() {
    return { hot: [C, C], layers: [{ box: [4, 4, 28, 28], pieces: [
        line("M16 4.5 V12.3 M16 19.7 V27.5 M4.5 16 H12.3 M19.7 16 H27.5", 1.6), { t: "circle", cx: C, cy: C, r: 1.3 }] }] };
}
function cell() {
    return { hot: [C, C], layers: [{ box: [6, 6, 26, 26], pieces: [rect(13.6, 6, 4.8, 20, 0.6), rect(6, 13.6, 20, 4.8, 0.6)] }] };
}
function move() {
    const head = [[16, 3.8], [20.4, 9], [11.6, 9]];
    const pieces = [line("M16 8.5 V23.5 M8.5 16 H23.5", 2.2)];
    for (const a of [0, 90, 180, 270]) pieces.push({ t: "poly", p: head.map((p) => rotate(p, a, C, C)) });
    return { hot: [C, C], layers: [{ pieces: pieces, box: [3.8, 3.8, 28.2, 28.2] }] };
}
function doubleArrow(rot) {
    return { hot: [C, C], rot: rot, layers: [{ box: [10, 3.8, 22, 28.2], pieces: [{ t: "poly", p: [[16, 3.8], [21.6, 10], [18.1, 10], [18.1, 22],
        [21.6, 22], [16, 28.2], [10.4, 22], [13.9, 22], [13.9, 10], [10.4, 10]] }] }] };
}
function splitArrow(rot) {
    return { hot: [C, C], rot: rot, layers: [{ box: [3.8, 6, 28.2, 26], pieces: [rect(15, 6, 2, 20, 0.6),
        { t: "poly", p: [[3.8, 16], [9.6, 10.6], [9.6, 13.9], [13.2, 13.9], [13.2, 18.1], [9.6, 18.1], [9.6, 21.4]] },
        { t: "poly", p: [[28.2, 16], [22.4, 10.6], [22.4, 13.9], [18.8, 13.9], [18.8, 18.1], [22.4, 18.1], [22.4, 21.4]] }] }] };
}
var UP = [[16, 8.6], [21.6, 14.6], [18.1, 14.6], [18.1, 27.4], [13.9, 27.4], [13.9, 14.6], [10.4, 14.6]];
function sideArrow(rot) {
    return { hot: [C, C], rot: rot, layers: [{ box: [8, 4, 24, 27.5], pieces: [rect(8, 4.2, 16, 2.3, 0.7), { t: "poly", p: UP }] }] };
}
function cornerArrow(rot) {
    return { hot: [C, C], rot: rot, layers: [{ box: [4.5, 4.5, 25, 25], pieces: [rect(4.5, 4.5, 13, 2.3, 0.7), rect(4.5, 4.5, 2.3, 13, 0.7),
        { t: "poly", p: UP.map((p) => rotate([p[0], p[1] + 0.6], -45, C, C)) }] }] };
}
function zoom(plus) {
    const x = 13.5, y = 13.5;
    const sign = plus ? "M10.8 13.5 H16.2 M13.5 10.8 V16.2" : "M10.8 13.5 H16.2";
    return { hot: [x, y], layers: [{ box: [5, 5, 27, 27], pieces: [line(circlePath(x, y, 7.2), 2.4), line("M19 19 L25.6 25.6", 3.4), line(sign, 1.5)] }] };
}

// ---- every cursor in a theme ------------------------------------------------------------------
// Each one: the folder it is kept in (also its name), the other names it answers to, and
// how it is drawn. `frames` marks the animated ones.

var shapes = [
    { dir: "left_ptr", names: ["default", "arrow", "top_left_arrow", "left_arrow"], make: (d) => arrow(d.arrow) },
    { dir: "hand2", names: ["pointer", "hand", "hand1", "pointing_hand"], make: (d) => pointing(d.hand, d.arrow) },
    { dir: "text", names: ["xterm", "ibeam"], make: (d) => beam(d.beam, 0) },
    { dir: "vertical-text", names: [], make: (d) => beam(d.beam, 90) },
    { dir: "crosshair", names: ["cross", "tcross", "cross_reverse", "diamond_cross"], make: () => crosshair() },
    { dir: "cell", names: ["plus"], make: () => cell() },
    { dir: "wait", names: ["watch"], frames: true,
      make: (d, f, fr) => ({ hot: [C, C], layers: [{ box: [7, 7, 25, 25], pieces: spinner(d.busy, C, C, 7.6, f, fr, 2.6) }] }) },
    { dir: "progress", names: ["left_ptr_watch", "half-busy"], frames: true,
      make: (d, f, fr) => badged(d.arrow, spinner(d.busy, BADGE[0], BADGE[1], 2.9, f, fr, 1.2)) },
    { dir: "not-allowed", names: ["no-drop", "crossed_circle", "forbidden", "circle", "dnd-no-drop"], make: () => notAllowed() },
    { dir: "help", names: ["question_arrow", "whats_this", "left_ptr_help", "dnd-ask"], make: (d) => badged(d.arrow, badgeMark("help")) },
    { dir: "context-menu", names: [], make: (d) => badged(d.arrow, badgeMark("menu")) },
    { dir: "copy", names: ["dnd-copy"], make: (d) => badged(d.arrow, badgeMark("copy")) },
    { dir: "alias", names: ["dnd-link", "link"], make: (d) => badged(d.arrow, badgeMark("alias")) },
    { dir: "move", names: ["fleur", "all-scroll", "size_all"], make: () => move() },
    { dir: "grab", names: ["openhand"], make: () => openHand() },
    { dir: "grabbing", names: ["closedhand", "dnd-move", "dnd-none"], make: () => fist() },
    { dir: "n-resize", names: ["top_side"], make: () => sideArrow(0) },
    { dir: "e-resize", names: ["right_side"], make: () => sideArrow(90) },
    { dir: "s-resize", names: ["bottom_side"], make: () => sideArrow(180) },
    { dir: "w-resize", names: ["left_side"], make: () => sideArrow(270) },
    { dir: "nw-resize", names: ["top_left_corner"], make: () => cornerArrow(0) },
    { dir: "ne-resize", names: ["top_right_corner"], make: () => cornerArrow(90) },
    { dir: "se-resize", names: ["bottom_right_corner"], make: () => cornerArrow(180) },
    { dir: "sw-resize", names: ["bottom_left_corner"], make: () => cornerArrow(270) },
    { dir: "ns-resize", names: ["sb_v_double_arrow", "v_double_arrow", "size_ver", "double_arrow"], make: () => doubleArrow(0) },
    { dir: "ew-resize", names: ["sb_h_double_arrow", "h_double_arrow", "size_hor"], make: () => doubleArrow(90) },
    { dir: "nesw-resize", names: ["fd_double_arrow", "size_bdiag"], make: () => doubleArrow(45) },
    { dir: "nwse-resize", names: ["bd_double_arrow", "size_fdiag"], make: () => doubleArrow(-45) },
    { dir: "col-resize", names: ["split_h"], make: () => splitArrow(0) },
    { dir: "row-resize", names: ["split_v"], make: () => splitArrow(90) },
    { dir: "zoom-in", names: [], make: () => zoom(true) },
    { dir: "zoom-out", names: [], make: () => zoom(false) }
];
var shapeByDir = {};
for (var si = 0; si < shapes.length; si++) shapeByDir[shapes[si].dir] = shapes[si];
