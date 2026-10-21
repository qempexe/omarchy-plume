.pragma library

// Bubbles let go along the path, drifting up and swaying as they rise.
var MAX = 90;

var trail = {
    key: "bubbles",
    label: "Bubbles",
    about: "Bubbles let go along the path, swaying as they float up.",
    draw(g) {
        const m = g.mem, ctx = g.ctx;
        if (!m.bubbles) m.bubbles = [];
        const list = m.bubbles, p = g.pts;
        m.dist = (m.dist || 0) + g.moved;
        const gap = Math.max(8, g.size * 2);
        while (p.length > 0 && m.dist >= gap && list.length < MAX) {
            m.dist -= gap;
            list.push({ x: p[0].x + (Math.random() - 0.5) * g.size, y: p[0].y, age: 0,
                        life: g.life * (0.7 + Math.random() * 0.6), r: g.size * (0.25 + Math.random() * 0.45),
                        phase: Math.random() * 6.28 });
        }
        if (m.dist > gap * 4) m.dist = 0;
        const dt = Math.min(0.1, g.dt);
        ctx.lineWidth = Math.max(0.8, g.size * 0.1);
        for (let i = list.length - 1; i >= 0; i--) {
            const b = list[i];
            b.age += dt;
            if (b.age >= b.life) { list.splice(i, 1); continue; }
            const t = b.age / b.life;
            b.y -= 28 * dt;
            const x = b.x + Math.sin(b.phase + b.age * 4) * g.size * 0.35;
            const r = b.r * (1 + t * 0.8);
            ctx.strokeStyle = g.color(t, (1 - t) * g.strength);
            ctx.beginPath();
            ctx.arc(x, b.y, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = g.color(t, (1 - t) * g.strength * 0.5);
            ctx.beginPath();
            ctx.arc(x - r * 0.35, b.y - r * 0.35, Math.max(0.6, r * 0.18), 0, Math.PI * 2);
            ctx.fill();
        }
        g.busy = list.length > 0;
    }
};
