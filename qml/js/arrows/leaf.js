.pragma library

// A leaf, pointed at both ends and widest past the middle.
function outline() {
    const out = [[0, 0]];
    for (let i = 1; i < 16; i++) { const t = i / 16; out.push([5.6 * Math.pow(Math.sin(Math.PI * t), 0.85) * (0.85 + 0.3 * t), 20 * t]); }
    out.push([0, 20]);
    for (let i = 15; i > 0; i--) { const t = i / 16; out.push([-5.6 * Math.pow(Math.sin(Math.PI * t), 0.85) * (0.85 + 0.3 * t), 20 * t]); }
    return out;
}

var arrow = {
    key: "leaf",
    label: "Leaf",
    about: "A leaf, pointed at both ends.",
    upright: true,
    points: outline()
};
