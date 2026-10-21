.pragma library

// A band through the trail's points, drawn so it reads as one smooth stroke:
//   * the path is smoothed into a curve, with points every few pixels
//   * it is cut into four-sided pieces that meet edge to edge and never overlap
//     (round-ended strokes overlap at every point, and see-through color adds up
//     into rings there); on the inside of a tight turn the edge waits instead of
//     folding back over itself
//   * each piece fades from the color at its start to the color at its end, so the
//     color and the fade run on without steps
//   * the pieces are added together ("lighter"), so the soft edges two neighbours
//     share add back up to the full color instead of leaving a faint seam
//
//   band(ctx, pts, width(t), color(t)): pts newest first ({ x, y, t }); the newest end
//   gets a round cap, the other end tapers as width(t) says

// a Catmull-Rom curve through the points, a point every `step` pixels or so
function smooth(pts, step) {
    const n = pts.length;
    if (n < 3) return pts;
    const out = [];
    for (let i = 0; i < n - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
        const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const k = Math.max(1, Math.min(6, Math.ceil(len / step)));
        for (let j = 0; j < k; j++) {
            const u = j / k, u2 = u * u, u3 = u2 * u;
            const c = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * u + (2 * a - 5 * b + 4 * cc - d) * u2 + (-a + 3 * b - 3 * cc + d) * u3);
            out.push({ x: c(p0.x, p1.x, p2.x, p3.x), y: c(p0.y, p1.y, p2.y, p3.y), t: p1.t + (p2.t - p1.t) * u });
        }
    }
    out.push(pts[n - 1]);
    return out;
}

function band(ctx, raw, widthAt, colorAt) {
    const pts = smooth(raw, 4);
    const n = pts.length;
    if (n < 2) return;
    // the two edges, from a side direction at every point
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        let dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-6) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
        const h = Math.max(0.25, widthAt(pts[i].t)) / 2;
        let l = [pts[i].x - dy * h, pts[i].y + dx * h], r = [pts[i].x + dy * h, pts[i].y - dx * h];
        // on the inside of a tight turn an edge would run backwards: hold it still
        if (i > 0) {
            const fx = pts[i].x - pts[i - 1].x, fy = pts[i].y - pts[i - 1].y;
            if ((l[0] - L[i - 1][0]) * fx + (l[1] - L[i - 1][1]) * fy < 0) l = L[i - 1];
            if ((r[0] - R[i - 1][0]) * fx + (r[1] - R[i - 1][1]) * fy < 0) r = R[i - 1];
        }
        L.push(l);
        R.push(r);
    }
    const mode = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    let cA = colorAt(pts[n - 1].t);
    for (let i = n - 2; i >= 0; i--) {
        const p = pts[i], q = pts[i + 1], cB = colorAt(p.t);
        if (Math.abs(p.x - q.x) + Math.abs(p.y - q.y) > 0.01) {
            const g = ctx.createLinearGradient(q.x, q.y, p.x, p.y);
            g.addColorStop(0, cA);
            g.addColorStop(1, cB);
            ctx.fillStyle = g;
        } else {
            ctx.fillStyle = cB;
        }
        ctx.beginPath();
        ctx.moveTo(L[i][0], L[i][1]);
        ctx.lineTo(L[i + 1][0], L[i + 1][1]);
        ctx.lineTo(R[i + 1][0], R[i + 1][1]);
        ctx.lineTo(R[i][0], R[i][1]);
        ctx.closePath();
        ctx.fill();
        cA = cB;
    }
    // the round cap at the newest end: only the half that sticks out
    const p = pts[0], q = pts[1];
    const r = Math.max(0.25, widthAt(p.t)) / 2;
    const a = Math.atan2(L[0][1] - p.y, L[0][0] - p.x);
    const fx = p.x - q.x, fy = p.y - q.y;
    const front = Math.cos(a - Math.PI / 2) * fx + Math.sin(a - Math.PI / 2) * fy;
    ctx.fillStyle = colorAt(p.t);
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    ctx.arc(p.x, p.y, r, a, a + Math.PI, front > 0 ? true : false);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = mode;
}
