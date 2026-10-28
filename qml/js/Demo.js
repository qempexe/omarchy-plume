.pragma library
.import "Paint.js" as Paint

// The pictures in the settings: a pointer sweeping across a small box, with the
// effects drawn the way the given values would draw them. Sizes are scaled to the
// box, and particles are run for a moment first so the picture isn't empty.

// a pointer gliding in a curve, newest first; phase moves it along for the live preview
function path(w, h, phase, n) {
    const out = [];
    const count = n || 26;
    for (let i = 0; i < count; i++) {
        const u = i / (count - 1);
        out.push({ x: w * (0.78 - 0.62 * u) + Math.cos(phase * 6.283) * w * 0.06,
                   y: h * (0.5 + 0.26 * Math.sin(u * Math.PI * 1.7 + phase * 6.283)), t: u });
    }
    return out;
}

// a context that draws nothing, for running the particles ahead
var quiet = {
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, stroke() {}, fill() {},
    quadraticCurveTo() {}, fillRect() {}, translate() {}, rotate() {}, scale() {}, reset() {},
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; }
};

// where the pointer is in the picture, and how big it is drawn
function head(w, h, phase) { return path(w, h, phase, 2)[0]; }
function pointerSize(h) { return Math.max(7, Math.min(14, h * 0.2)); }

// v: every setting (as Schema.resolve gives them); k: how much smaller than on screen;
// bare: leave the pointer out (the picture's owner shows the real cursor there)
function draw(ctx, v, colors, w, h, phase, k, mem, time, bare) {
    const cfg = Object.assign({}, v, {
        trailSize: Math.max(1.5, v.trailSize * k), haloSize: Math.max(8, v.haloSize * k), findSize: Math.max(8, v.findSize * k)
    });
    const pts = path(w, h, phase);
    const s = { cfg, pts, x: pts[0].x, y: pts[0].y, here: true, w, h, colors,
                time: time || 2.4, dt: 1 / 30, moved: 9, speed: 0.55,
                // a halo that waits for the pointer to rest is shown as it looks then
                still: v.haloShow === "still" ? 2 : 0, findAge: 99, mem: mem || {} };
    if (!mem) for (let i = 0; i < 24; i++) Paint.frame(quiet, s);
    Paint.frame(ctx, s);
    if (!bare) pointer(ctx, pts[0].x, pts[0].y, pointerSize(h));
}

// a small arrow, so the picture reads as a pointer
function pointer(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(s * 0.28, s * 0.74);
    ctx.lineTo(s * 0.52, s * 1.12);
    ctx.lineTo(s * 0.66, s * 1.05);
    ctx.lineTo(s * 0.44, s * 0.68);
    ctx.lineTo(s * 0.78, s * 0.68);
    ctx.closePath();
    ctx.fillStyle = "rgba(245,245,245,0.95)";
    ctx.strokeStyle = "rgba(10,10,10,0.9)";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}
