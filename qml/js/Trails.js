.pragma library
.import "trails/none.js" as None
.import "trails/comet.js" as Comet
.import "trails/beads.js" as Beads
.import "trails/ribbon.js" as Ribbon
.import "trails/sparks.js" as Sparks
.import "trails/echoes.js" as Echoes
.import "trails/bubbles.js" as Bubbles

// Every trail, in the order the settings show them. Each one lives in its own file
// under trails/ (see CONTRIBUTING.md).
//
// A trail is { key, label, about, draw(g) }. draw() paints one frame into g.ctx:
//   g.pts      the path, newest first: [{ x, y, t }], t 0 at the pointer .. 1 at the end
//   g.size     thickness the settings ask for; g.strength 0..1 how solid
//   g.life     how long the path lasts, in seconds; g.dt seconds since the last frame
//   g.moved    how far the pointer moved since the last frame
//   g.color(t, alpha)  the color for a spot along the trail, ready for the canvas
//   g.mem      kept from frame to frame (particles and the like)
// A trail that keeps animating after the pointer stops sets g.busy = true.

var list = [None.trail, Comet.trail, Beads.trail, Ribbon.trail, Sparks.trail, Echoes.trail, Bubbles.trail];

var byKey = {};
var keys = [];
var labels = {};
var abouts = {};
for (var i = 0; i < list.length; i++) {
    byKey[list[i].key] = list[i];
    keys.push(list[i].key);
    labels[list[i].key] = list[i].label;
    abouts[list[i].key] = list[i].about;
}
