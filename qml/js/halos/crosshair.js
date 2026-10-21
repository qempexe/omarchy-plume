.pragma library

// Thin lines across the whole screen through the pointer, fading away from it.
var halo = {
    key: "crosshair",
    label: "Crosshair",
    about: "Thin lines across the screen through the pointer, for lining things up.",
    full: true,
    draw(g) {
        const ctx = g.ctx, gap = g.size * 0.35, reach = Math.max(g.w, g.h);
        ctx.lineWidth = 1;
        const arm = (dx, dy) => {
            const grad = ctx.createLinearGradient(g.x + dx * gap, g.y + dy * gap, g.x + dx * reach, g.y + dy * reach);
            grad.addColorStop(0, g.color(0, 0.8 * g.strength));
            grad.addColorStop(0.35, g.color(0.5, 0.25 * g.strength));
            grad.addColorStop(1, g.color(1, 0));
            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(g.x + dx * gap, g.y + dy * gap);
            ctx.lineTo(g.x + dx * reach, g.y + dy * reach);
            ctx.stroke();
        };
        arm(1, 0); arm(-1, 0); arm(0, 1); arm(0, -1);
    }
};
