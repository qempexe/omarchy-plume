.pragma library
.import "Glyphs.js" as Glyphs
.import "Arrows.js" as Arrows
.import "Geo.js" as Geo
.import "Ink.js" as Ink
.import "parts/Surfaces.js" as Surfaces
.import "parts/Lines.js" as Lines
.import "parts/Ornaments.js" as Ornaments

// A cursor of your own: the settings become a design, the design becomes one SVG per
// cursor, and those become a Hyprcursor theme (core/CursorForge.qml writes it).
// Everything here is plain text in and plain text out, so it can be tested.
//
// The cursor is styled in parts: a surface (parts/Surfaces.js), a fill, a texture and a
// depth, a line (parts/Lines.js) and ornaments (parts/Ornaments.js), then a shadow.

var SIZE = 32;
var FRAMES = 12;

// ---- the choices ------------------------------------------------------------------------------

function table(list) {
    const t = { keys: [], labels: {}, abouts: {}, byKey: {} };
    for (const o of list) { t.keys.push(o.key); t.labels[o.key] = o.label; t.abouts[o.key] = o.about; t.byKey[o.key] = o; }
    return t;
}

var surfaces = Surfaces;
var lines = Lines;
var ornaments = Ornaments;

var shadows = table([
    { key: "none", label: "None", about: "No shadow." },
    { key: "soft", label: "Soft", about: "A soft shadow.", d: 1.2, blur: 1.05, alpha: 0.85 },
    { key: "strong", label: "Strong", about: "A deep, wide shadow.", d: 1.8, blur: 1.6, alpha: 1 },
    { key: "hard", label: "Hard", about: "A crisp shadow with no blur.", d: 1.25, blur: 0, alpha: 0.7 },
    { key: "long", label: "Long", about: "A long flat shadow down to the right.", long: 7, blur: 0, alpha: 0.5 }
]);

var details = table([
    { key: "none", label: "None", about: "Nothing extra." },
    { key: "tip", label: "Tip", about: "A dot in the second color just inside the tip, right where the click lands." },
    { key: "spine", label: "Spine", about: "A fine line down the middle." },
    { key: "spark", label: "Spark", about: "A small sparkle on the arrow." }
]);

var speeds = { slow: 110, normal: 70, fast: 45 };
var widths = [0.55, 0.9, 1.3, 1.8];

// where a color comes from
var colorKeys = ["accent", "foreground", "background", "border", "border2", "custom", "white", "black"];
var colorLabels = { accent: "Theme accent", foreground: "Theme text", background: "Theme background",
                    border: "Window border", border2: "Border, second", custom: "Custom", white: "White", black: "Black" };
var lineColorKeys = ["auto", "subtle"].concat(colorKeys);
var lineColorLabels = Object.assign({ auto: "Automatic", subtle: "Subtle" }, colorLabels);

// ---- colors -----------------------------------------------------------------------------------

function toHex(c) {
    const h = (v) => ("0" + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
    return "#" + h(c[0]) + h(c[1]) + h(c[2]);
}
function lum(c) { return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }
// a dark or light color that reads on c
function contrast(c) { return lum(c) > 0.55 ? [24, 20, 18] : [250, 247, 242]; }
function mixRgb(a, b, t) { return Ink.mix(a, b, t); }
function light(hex, t) { return toHex(mixRgb(Ink.hex(hex) || [128, 128, 128], [255, 255, 255], t)); }
function dark(hex, t) { return toHex(mixRgb(Ink.hex(hex) || [128, 128, 128], [0, 0, 0], t)); }
function mix(a, b, t) { return toHex(mixRgb(Ink.hex(a) || [128, 128, 128], Ink.hex(b) || [128, 128, 128], t)); }

// theme: { accent, foreground, background: [r, g, b], border, palette: [[r, g, b], ...], borderAngle }
function pick(key, custom, theme) {
    const t = theme || {};
    const border = t.border || [];
    switch (key) {
    case "accent": return t.accent || [200, 146, 90];
    case "foreground": return t.foreground || [234, 219, 200];
    case "background": return t.background || [18, 11, 9];
    case "border": return border[0] || t.accent || [200, 146, 90];
    case "border2": return border[1] || border[0] || t.foreground || [234, 219, 200];
    case "white": return [250, 250, 250];
    case "black": return [16, 16, 16];
    }
    return Ink.hex(custom) || [122, 162, 247];
}
// the first theme color that is not this one ("next theme color")
function nextColor(c, theme) {
    for (const p of (theme && theme.palette) || []) if (Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) + Math.abs(p[2] - c[2]) > 40) return p;
    return (theme && theme.accent) || [200, 146, 90];
}
function toward(key, c1, c2, theme) {
    switch (key) {
    case "second": return c2;
    case "lighter": return mixRgb(c1, [255, 255, 255], 0.45);
    case "darker": return mixRgb(c1, [0, 0, 0], 0.45);
    case "accent": return pick("accent", "", theme);
    case "palette": return nextColor(c1, theme);
    case "border": return pick("border", "", theme);
    }
    return c2;
}

