.pragma library

// A tail that tapers from the pointer to nothing, brightest at its head.
var trail = {
    key: "comet",
    label: "Comet",
    about: "A tail that tapers away behind the pointer, brightest at its head.",
    draw(g) {
        const p = g.pts, ctx = g.ctx;
        if (p.length < 2) return;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let i = p.length - 1; i > 0; i--) {
            const t = p[i].t, k = 1 - t;
            ctx.strokeStyle = g.color(t, Math.pow(k, 1.3) * g.strength);
            ctx.lineWidth = Math.max(0.5, g.size * (0.15 + 0.85 * k));
            ctx.beginPath();
            ctx.moveTo(p[i].x, p[i].y);
            ctx.lineTo(p[i - 1].x, p[i - 1].y);
            ctx.stroke();
        }
        ctx.fillStyle = g.color(0, g.strength);
        ctx.beginPath();
        ctx.arc(p[0].x, p[0].y, g.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
    }
};
