.pragma library
.import "../Band.js" as Band

// A smooth, even band through the path, with a soft glow around it.
var trail = {
    key: "ribbon",
    label: "Ribbon",
    about: "A smooth glowing band that follows every curve.",
    draw(g) {
        const p = g.pts;
        if (p.length < 3) return;
        // two passes: a wide faint band for the glow, then the band itself
        for (const pass of [{ w: 2.2, a: 0.22 }, { w: 0.8, a: 1 }])
            Band.band(g.ctx, p, (t) => Math.max(1, g.size * pass.w), (t) => g.color(t, (1 - t) * g.strength * pass.a));
    }
};
