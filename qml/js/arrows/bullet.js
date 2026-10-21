.pragma library

// A pointed nose on a straight body with a flat base.
function outline() {
    const out = [[0, 0]];
    for (let i = 1; i <= 8; i++) { const t = i / 8; out.push([3.6 * Math.sin(t * Math.PI / 2), 9 * t]); }
    out.push([3.6, 19], [-3.6, 19]);
    for (let i = 8; i >= 1; i--) { const t = i / 8; out.push([-3.6 * Math.sin(t * Math.PI / 2), 9 * t]); }
    return out;
}

var arrow = {
    key: "bullet",
    label: "Bullet",
    about: "A pointed nose on a straight body.",
    upright: true,
    points: outline()
};
