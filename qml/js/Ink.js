.pragma library

// Small color helpers shared by the color modes, the trails and the halos.
// Colors are [r, g, b] with 0..255 channels, or [r, g, b, a] with a in 0..1.

function hex(text) {
    const m = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(String(text || ""));
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
    const k = Math.max(0, Math.min(1, t));
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

// h 0..360, s and l 0..1
function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => {
        t = (t + 1) % 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

function hueOf(c) {
    const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d === 0) return 0;
    let h = mx === r ? ((g - b) / d) % 6 : (mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
    return (h * 60 + 360) % 360;
}

// a point along a list of colors, 0 = the first, 1 = the last
function along(list, t) {
    if (!list || list.length === 0) return null;
    if (list.length === 1) return list[0];
    const x = Math.max(0, Math.min(1, t)) * (list.length - 1), i = Math.min(list.length - 2, Math.floor(x));
    return mix(list[i], list[i + 1], x - i);
}

// "rgba(...)" for a canvas, with an extra alpha on top of the color's own
function css(c, alpha) {
    const a = (c.length > 3 ? c[3] : 1) * (alpha === undefined ? 1 : alpha);
    return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")";
}
