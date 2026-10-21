.pragma library

// The "here I am" burst after a shake (or `find` from the command line): rings
// rushing out of the pointer, and the halo grown for a moment.
var LENGTH = 1.4;      // seconds

function draw(g, age) {
    if (age < 0 || age >= LENGTH) return false;
    const ctx = g.ctx;
    for (let i = 0; i < 3; i++) {
        const t = (age - i * 0.16) / (LENGTH - 0.32);
        if (t <= 0 || t >= 1) continue;
        const r = g.size * (0.4 + t * 3.2);
        ctx.strokeStyle = g.color(t, (1 - t) * 0.95);
        ctx.lineWidth = Math.max(2, g.size * 0.12 * (1 - t));
        ctx.beginPath();
        ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    const f = Math.max(0, 1 - age / 0.5);
    if (f > 0) {
        const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.size * 1.6);
        grad.addColorStop(0, g.color(0, 0.6 * f));
        grad.addColorStop(1, g.color(0.5, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.size * 1.6, 0, Math.PI * 2);
        ctx.fill();
    }
    return true;
}
