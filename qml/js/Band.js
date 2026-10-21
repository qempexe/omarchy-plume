.pragma library

// A band through the trail's points, as one strip of four-sided pieces that meet
// edge to edge. Strokes with round ends overlap at every point, and where they
// overlap a see-through color adds up into a ring; pieces that only touch never do.
// The pieces are added together ("lighter"), so the soft edges two neighbours share
// add back up to the full color instead of leaving a faint seam between them.
//
//   band(ctx, pts, width(t), color(t)): pts newest first ({ x, y, t }); the newest end
//   gets a round cap, the other end tapers as width(t) says

function band(ctx, pts, widthAt, colorAt) {
    const n = pts.length;
    if (n < 2) return;
    // a side direction at every point, from its neighbours, so pieces share their edges
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        let dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-6) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
        const h = Math.max(0.25, widthAt(pts[i].t)) / 2;
        L.push([pts[i].x - dy * h, pts[i].y + dx * h]);
        R.push([pts[i].x + dy * h, pts[i].y - dx * h]);
    }
    const mode = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    for (let i = n - 2; i >= 0; i--) {
        ctx.fillStyle = colorAt((pts[i].t + pts[i + 1].t) / 2);
        ctx.beginPath();
        ctx.moveTo(L[i][0], L[i][1]);
        ctx.lineTo(L[i + 1][0], L[i + 1][1]);
        ctx.lineTo(R[i + 1][0], R[i + 1][1]);
        ctx.lineTo(R[i][0], R[i][1]);
        ctx.closePath();
        ctx.fill();
    }
    // the round cap at the newest end: only the half that sticks out
    const p = pts[0], q = pts[1];
    const r = Math.max(0.25, widthAt(p.t)) / 2;
    const a = Math.atan2(L[0][1] - p.y, L[0][0] - p.x);
    const fx = p.x - q.x, fy = p.y - q.y;
    // from the left side round to the right, through the front
    const front = Math.cos(a - Math.PI / 2) * fx + Math.sin(a - Math.PI / 2) * fy;
    ctx.fillStyle = colorAt(p.t);
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    ctx.arc(p.x, p.y, r, a, a + Math.PI, front > 0 ? true : false);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = mode;
}
