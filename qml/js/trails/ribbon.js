.pragma library

// A smooth, even band through the path, with a soft glow around it.
var trail = {
    key: "ribbon",
    label: "Ribbon",
    about: "A smooth glowing band that follows every curve.",
    draw(g) {
        const p = g.pts, ctx = g.ctx;
        if (p.length < 3) return;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        // two passes: a wide faint band for the glow, then the band itself
        for (const pass of [{ w: 2.2, a: 0.22 }, { w: 0.8, a: 1 }]) {
            ctx.lineWidth = Math.max(1, g.size * pass.w);
            for (let i = p.length - 2; i > 0; i--) {
                const t = p[i].t, k = 1 - t;
                ctx.strokeStyle = g.color(t, k * g.strength * pass.a);
                // halfway points make the corners round: a quadratic curve through each sample
                const ax = (p[i + 1].x + p[i].x) / 2, ay = (p[i + 1].y + p[i].y) / 2;
                const bx = (p[i].x + p[i - 1].x) / 2, by = (p[i].y + p[i - 1].y) / 2;
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.quadraticCurveTo(p[i].x, p[i].y, bx, by);
                ctx.stroke();
            }
        }
    }
};
