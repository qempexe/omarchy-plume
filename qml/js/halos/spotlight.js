.pragma library

// Dims the whole screen except a soft circle around the pointer.
var halo = {
    key: "spotlight",
    label: "Spotlight",
    about: "Dims the screen except a soft circle around the pointer. Best with Show set to When still.",
    full: true,
    draw(g) {
        const ctx = g.ctx, r = g.size * 1.4;
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0," + (0.6 * g.strength).toFixed(3) + ")";
        ctx.fillRect(0, 0, g.w, g.h);
        ctx.globalCompositeOperation = "destination-out";
        const grad = ctx.createRadialGradient(g.x, g.y, r * 0.55, g.x, g.y, r);
        grad.addColorStop(0, "rgba(0,0,0,1)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = g.color(0, 0.35 * g.strength);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(g.x, g.y, r * 0.78, 0, Math.PI * 2);
        ctx.stroke();
    }
};