// ---- settings -> a design -----------------------------------------------------------------------

// cfg: the resolved settings (Schema.resolve)
function design(cfg, theme) {
    const acc = pick("accent", "", theme);
    let c1 = pick(cfg.cursorColor, cfg.cursorColorCustom, theme);
    c1 = mixRgb(c1, acc, (cfg.cursorTint || 0) / 100);
    const c2 = pick(cfg.cursorColor2, cfg.cursorColor2Custom, theme);
    const surf = Surfaces.byKey[cfg.cursorSurface] ? cfg.cursorSurface : "filled";
    const see = Surfaces.byKey[surf].open === true || cfg.cursorFill === "glass";
    let line = Lines.byKey[cfg.cursorLine] ? cfg.cursorLine : "solid";
    let lineColor;
    if (cfg.cursorLineColor === "auto") lineColor = see ? c1 : contrast(c1);
    else if (cfg.cursorLineColor === "subtle") lineColor = mixRgb(contrast(c1), c1, 0.55);
    else lineColor = pick(cfg.cursorLineColor, cfg.cursorLineCustom, theme);
    // a cursor with nothing inside needs a line to be seen at all
    if ((surf === "clear" || surf === "shadow") && line === "none") { line = "solid"; lineColor = c1; }
    return {
        arrow: Arrows.byKey[cfg.cursorShape] ? cfg.cursorShape : "classic",
        tilt: cfg.cursorTilt,
        round: cfg.cursorRound / 100 * 2,
        surface: surf,
        fill: cfg.cursorFill === "gradient" || cfg.cursorFill === "glass" ? cfg.cursorFill : "solid",
        gradTo: toHex(toward(cfg.cursorGradientTo, c1, c2, theme)),
        gradDir: cfg.cursorGradientDir,
        texture: cfg.cursorPattern,
        depth: cfg.cursorDepth,
        opacity: Math.max(0.3, Math.min(1, (cfg.cursorOpacity || 100) / 100)),
        c1: toHex(c1), c2: toHex(c2), acc: toHex(acc),
        line: line, lineColor: toHex(lineColor), lineWidth: widths[Math.max(1, Math.min(4, cfg.cursorLineWidth || 2)) - 1],
        lineFade: cfg.cursorLineGradient === true,
        lineFadeTo: toHex(cfg.cursorLineFadeTo === "lighter" ? mixRgb(lineColor, [255, 255, 255], 0.55) : toward(cfg.cursorLineFadeTo, lineColor, c2, theme)),
        lineFadeDir: cfg.cursorLineFadeDir,
        borderAngle: theme && typeof theme.borderAngle === "number" ? theme.borderAngle : 45,
        ornament: Ornaments.byKey[cfg.cursorOrnament] ? cfg.cursorOrnament : "none",
        ornamentSize: (cfg.cursorOrnamentSize || 7) / 5,
        ornamentsOn: cfg.cursorOrnamentsOn,
        cap: cfg.cursorCap,
        ink: toHex(see ? lineColor : contrast(c1)),
        badgeInk: toHex(contrast(c2)),
        shadow: Surfaces.byKey[surf].noShadow ? "none" : cfg.cursorShadow,
        shadowColor: cfg.cursorShadowColor, shadowDir: cfg.cursorShadowDir,
        shadowStrength: cfg.cursorShadowStrength / 100,
        detail: cfg.cursorDetail,
        hand: cfg.cursorHand, beam: cfg.cursorBeam, busy: cfg.cursorBusy,
        delay: speeds[cfg.cursorBusySpeed] || speeds.normal
    };
}

// ---- drawing ------------------------------------------------------------------------------------

