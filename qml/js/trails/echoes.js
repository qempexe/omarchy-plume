.pragma library

// Rings left behind along the path, widening as they fade.
var trail = {
    key: "echoes",
    label: "Echoes",
    about: "Rings left along the path, widening as they fade.",
    draw(g) {
        const p = g.pts, ctx = g.ctx;
        if (p.length < 2) return;
        const gap = Math.max(10, g.size * 2.5);
        let last = null;
        ctx.lineWidth = Math.max(1, g.size * 0.14);
        for (let i = 0; i < p.length; i++) {
            const q = p[i];
            if (last && Math.hypot(q.x - last.x, q.y - last.y) < gap) continue;
            last = q;
            const k = 1 - q.t;
            ctx.strokeStyle = g.color(q.t, k * g.strength);
            ctx.beginPath();
            ctx.arc(q.x, q.y, g.size * (0.4 + q.t * 1.4), 0, Math.PI * 2);
            ctx.stroke();
        }
    }
};
