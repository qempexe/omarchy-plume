.pragma library
.import "colors/theme.js" as Theme
.import "colors/palette.js" as Palette
.import "colors/border.js" as Border
.import "colors/custom.js" as Custom
.import "colors/gradient.js" as Gradient
.import "colors/rainbow.js" as Rainbow
.import "colors/fade.js" as Fade
.import "colors/speed.js" as Speed

// Every color mode, in the order the settings show them. Each one lives in its own
// file under colors/ (see CONTRIBUTING.md).
//
// A mode is { key, label, about, uses?, at(t, c) }:
//   t  where along the effect, 0 at the pointer .. 1 at the end of the tail
//   c  { accent, palette, border, custom, custom2 } as [r, g, b] (lists for palette
//      and border), speed 0..1 (how fast the pointer moves), time in seconds
// and returns [r, g, b] or [r, g, b, a].

var list = [
    Theme.color,
    Palette.color,
    Border.color,
    Custom.color,
    Gradient.color,
    Rainbow.color,
    Fade.color,
    Speed.color
];

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

function at(key, t, c) {
    const mode = byKey[key] || byKey.theme;
    let out = null;
    try { out = mode.at(t, c); } catch (e) { out = null; }
    return out && out.length >= 3 ? out : (c.accent || [255, 255, 255]);
}