function f(v) { return String(Math.round(v * 1000) / 1000); }
function polyD(p) { return "M" + p.map((q) => f(q[0]) + " " + f(q[1])).join(" L") + " Z"; }

// one piece as an SVG element, painted with `paint` and grown outwards by `grow`
// (shrunk when it is below 0)
function el(p, paint, grow) {
    const op = typeof p.op === "number" && p.op < 1 ? ' opacity="' + f(p.op) + '"' : "";
    if (p.t === "stroke") {
        const w = p.w + 2 * grow;
        return w <= 0.02 ? "" : '<path d="' + p.d + '" fill="none" stroke="' + paint + '" stroke-width="' + f(w)
            + '" stroke-linecap="round" stroke-linejoin="round"' + op + '/>';
    }
    if (grow < -0.001) {
        const pg = Geo.polygonOf(p);
        return pg ? '<path d="' + polyD(Geo.offset(pg, grow)) + '" fill="' + paint + '"' + op + '/>' : "";
    }
    const st = grow > 0.001 ? ' stroke="' + paint + '" stroke-width="' + f(2 * grow) + '" stroke-linejoin="round"' : "";
    if (p.t === "circle")
        return '<circle cx="' + f(p.cx) + '" cy="' + f(p.cy) + '" r="' + f(p.r) + '" fill="' + paint + '"' + st + op + '/>';
    if (p.t === "rect") {
        const tf = p.rot ? ' transform="rotate(' + f(p.rot) + " " + f(p.x + p.w / 2) + " " + f(p.y + p.h / 2) + ')"' : "";
        return '<rect x="' + f(p.x) + '" y="' + f(p.y) + '" width="' + f(p.w) + '" height="' + f(p.h) + '" rx="' + f(p.r || 0)
            + '" fill="' + paint + '"' + st + op + tf + '/>';
    }
    return '<path d="' + polyD(p.p) + '" fill="' + paint + '"' + st + op + '/>';
}
function silhouette(pieces, paint, grow) { return pieces.map((p) => el(p, paint, grow)).join(""); }

function lineReach(d) {
    const L = Lines.byKey[d.line] || Lines.byKey.none;
    return L.reach ? L.reach(d.lineWidth) : d.lineWidth;
}
function outerGrow(d) { return d.round + lineReach(d); }

