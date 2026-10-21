.pragma library

// Four corner brackets around the pointer, turning slowly.
var halo = {
    key: "target",
    label: "Target",
    about: "Four corner brackets around the pointer, turning slowly.",
    draw(g) {
        const ctx = g.ctx, r = g.size * 0.5, arm = r * 0.45;
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.time * 0.6);
        ctx.strokeStyle = g.color(0, 0.9 * g.strength);
        ctx.lineWidth = Math.max(1.5, g.size * 0.05);
        ctx.lineCap = "round";
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(r - arm, -r);
            ctx.lineTo(r, -r);
            ctx.lineTo(r, -r + arm);
            ctx.stroke();
        }
        ctx.restore();
        g.busy = true;
    }
};
