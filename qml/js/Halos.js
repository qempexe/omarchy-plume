.pragma library
.import "halos/none.js" as None
.import "halos/glow.js" as Glow
.import "halos/ring.js" as Ring
.import "halos/pulse.js" as Pulse
.import "halos/spotlight.js" as Spotlight
.import "halos/crosshair.js" as Crosshair
.import "halos/target.js" as Target

// Every halo, in the order the settings show them. Each one lives in its own file
// under halos/ (see CONTRIBUTING.md).
//
// A halo is { key, label, about, full?, draw(g) }. draw() paints around the pointer:
//   g.x, g.y   the pointer; g.w, g.h the screen
//   g.size     how big the settings ask for; g.strength 0..1 how solid
//   g.time     seconds, for anything that moves on its own
//   g.color(t, alpha)  the color, t 0 at the pointer .. 1 farther out
// full: true when it reaches across the whole screen (the spotlight, the crosshair).
// A halo that animates on its own sets g.busy = true.

var list = [None.halo, Glow.halo, Ring.halo, Pulse.halo, Spotlight.halo, Crosshair.halo, Target.halo];

var byKey = {};
var keys = [];
var labels = {};
var abouts = {};
for (let i = 0; i < list.length; i++) {
    byKey[list[i].key] = list[i];
    keys.push(list[i].key);
    labels[list[i].key] = list[i].label;
    abouts[list[i].key] = list[i].about;
}
