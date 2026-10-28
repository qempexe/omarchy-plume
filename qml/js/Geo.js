.pragma library

// Outlines of a cursor's pieces as polygons, grown or shrunk, and walked along, so the
// fancy lines (dashes, beads, waves...) and the inset ones follow the real edge.
// Pieces drawn as plain strokes (the text beam, a ring) have no polygon; they get a
// plain line instead.

function area(p) {
    let a = 0;
    for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; }
    return a / 2;
}

function rot(pt, deg, cx, cy) {
    if (!deg) return pt;
    const a = deg * Math.PI / 180, s = Math.sin(a), c = Math.cos(a), x = pt[0] - cx, y = pt[1] - cy;
    return [cx + x * c - y * s, cy + x * s + y * c];
}

// the polygon of one piece, or null
function polygonOf(p) {
    if (p.t === "poly") return p.p;
    if (p.t === "circle") {
        const out = [];
        for (let i = 0; i < 28; i++) { const a = 2 * Math.PI * i / 28; out.push([p.cx + p.r * Math.cos(a), p.cy + p.r * Math.sin(a)]); }
        return out;
    }
    if (p.t === "rect") {
        const r = Math.max(0, Math.min(p.r || 0, p.w / 2, p.h / 2)), out = [];
        const corners = [[p.x + p.w - r, p.y + r, -90], [p.x + p.w - r, p.y + p.h - r, 0], [p.x + r, p.y + p.h - r, 90], [p.x + r, p.y + r, 180]];
        for (const c of corners) for (let k = 0; k <= 4; k++) {
            const a = (c[2] + 90 * k / 4) * Math.PI / 180;
            out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
        }
        const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
        return p.rot ? out.map((q) => rot(q, p.rot, cx, cy)) : out;
    }
    return null;
}

// grown outwards by d (shrunk when d < 0): round on the corners that stick out,
// sharp in the ones that go in
function offset(poly, d) {
    if (!poly || poly.length < 3 || Math.abs(d) < 1e-6) return poly;
    const n = poly.length, sgn = area(poly) > 0 ? 1 : -1, out = [];
    const normal = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [sgn * dy / l, -sgn * dx / l]; };
    for (let i = 0; i < n; i++) {
        const p = poly[i], a = poly[(i - 1 + n) % n], b = poly[(i + 1) % n];
        const n1 = normal(a, p), n2 = normal(p, b);
        const turn = (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]);
        const sticksOut = (turn * sgn > 0) === (d > 0);
        if (sticksOut) {
            let a1 = Math.atan2(n1[1], n1[0]), a2 = Math.atan2(n2[1], n2[0]);
            let da = a2 - a1;
            while (da > Math.PI) da -= 2 * Math.PI;
            while (da < -Math.PI) da += 2 * Math.PI;
            const steps = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 8)));
            const k = Math.abs(d);
            for (let s = 0; s <= steps; s++) {
                const t = a1 + da * s / steps;
                out.push([p[0] + Math.sign(d) * k * Math.cos(t), p[1] + Math.sign(d) * k * Math.sin(t)]);
            }
        } else {
            // the corner where the two moved edges meet, kept from running off
            const dot = n1[0] * n2[0] + n1[1] * n2[1];
            const nx = n1[0] + n2[0], ny = n1[1] + n2[1], l = Math.hypot(nx, ny);
            if (l < 1e-3) { out.push([p[0] + n1[0] * d, p[1] + n1[1] * d]); continue; }
            const len = d * Math.min(3, Math.sqrt(2 / Math.max(0.02, 1 + dot)));
            out.push([p[0] + nx / l * len, p[1] + ny / l * len]);
        }
    }
    return out;
}

function f(v) { return String(Math.round(v * 1000) / 1000); }
function pathD(poly, open) {
    if (!poly || poly.length === 0) return "";
    return "M" + poly.map((q) => f(q[0]) + " " + f(q[1])).join(" L") + (open ? "" : " Z");
}

function perimeter(poly) {
    let s = 0;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += Math.hypot(b[0] - a[0], b[1] - a[1]); }
    return s;
}

// points every `step` along the closed polygon: { x, y, tx, ty, nx, ny, s } with the
// tangent and the outward normal; `count` is set when the step is evened out to fit
function walk(poly, step) {
    const out = [];
    if (!poly || poly.length < 3) return out;
    const per = perimeter(poly), n = Math.max(3, Math.round(per / step)), st = per / n;
    const sgn = area(poly) > 0 ? 1 : -1;
    let i = 0, along = 0, segLen = 0;
    const seg = (k) => { const a = poly[k % poly.length], b = poly[(k + 1) % poly.length]; return [a, b, Math.hypot(b[0] - a[0], b[1] - a[1])]; };
    let [a, b, len] = seg(0);
    for (let k = 0; k < n; k++) {
        const target = k * st;
        while (along + len < target && i < poly.length * 2) { along += len; i++; [a, b, len] = seg(i); }
        const t = len > 0 ? (target - along) / len : 0;
        const tx = len > 0 ? (b[0] - a[0]) / len : 1, ty = len > 0 ? (b[1] - a[1]) / len : 0;
        out.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, tx, ty, nx: sgn * ty, ny: -sgn * tx, s: target });
    }
    return out;
}

// the polygon moved along its normals by fn(s), for waves, zigzags and hand drawn lines
function displaced(poly, step, fn) {
    return walk(poly, step).map((p) => { const d = fn(p.s); return [p.x + p.nx * d, p.y + p.ny * d]; });
}

// a repeatable wobble, the same every time for the same seed
function wobble(seed) {
    const a = 1.7 + (seed * 0.37) % 1, b = 3.1 + (seed * 0.61) % 1, c = 0.9 + (seed * 0.13) % 1;
    return (s) => 0.5 * Math.sin(s * a + seed) + 0.3 * Math.sin(s * b + seed * 2) + 0.2 * Math.sin(s * c + seed * 3);
}

// a repeatable random number generator
function rng(seed) {
    let x = (seed * 2654435761) >>> 0 || 1;
    return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}
