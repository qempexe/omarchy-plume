.pragma library

// A breathing ring that sends out a wave every second or so.
var halo = {
    key: "pulse",
    label: "Pulse",
    about: "A breathing ring that sends out a wave now and then.",
    draw(g) {
        const ctx = g.ctx, base = g.size * 0.42;
        const breath = 1 + 0.08 * Math.sin(g.time * 3.2);
        ctx.lineWidth = Math.max(1.2, g.size * 0.045);
        ctx.strokeStyle = g.color(0, 0.85 * g.strength);
        ctx.beginPath();
        ctx.arc(g.x, g.y, base * breath, 0, Math.PI * 2);
        ctx.stroke();
        const w = (g.time % 1.4) / 1.4;
        ctx.strokeStyle = g.color(w, (1 - w) * 0.6 * g.strength);
        ctx.beginPath();
        ctx.arc(g.x, g.y, base * (1 + w * 1.2), 0, Math.PI * 2);
        ctx.stroke();
        g.busy = true;
    }
};
