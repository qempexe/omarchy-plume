.pragma library

// A drop: a round body that runs to a point.
function drop() {
    const cy = 12.5, r = 7;
    // the sides leave the tip and touch the circle where they meet it at a right angle
    const a = Math.acos(r / cy);
    const from = -Math.PI / 2 + a, to = 3 * Math.PI / 2 - a;
    const out = [[0, 0]];
    const steps = 22;
    for (let i = 0; i <= steps; i++) {
        const t = from + (to - from) * i / steps;
        out.push([r * Math.cos(t), cy + r * Math.sin(t)]);
    }
    return out;
}

var arrow = {
    key: "teardrop",
    label: "Teardrop",
    about: "A round drop that runs to a point.",
    upright: true,
    points: drop()
};
