.pragma library
.import "Trails.js" as Trails
.import "Halos.js" as Halos
.import "Colors.js" as Colors
.import "Find.js" as Find
.import "Ink.js" as Ink

// One frame of the effects: the trail, the halo and the find burst, painted into a
// canvas. Used by the layer on every screen and by the pictures in the settings.
//   s = { cfg, pts, x, y, here (the pointer is on this screen), w, h, colors, time,
//         dt, moved, speed, still (seconds), findAge (seconds), mem }
// Returns true while something keeps moving on its own.

function haloAlpha(show, still) {
    if (show === "moving") return Math.max(0, Math.min(1, 1 - (still - 0.15) / 0.4));
    if (show === "still") return Math.max(0, Math.min(1, (still - 0.6) / 0.4));
    return 1;
}

function frame(ctx, s) {
    const cfg = s.cfg;
    const c = Object.assign({}, s.colors, { speed: s.speed, time: s.time });
    const color = (t, a) => Ink.css(Colors.at(cfg.colorMode, t, c), a);
    let busy = false;

    const trail = Trails.byKey[cfg.trail] || Trails.byKey.none;
    // a different trail starts from nothing (its particles belong to the old one)
    if (s.mem.trailKey !== trail.key) {
        for (const k in s.mem) delete s.mem[k];
        s.mem.trailKey = trail.key;
    }
    const tg = { ctx: ctx, pts: s.pts, size: cfg.trailSize, strength: cfg.trailStrength / 100, life: cfg.trailLife / 100,
                 dt: s.dt, moved: s.moved, mem: s.mem, time: s.time, color: color, busy: false };
    ctx.save();
    try { trail.draw(tg); } catch (e) { }
    ctx.restore();
    busy = busy || tg.busy;

    if (s.here) {
        const halo = Halos.byKey[cfg.halo] || Halos.byKey.none;
        const a = haloAlpha(cfg.haloShow, s.still);
        if (a > 0.01 && halo.key !== "none") {
            const hg = { ctx: ctx, x: s.x, y: s.y, w: s.w, h: s.h, size: cfg.haloSize, strength: a * cfg.haloStrength / 100,
                         time: s.time, color: color, busy: false };
            ctx.save();
            try { halo.draw(hg); } catch (e) { }
            ctx.restore();
            busy = busy || hg.busy;
        }
        if (cfg.haloShow !== "always" && a > 0.01 && a < 0.99) busy = true;
        const fg = { ctx: ctx, x: s.x, y: s.y, size: cfg.findSize, color: color };
        ctx.save();
        if (Find.draw(fg, s.findAge)) busy = true;
        ctx.restore();
    }
    return busy;
}
