.pragma library

// A soft light around the pointer.
var halo = {
    key: "glow",
    label: "Glow",
    about: "A soft light around the pointer.",
    draw(g) {
        const ctx = g.ctx, r = g.size;
        const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
        grad.addColorStop(0, g.color(0, 0.55 * g.strength));
        grad.addColorStop(0.45, g.color(0.3, 0.22 * g.strength));
        grad.addColorStop(1, g.color(0.6, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
        ctx.fill();
    }
};
