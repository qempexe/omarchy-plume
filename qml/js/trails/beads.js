.pragma library

// Round beads spaced evenly along the path, shrinking and fading toward the end.
var trail = {
    key: "beads",
    label: "Beads",
    about: "Evenly spaced dots along the path, shrinking toward the end.",
    draw(g) {
        const p = g.pts, ctx = g.ctx;
        if (p.length < 2) return;
        const gap = Math.max(4, g.size * 1.6);
        let carry = 0;
        for (let i = 0; i < p.length - 1; i++) {
            const a = p[i], b = p[i + 1];
            const dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy);
            let d = carry === 0 && i === 0 ? 0 : gap - carry;
            while (d <= len) {
                const f = len > 0 ? d / len : 0, t = a.t + (b.t - a.t) * f, k = 1 - t;
                ctx.fillStyle = g.color(t, k * g.strength);
                ctx.beginPath();
                ctx.arc(a.x + dx * f, a.y + dy * f, Math.max(0.6, g.size * 0.5 * (0.3 + 0.7 * k)), 0, Math.PI * 2);
                ctx.fill();
                d += gap;
            }
            carry = (carry + len) % gap;
        }
    }
};
