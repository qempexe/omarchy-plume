.pragma library

// Sparks thrown off the pointer as it moves, falling and burning out.
var MAX = 180;

var trail = {
    key: "sparks",
    label: "Sparks",
    about: "Sparks fly off the pointer as it moves, then fall and burn out.",
    draw(g) {
        const m = g.mem, ctx = g.ctx;
        if (!m.parts) m.parts = [];
        const parts = m.parts, p = g.pts;
        // new sparks: a few for every bit of distance travelled since the last frame
        if (p.length > 1 && g.moved > 0.5) {
            const n = Math.min(16, Math.ceil(g.moved / Math.max(4, 18 - g.size)));
            for (let i = 0; i < n && parts.length < MAX; i++) {
                const ang = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 90;
                parts.push({ x: p[0].x, y: p[0].y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 30,
                             age: 0, life: g.life * (0.35 + Math.random() * 0.5) });
            }
        }
        const dt = Math.min(0.1, g.dt);
        ctx.lineCap = "round";
        for (let i = parts.length - 1; i >= 0; i--) {
            const s = parts[i];
            s.age += dt;
            if (s.age >= s.life) { parts.splice(i, 1); continue; }
            s.vy += 160 * dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            const t = s.age / s.life;
            ctx.strokeStyle = g.color(t, (1 - t) * g.strength);
            ctx.lineWidth = Math.max(1, g.size * 0.26 * (1 - t * 0.6));
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x - s.vx * 0.045, s.y - s.vy * 0.045);
            ctx.stroke();
        }
        g.busy = parts.length > 0;
    }
};