// ids, gradients, patterns, masks and blurs for one picture
function kit() {
    const k = { defs: "", n: 0 };
    k.id = (p) => p + (++k.n);
    k.def = (s) => { k.defs += s; };
    const stops = (list) => list.map((s) => '<stop offset="' + f(s[0]) + '" stop-color="' + s[1] + '"' + (s[2] !== undefined && s[2] < 1 ? ' stop-opacity="' + f(s[2]) + '"' : "") + '/>').join("");
    k.lin = (x1, y1, x2, y2, list) => {
        const i = k.id("g");
        k.def('<linearGradient id="' + i + '" gradientUnits="userSpaceOnUse" x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '">' + stops(list) + '</linearGradient>');
        return i;
    };
    k.rad = (cx, cy, r, list) => {
        const i = k.id("r");
        k.def('<radialGradient id="' + i + '" gradientUnits="userSpaceOnUse" cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(Math.max(0.1, r)) + '">' + stops(list) + '</radialGradient>');
        return i;
    };
    k.pat = (w, h, body, deg) => {
        const i = k.id("p");
        k.def('<pattern id="' + i + '" patternUnits="userSpaceOnUse" width="' + f(w) + '" height="' + f(h) + '"' + (deg ? ' patternTransform="rotate(' + f(deg) + ')"' : "") + '>' + body + '</pattern>');
        return i;
    };
    k.blur = (sd) => {
        const i = k.id("b");
        k.def('<filter id="' + i + '" filterUnits="userSpaceOnUse" x="-4" y="-4" width="40" height="40"><feGaussianBlur stdDeviation="' + f(sd) + '"/></filter>');
        return i;
    };
    k.mask = (body, inner) => {
        const i = k.id("m");
        k.def('<mask id="' + i + '" maskUnits="userSpaceOnUse" x="-4" y="-4" width="40" height="40">' + body + '</mask>');
        return '<g mask="url(#' + i + ')">' + inner + '</g>';
    };
    return k;
}

// a gradient's two ends across a box, along a direction
function across(box, dir, tip, tail, angle) {
    const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
    if (dir === "along" && tip && tail) return [tip[0], tip[1], tail[0], tail[1]];
    if (dir === "across") return [box[0], cy, box[2], cy];
    if (dir === "theme") {
        const a = angle * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
        const half = (Math.abs(dx) * (box[2] - box[0]) + Math.abs(dy) * (box[3] - box[1])) / 2;
        return [cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half];
    }
    return [box[0], box[1], box[2], box[3]];
}

// the far end of a shape from its tip
function tailOf(glyph, layer) {
    const pg = layer.pieces.length === 1 ? Geo.polygonOf(layer.pieces[0]) : null;
    const tip = glyph.tip || [layer.box[0], layer.box[1]];
    if (!pg) return [layer.box[2], layer.box[3]];
    let best = pg[0], bd = -1;
    for (const p of pg) { const dd = Math.hypot(p[0] - tip[0], p[1] - tip[1]); if (dd > bd) { bd = dd; best = p; } }
    return best;
}

function seedOf(glyph, i) {
    const b = glyph.layers[i].box;
    return Math.round((b[0] * 7 + b[1] * 13 + b[2] * 17 + b[3] * 19) * 10) + i * 101;
}

// One cursor picture as SVG. The ids of its gradients, masks and filters are numbered
// within it, so every picture stands on its own.
function render(glyph, d) {
    const k = kit();
    const surf = Surfaces.byKey[d.surface] || Surfaces.byKey.filled;
    const line = Lines.byKey[d.line] || Lines.byKey.none;
    const open = surf.open === true || d.fill === "glass";
    const r = d.round;
    const turn = glyph.rot ? 'rotate(' + f(glyph.rot) + ' 16 16) ' : "";
    const tilt = glyph.tip && d.tilt ? 'rotate(' + f(d.tilt) + " " + f(glyph.hot[0]) + " " + f(glyph.hot[1]) + ') ' : "";
    const frame = (inner) => tilt + turn === "" ? inner : '<g transform="' + (tilt + turn).trim() + '">' + inner + '</g>';
    const full = (paint) => '<rect x="-4" y="-4" width="40" height="40" fill="' + paint + '"/>';

    let body = "";
    glyph.layers.forEach((layer, li) => {
        const P = layer.pieces, b = layer.box;
        const tip = glyph.tip || [b[0], b[1]], tail = tailOf(glyph, layer);
        const sil = (paint, grow) => silhouette(P, paint, r + grow);
        const inside = (inner) => k.mask(sil("#fff", 0), inner);
        const outside = (inner) => k.mask(full("#fff") + sil("#000", -0.02), inner);
        const band = (from, to, paint) => k.mask(sil("#fff", to) + sil("#000", from), sil(paint, to));

        // a badge (help, copy, link...) stays simple: a solid dot with a plain line
        if (layer.badge) {
            if (d.line !== "none") body += sil(d.lineColor, Math.min(0.9, d.lineWidth));
            body += sil(d.c2, 0);
            if (layer.marks) body += silhouette(layer.marks, d.badgeInk, 0);
            return;
        }

        // the fill: a color, a gradient, or glass
        let base = d.c1;
        if (d.fill === "gradient") {
            const g = across(b, d.gradDir, tip, tail, d.borderAngle);
            base = "url(#" + k.lin(g[0], g[1], g[2], g[3], [[0, d.c1], [1, d.gradTo]]) + ")";
        }
        let lower = "";
        const rnd = Geo.rng(seedOf(glyph, li));
        const S = {
            k: k, c1: d.c1, c2: d.c2, acc: d.acc, ink: d.ink, light: light, dark: dark, mix: mix,
            box: b, cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, w: b[2] - b[0], h: b[3] - b[1], tip: tip, tail: tail, rnd: rnd,
            sil: (paint, grow) => sil(paint, grow || 0),
            fill: () => d.fill === "glass"
                ? '<g opacity=".45">' + sil(base, 0) + '</g>'
                  + inside(full("url(#" + k.lin(b[0], b[1], b[2], b[3], [[0, "#fff", 0.7], [0.35, "#fff", 0.12], [1, "#fff", 0]]) + ")"))
                : sil(base, 0),
            clip: inside,
            rect: (paint, extra) => '<rect x="-4" y="-4" width="40" height="40" fill="' + paint + '"' + (extra || "") + '/>',
            under: (svg) => { lower += svg; }
        };
        let fillSvg = surf.paint(S);
        const solidInside = surf.key !== "shadow" && surf.key !== "clear";
        // a texture and a depth on top of the surface
        if (solidInside && d.texture && d.texture !== "none") {
            const c = d.ink;
            const pat = d.texture === "stripes" ? k.pat(1.6, 1.6, '<rect width=".55" height="1.6" fill="' + c + '"/>', 45)
                : d.texture === "dots" ? k.pat(1.5, 1.5, '<circle cx=".75" cy=".75" r=".3" fill="' + c + '"/>', 0)
                : k.pat(1.6, 1.6, '<rect width="1.6" height=".18" fill="' + c + '"/><rect width=".18" height="1.6" fill="' + c + '"/>', 0);
            fillSvg += inside('<rect x="-4" y="-4" width="40" height="40" fill="url(#' + pat + ')" opacity=".26"/>');
        }
        if (solidInside && (d.depth === "raised" || d.depth === "sunken")) {
            const up = d.depth === "raised";
            const rim = (dx, dy, paint, a) => k.mask(sil("#fff", 0) + '<g transform="translate(' + f(dx) + " " + f(dy) + ')">' + sil("#000", 0) + '</g>',
                                                     '<g opacity="' + f(a) + '">' + sil(paint, 0) + '</g>');
            fillSvg += rim(0.65, 0.65, up ? "#fff" : "#000", up ? 0.5 : 0.4) + rim(-0.65, -0.65, up ? "#000" : "#fff", up ? 0.4 : 0.35);
        }

        // the line
        let lineUnder = "", lineOver = "";
        const Lc = {
            k: k, c: d.lineColor, w: d.lineWidth, box: b, cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, light: light, dark: dark,
            paint: d.lineColor,
            band: band, outside: outside, inside: inside,
            ring: (from, to, paint) => {
                // a line from the edge out goes under a solid fill, so no seam shows
                if (from <= 0 && !open) lineUnder += from < 0 ? band(from, to, paint) : sil(paint, to);
                else lineOver += band(from, to, paint);
            },
            over: (svg) => { lineOver += svg; },
            paths: (off) => P.map((p) => Geo.polygonOf(p)).filter((pg) => pg).map((pg) => Geo.offset(pg, r + off)),
            stroke: (pg, paint, w, extra) => '<path d="' + polyD(pg) + '" fill="none" stroke="' + paint + '" stroke-width="' + f(w)
                + '" stroke-linejoin="round"' + (extra || "") + '/>',
            walk: Geo.walk, displaced: Geo.displaced, wobble: Geo.wobble
        };
        if (d.lineFade && d.line !== "none") {
            const g = across(b, d.lineFadeDir, tip, tail, d.borderAngle);
            Lc.paint = "url(#" + k.lin(g[0], g[1], g[2], g[3], [[0, d.lineColor], [1, d.lineFadeTo]]) + ")";
        }
        if (line.traced) {
            // parts drawn as plain strokes have no outline to follow: a plain line for them
            const strokes = P.filter((p) => p.t === "stroke");
            if (strokes.length > 0) lineOver += k.mask(silhouette(strokes, "#fff", r + d.lineWidth) + silhouette(strokes, "#000", r),
                                                       silhouette(strokes, Lc.paint, r + d.lineWidth));
        }
        line.draw(Lc);

        const all = lower + lineUnder + fillSvg + lineOver;
        body += d.opacity < 1 ? '<g opacity="' + f(d.opacity) + '">' + all + '</g>' : all;
    });
    if (glyph.creases && d.surface !== "clear" && d.surface !== "shadow") body += silhouette(glyph.creases, d.ink, 0);
    body += detail(glyph, d) + ornament(glyph, d, k) + cap(glyph, d);

    // the shadow, in screen directions whatever the tilt
    let shadow = "";
    const SH = shadows.byKey[d.shadow] || shadows.byKey.none;
    if (SH.key !== "none" && d.shadowStrength > 0) {
        const color = d.shadowColor === "accent" ? d.acc : "#000";
        const outer = outerGrow(d);
        // a see-through cursor casts the shadow of its outline only
        const all = glyph.layers.map((l) => {
            const g = silhouette(l.pieces, color, outer);
            return !l.badge && open && d.surface !== "shadow"
                ? k.mask(silhouette(l.pieces, "#fff", outer) + silhouette(l.pieces, "#000", r), g) : g;
        }).join("");
        const around = d.shadowDir === "around" || d.shadowColor === "accent";
        let sbody = "";
        if (SH.long) for (let i = 1; i <= SH.long; i++) sbody += '<g transform="translate(' + f(i * 0.42) + " " + f(i * 0.42) + ')">' + frame(all) + '</g>';
        else sbody = '<g transform="translate(' + f(around ? 0 : SH.d * 0.3) + " " + f(around ? 0 : SH.d) + ')">' + frame(all) + '</g>';
        const blurSd = SH.blur > 0 ? SH.blur * (d.shadowColor === "accent" ? 1.4 : 1) : 0;
        const filter = blurSd > 0 ? ' filter="url(#' + k.blur(blurSd) + ')"' : "";
        shadow = '<g opacity="' + f(Math.min(1, SH.alpha * d.shadowStrength)) + '"' + filter + '>' + sbody + '</g>';
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">'
        + (k.defs ? "<defs>" + k.defs + "</defs>" : "") + shadow + frame(body) + '</svg>';
}

// ornaments: on the arrow (and the cursors built on it), or on every cursor
function ornament(glyph, d, k) {
    const O0 = Ornaments.byKey[d.ornament];
    if (!O0 || d.ornament === "none") return "";
    if (d.ornamentsOn !== "all" && !glyph.tip) return "";
    const layer = glyph.layers[0], b = layer.box;
    const pg = layer.pieces.length === 1 ? Geo.polygonOf(layer.pieces[0]) : null;
    const tip = glyph.tip || [b[0], b[1]], tail = tailOf(glyph, layer);
    const ax = tail[0] - tip[0], ay = tail[1] - tip[1], al = Math.hypot(ax, ay) || 1;
    let corners = [], sides = [];
    if (pg) {
        // the corners: the outline's sharp turns, the tip left out
        for (let i = 0; i < pg.length; i++) {
            const p = pg[i], a = pg[(i - 1 + pg.length) % pg.length], c = pg[(i + 1) % pg.length];
            const v1 = [a[0] - p[0], a[1] - p[1]], v2 = [c[0] - p[0], c[1] - p[1]];
            const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / ((Math.hypot(v1[0], v1[1]) || 1) * (Math.hypot(v2[0], v2[1]) || 1));
            if (cos > -0.75 && Math.hypot(p[0] - tip[0], p[1] - tip[1]) > 2) corners.push(p);
        }
        if (corners.length === 0) corners = [tail];
        corners = corners.slice(0, 6);
        const edges = [];
        for (let i = 0; i < pg.length; i++) {
            const a = pg[i], c = pg[(i + 1) % pg.length], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
            edges.push({ a: a, c: c, len: len });
        }
        edges.sort((x, y) => y.len - x.len);
        const sgn = Geo.area(pg) > 0 ? 1 : -1;
        sides = edges.slice(0, 2).map((e) => {
            const tx = (e.c[0] - e.a[0]) / (e.len || 1), ty = (e.c[1] - e.a[1]) / (e.len || 1);
            return { x: (e.a[0] + e.c[0]) / 2, y: (e.a[1] + e.c[1]) / 2, tx: tx, ty: ty, nx: sgn * ty, ny: -sgn * tx };
        });
    } else {
        corners = [[b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
        sides = [{ x: (b[0] + b[2]) / 2, y: b[1], tx: 1, ty: 0, nx: 0, ny: -1 }, { x: (b[0] + b[2]) / 2, y: b[3], tx: 1, ty: 0, nx: 0, ny: 1 }];
    }
    const sil = (paint, grow) => silhouette(layer.pieces, paint, d.round + grow);
    const O = {
        corners: corners, sides: sides, tip: tip, tail: tail, axis: [ax / al, ay / al], box: b, cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2,
        s: d.ornamentSize, c: d.c2, c2: d.lineColor, light: light, dark: dark,
        inner: pg ? Geo.offset(pg, d.round - 1.1) : null,
        stroke: (poly, paint, w, extra) => '<path d="' + polyD(poly) + '" fill="none" stroke="' + paint + '" stroke-width="' + f(w) + '" stroke-linejoin="round"' + (extra || "") + '/>',
        inside: (inner) => k.mask(sil("#fff", 0), inner)
    };
    return O0.draw(O);
}

// an accent cap at the tip, the tail, or both
function cap(g, d) {
    if (!g.tip || !d.cap || d.cap === "none") return "";
    const layer = g.layers[0], tail = tailOf(g, layer), u = g.inward;
    let out = "";
    if (d.cap === "tip" || d.cap === "both") {
        const p = [g.tip[0] + u[0] * 1.6, g.tip[1] + u[1] * 1.6];
        out += '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="1.25" fill="' + d.acc + '"/>';
    }
    if (d.cap === "tail" || d.cap === "both") out += '<circle cx="' + f(tail[0]) + '" cy="' + f(tail[1]) + '" r="1.35" fill="' + d.acc + '"/>';
    return out;
}

function detail(g, d) {
    if (!g.tip || d.detail === "none") return "";
    const t = g.tip, u = g.inward;
    const at = (k) => [t[0] + u[0] * k, t[1] + u[1] * k];
    if (d.detail === "tip") {
        const p = at(3.1);
        return '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="1.3" fill="' + d.c2 + '"/>';
    }
    if (d.detail === "spine") {
        const a = at(3.4), b = at(11);
        return '<path d="M' + f(a[0]) + " " + f(a[1]) + " L" + f(b[0]) + " " + f(b[1]) + '" stroke="' + d.ink
            + '" stroke-width=".8" stroke-linecap="round" opacity=".7"/>';
    }
    if (d.detail === "spark") {
        const c = at(7.2), s = 2.3, k = 0.55;
        const pts = [[0, -s], [k, -k], [s, 0], [k, k], [0, s], [-k, k], [-s, 0], [-k, -k]].map((q) => [c[0] + q[0], c[1] + q[1]]);
        return '<path d="' + polyD(pts) + '" fill="#fff" opacity=".9"/>';
    }
    return "";
}

// where the click lands, 0..1 across the cursor: on the very tip of the arrow as drawn,
// rounding and outline included
function hotspot(glyph, d) {
    let h = glyph.hot;
    if (glyph.tip) {
        const g = outerGrow(d) * 0.75;
        h = [h[0] - glyph.inward[0] * g, h[1] - glyph.inward[1] * g];
    }
    const c = (v) => Math.max(0, Math.min(1, v / SIZE));
    return [c(h[0]), c(h[1])];
}

// one cursor by its folder name ("left_ptr", "hand2", ...), and its picture
function glyphFor(dir, d, frameNo) {
    const S = Glyphs.shapeByDir[dir] || Glyphs.shapes[0];
    return S.make(d, frameNo || 0, FRAMES);
}
function svgFor(dir, d, frameNo) { return render(glyphFor(dir, d, frameNo), d); }

// ---- the theme ----------------------------------------------------------------------------------
// { manifest, index, shapes: [{ dir, files: [{ name, text }] }] }, each shape's files
// being its meta.hl and its pictures. `name` is the theme's folder and name; `inherits`
// the XCursor theme for programs that only know XCursor.

var NAME_RE = /^plume-[a-z]$/;

function theme(d, name, inherits) {
    if (!NAME_RE.test(name)) return null;
    const base = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/.test(inherits || "") ? inherits : "default";
    const out = {
        manifest: "name = " + name + "\ndescription = A cursor made in Plume\nversion = 1\ncursors_directory = hyprcursors\n",
        index: "[Icon Theme]\nName=" + name + "\nComment=A cursor made in Plume\nInherits=" + base + "\n",
        shapes: []
    };
    for (const S of Glyphs.shapes) {
        const g0 = S.make(d, 0, FRAMES);
        const hot = hotspot(g0, d);
        const files = [];
        let meta = "resize_algorithm = bilinear\nhotspot_x = " + f(hot[0]) + "\nhotspot_y = " + f(hot[1]) + "\nnominal_size = 1.0\n";
        for (const o of S.names) meta += "define_override = " + o + "\n";
        if (S.frames) {
            for (let k = 0; k < FRAMES; k++) {
                const file = S.dir + "-" + ("0" + (k + 1)).slice(-2) + ".svg";
                files.push({ name: file, text: render(S.make(d, k, FRAMES), d) });
                meta += "define_size = 0, " + file + ", " + d.delay + "\n";
            }
        } else {
            files.push({ name: S.dir + ".svg", text: render(g0, d) });
            meta += "define_size = 0, " + S.dir + ".svg\n";
        }
        files.unshift({ name: "meta.hl", text: meta });
        out.shapes.push({ dir: S.dir, files: files });
    }
    return out;
}

// a short fingerprint of a design, to know when the theme needs building again
function key(d) {
    const s = JSON.stringify(d);
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
}
