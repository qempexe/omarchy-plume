.pragma library
.import "../Band.js" as Band

// A tail that tapers from the pointer to nothing, brightest at its head.
var trail = {
    key: "comet",
    label: "Comet",
    about: "A tail that tapers away behind the pointer, brightest at its head.",
    draw(g) {
        const p = g.pts;
        if (p.length < 2) return;
        Band.band(g.ctx, p, (t) => g.size * (0.15 + 0.85 * (1 - t)), (t) => g.color(t, Math.pow(1 - t, 1.3) * g.strength));
    }
};
