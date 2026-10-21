.pragma library

// A thin ring with a faint fill, like a touch indicator.
var halo = {
    key: "ring",
    label: "Ring",
    about: "A thin ring with a faint fill, like a touch indicator.",
    draw(g) {
        const ctx = g.ctx, r = g.size * 0.5;
        ctx.fillStyle = g.color(0, 0.12 * g.strength);
        ctx.beginPath();
        ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = g.color(0, 0.9 * g.strength);
        ctx.lineWidth = Math.max(1.2, g.size * 0.05);
        ctx.stroke();
    }
};
