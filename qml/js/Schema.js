.pragma library
.import "Trails.js" as Trails
.import "Halos.js" as Halos
.import "Colors.js" as Colors
.import "Arrows.js" as Arrows
.import "Cursor.js" as Cursor
.import "Glyphs.js" as Glyphs

// Every setting Plume has: where it shows in the settings panel, its options and its
// default, plus the ready made looks. Plain functions, so they can be tested.
//
// An item: { key, label, kind, fallback, hint, options?, labels?, min?, max?, step?,
//            divisor?, decimals?, presets?, maxLength?, when? }
//   kind   enum | trail | halo | colors | scheme | cursor | glyph | paint | int | bool | color
//          glyph: tiles that draw one cursor (`glyph`, its folder name) with each option
//          paint: chips with a swatch, for where a cursor color comes from
//   when   [{ key, is: [...] }]: the row is dimmed unless every one holds

var PALETTE = ["#7aa2f7", "#bb9af7", "#7dcfff", "#9ece6a", "#e0af68", "#ff9e64", "#f7768e", "#c0caf5"];
var SLOTS = 12;
var POINTER = [{ key: "pointerTheme", not: [""] }];
var MINE = "*plume";                                   // pointerTheme: the cursor made here
var OWN = [{ key: "pointerTheme", is: [MINE] }];
function own(more) { return OWN.concat(more || []); }

var tabs = [
    { key: "looks", title: "Looks", kind: "looks", groups: [] },
    { key: "trail", title: "Trail", groups: [
        { title: "Style", items: [
            { key: "trail", label: "Trail", kind: "trail", fallback: "comet",
              options: Trails.keys, labels: Trails.labels, abouts: Trails.abouts,
              hint: "What the pointer leaves behind as it moves." }
        ] },
        { title: "Shape", items: [
            { key: "trailLife", label: "Length", kind: "int", fallback: 45, min: 15, max: 150, step: 5, divisor: 100, decimals: 2,
              hint: "How long the trail stays, in seconds.", when: [{ key: "trail", not: ["none"] }] },
            { key: "trailSize", label: "Thickness", kind: "int", fallback: 8, min: 2, max: 30, step: 1,
              when: [{ key: "trail", not: ["none"] }] },
            { key: "trailStrength", label: "Strength", kind: "int", fallback: 85, min: 10, max: 100, step: 5,
              hint: "How solid it is: low is a faint wisp.", when: [{ key: "trail", not: ["none"] }] }
        ] }
    ] },
    { key: "halo", title: "Halo", groups: [
        { title: "Style", items: [
            { key: "halo", label: "Halo", kind: "halo", fallback: "glow",
              options: Halos.keys, labels: Halos.labels, abouts: Halos.abouts,
              hint: "What sits around the pointer." }
        ] },
        { title: "Shape", items: [
            { key: "haloSize", label: "Size", kind: "int", fallback: 64, min: 20, max: 240, step: 4,
              when: [{ key: "halo", not: ["none"] }] },
            { key: "haloStrength", label: "Strength", kind: "int", fallback: 70, min: 10, max: 100, step: 5,
              when: [{ key: "halo", not: ["none"] }] },
            { key: "haloShow", label: "Show", kind: "enum", fallback: "always",
              options: ["always", "moving", "still"], labels: { always: "Always", moving: "While moving", still: "When still" },
              hint: "When still waits a moment after the pointer stops, then fades in.",
              when: [{ key: "halo", not: ["none"] }] }
        ] }
    ] },
    { key: "colors", title: "Colors", groups: [
        { title: "Trail and halo", items: [
            { key: "colorMode", label: "Color", kind: "colors", fallback: "theme",
              options: Colors.keys, labels: Colors.labels, abouts: Colors.abouts },
            { key: "customColor", label: "Color", kind: "color", fallback: "#7aa2f7", presets: PALETTE,
              hint: "Pick one, or type a hex.", when: [{ key: "colorMode", is: ["custom", "gradient"] }] },
            { key: "customColor2", label: "Second color", kind: "color", fallback: "#f7768e", presets: PALETTE,
              hint: "Where the gradient ends.", when: [{ key: "colorMode", is: ["gradient"] }] }
        ] },
        { title: "This panel", items: [
            { key: "panelColor", label: "Panel colors", kind: "scheme", fallback: "theme",
              options: ["theme", "palette", "borders", "custom", "monochrome"],
              labels: { theme: "Follow theme", palette: "Theme palette", borders: "Window borders", custom: "Custom", monochrome: "Monochrome" },
              hint: "Follow theme matches your Omarchy theme live. Theme palette gives every tab its own color from the theme. "
                  + "Window borders takes the colors of your window border, gradient and all. Custom lets you choose the background, "
                  + "text and accent. Monochrome removes every hue." },
            { key: "panelBg", label: "Background", kind: "color", fallback: "#141414", presets: ["#141414", "#1a1b26", "#1e1e2e", "#282828", "#f2efe9", "#ffffff"],
              when: [{ key: "panelColor", is: ["custom"] }] },
            { key: "panelFg", label: "Text", kind: "color", fallback: "#e0e0e0", presets: ["#e0e0e0", "#c0caf5", "#cdd6f4", "#ebdbb2", "#202020", "#000000"],
              hint: "Also used anywhere when Text is set to My text color.", when: [{ key: "panelColor", is: ["custom"] }] },
            { key: "panelCustomColor", label: "Accent", kind: "color", fallback: "#ff6a1f", presets: PALETTE,
              when: [{ key: "panelColor", is: ["custom"] }] },
            { key: "panelText", label: "Text", kind: "enum", fallback: "auto", options: ["auto", "theme", "custom"],
              labels: { auto: "Always readable", theme: "Theme", custom: "My text color" },
              hint: "Always readable keeps the theme's text color, and switches to black or white when the panel is too light or too dark for it. My text color uses the Text color above." }
        ] },
        { title: "Panel outline and surface", items: [
            { key: "panelFrame", label: "Panel outline", kind: "bool", fallback: false,
              hint: "Draw the panel's edge in color instead of a plain neutral line." },
            { key: "panelFrameGradient", label: "Outline gradient", kind: "bool", fallback: true,
              hint: "When your window border is a gradient, the outline runs through all its colors, at the same angle.",
              when: [{ key: "panelFrame", is: [true] }] },
            { key: "panelFrameColor", label: "Outline color", kind: "enum", fallback: "accent", options: ["accent", "first", "middle", "last"],
              labels: { accent: "Accent", first: "Border's first", middle: "Border's middle", last: "Border's last" },
              hint: "The one color of the outline when it isn't a gradient. Falls back to the accent when your theme has no window border.",
              when: [{ key: "panelFrame", is: [true] }] },
            { key: "panelTint", label: "Panel tint", kind: "int", fallback: 0, min: 0, max: 30, step: 1,
              hint: "How much of the accent color washes over the panel. 0 keeps it plain." },
            { key: "panelOpacity", label: "Panel opacity", kind: "int", fallback: 97, min: 50, max: 100, step: 1,
              hint: "How solid the panel is. Lower lets your wallpaper show through." }
        ] }
    ] },
    { key: "cursor", title: "Cursor", groups: [
        { title: "Theme", items: [
            { key: "pointerTheme", label: "Cursor", kind: "cursor", fallback: "",
              hint: "As Omarchy sets it leaves your cursor alone. Made in Plume wears the cursor you design below; or pick an installed theme." },
            { key: "pointerSize", label: "Size", kind: "int", fallback: 24, min: 16, max: 96, step: 2,
              when: POINTER }
        ] },
        { title: "Shape", items: [
            { key: "cursorShape", label: "Arrow", kind: "glyph", glyph: "left_ptr", fallback: "classic",
              options: Arrows.keys, labels: Arrows.labels, abouts: Arrows.abouts, when: OWN },
            { key: "cursorTilt", label: "Tilt", kind: "int", fallback: 0, min: -30, max: 30, step: 2,
              hint: "Turns the arrow about its tip, in degrees.", when: own([{ key: "cursorShape", not: ["dot"] }]) },
            { key: "cursorRound", label: "Round corners", kind: "int", fallback: 30, min: 0, max: 100, step: 5,
              hint: "Sharp at 0, soft and pebbly at 100.", when: OWN }
        ] },
        { title: "Surface", items: [
            { key: "cursorSurface", label: "Surface", kind: "glyph", glyph: "left_ptr", fallback: "filled",
              options: Cursor.surfaces.keys, labels: Cursor.surfaces.labels, abouts: Cursor.surfaces.abouts, when: OWN },
            { key: "cursorFill", label: "Fill", kind: "enum", fallback: "solid", options: ["solid", "gradient", "glass"],
              labels: { solid: "Solid", gradient: "Gradient", glass: "Glass" }, when: OWN },
            { key: "cursorGradientTo", label: "Gradient into", kind: "enum", fallback: "second",
              options: ["second", "lighter", "darker", "accent", "palette", "border"],
              labels: { second: "Second color", lighter: "Lighter", darker: "Darker", accent: "Accent", palette: "Next theme color", border: "Window border" },
              when: own([{ key: "cursorFill", is: ["gradient"] }]) },
            { key: "cursorGradientDir", label: "Gradient runs", kind: "enum", fallback: "along",
              options: ["along", "across", "diagonal", "theme"],
              labels: { along: "Tip to tail", across: "Across", diagonal: "Diagonal", theme: "Like the window border" },
              when: own([{ key: "cursorFill", is: ["gradient"] }]) },
            { key: "cursorPattern", label: "Texture", kind: "enum", fallback: "none", options: ["none", "stripes", "dots", "grid"],
              labels: { none: "None", stripes: "Stripes", dots: "Dots", grid: "Grid" }, when: OWN },
            { key: "cursorDepth", label: "Depth", kind: "enum", fallback: "flat", options: ["flat", "raised", "sunken"],
              labels: { flat: "Flat", raised: "Raised", sunken: "Sunken" }, when: OWN },
            { key: "cursorOpacity", label: "Opacity", kind: "int", fallback: 100, min: 30, max: 100, step: 5,
              hint: "How solid the cursor is. Lower lets what is under it show through.", when: OWN },
            { key: "cursorTint", label: "Accent tint", kind: "int", fallback: 0, min: 0, max: 40, step: 2,
              hint: "How much of the theme's accent washes over the cursor's color.", when: OWN }
        ] },
        { title: "Colors", items: [
            { key: "cursorColor", label: "Color", kind: "paint", fallback: "foreground",
              options: Cursor.colorKeys, labels: Cursor.colorLabels, custom: "cursorColorCustom",
              hint: "Theme colors follow your Omarchy theme; the cursor is made again when it changes.", when: OWN },
            { key: "cursorColorCustom", label: "Custom color", kind: "color", fallback: "#7aa2f7", presets: PALETTE,
              when: own([{ key: "cursorColor", is: ["custom"] }]) },
            { key: "cursorColor2", label: "Second color", kind: "paint", fallback: "accent",
              options: Cursor.colorKeys, labels: Cursor.colorLabels, custom: "cursorColor2Custom",
              hint: "For two-tone and split surfaces, stripes and chips, ornaments, the tip dot and the badges on help, copy and link.", when: OWN },
            { key: "cursorColor2Custom", label: "Second custom color", kind: "color", fallback: "#f7768e", presets: PALETTE,
              when: own([{ key: "cursorColor2", is: ["custom"] }]) }
        ] },
        { title: "Lines", items: [
            { key: "cursorLine", label: "Lines", kind: "glyph", glyph: "left_ptr", fallback: "solid",
              options: Cursor.lines.keys, labels: Cursor.lines.labels, abouts: Cursor.lines.abouts, when: OWN },
            { key: "cursorLineColor", label: "Line color", kind: "paint", fallback: "auto",
              options: Cursor.lineColorKeys, labels: Cursor.lineColorLabels, custom: "cursorLineCustom",
              hint: "Automatic picks dark or light, whichever stands out from the cursor's color. Subtle is a soft version of it.",
              when: own([{ key: "cursorLine", not: ["none"] }]) },
            { key: "cursorLineCustom", label: "Custom line color", kind: "color", fallback: "#101010", presets: PALETTE,
              when: own([{ key: "cursorLine", not: ["none"] }, { key: "cursorLineColor", is: ["custom"] }]) },
            { key: "cursorLineWidth", label: "Line width", kind: "int", fallback: 2, min: 1, max: 4, step: 1,
              when: own([{ key: "cursorLine", not: ["none"] }]) },
            { key: "cursorLineGradient", label: "Gradient lines", kind: "bool", fallback: false,
              hint: "The line fades from its color into another.", when: own([{ key: "cursorLine", not: ["none"] }]) },
            { key: "cursorLineFadeTo", label: "Fade into", kind: "enum", fallback: "lighter",
              options: ["lighter", "second", "accent", "palette", "border"],
              labels: { lighter: "Lighter", second: "Second color", accent: "Accent", palette: "Next theme color", border: "Window border" },
              when: own([{ key: "cursorLine", not: ["none"] }, { key: "cursorLineGradient", is: [true] }]) },
            { key: "cursorLineFadeDir", label: "Fade direction", kind: "enum", fallback: "along",
              options: ["along", "diagonal", "across", "theme"],
              labels: { along: "Tip to tail", diagonal: "Diagonal", across: "Across", theme: "Like the window border" },
              when: own([{ key: "cursorLine", not: ["none"] }, { key: "cursorLineGradient", is: [true] }]) }
        ] },
        { title: "Ornaments", items: [
            { key: "cursorOrnament", label: "Ornaments", kind: "glyph", glyph: "left_ptr", fallback: "none",
              options: Cursor.ornaments.keys, labels: Cursor.ornaments.labels, abouts: Cursor.ornaments.abouts, when: OWN },
            { key: "cursorOrnamentSize", label: "Ornament size", kind: "int", fallback: 7, min: 3, max: 16, step: 1,
              when: own([{ key: "cursorOrnament", not: ["none"] }]) },
            { key: "cursorOrnamentsOn", label: "Ornaments on", kind: "enum", fallback: "arrow", options: ["arrow", "all"],
              labels: { arrow: "The arrow", all: "Every cursor" },
              hint: "The arrow also covers the cursors built on it: help, copy, link, the menu and busy in the background.",
              when: own([{ key: "cursorOrnament", not: ["none"] }]) },
            { key: "cursorCap", label: "Accent cap", kind: "enum", fallback: "none", options: ["none", "tip", "tail", "both"],
              labels: { none: "None", tip: "At the tip", tail: "At the tail", both: "Both ends" },
              hint: "A dot of the theme's accent on the arrow's ends.", when: own([{ key: "cursorShape", not: ["dot"] }]) },
            { key: "cursorDetail", label: "Detail", kind: "glyph", glyph: "left_ptr", fallback: "none",
              options: Cursor.details.keys, labels: Cursor.details.labels, abouts: Cursor.details.abouts,
              when: own([{ key: "cursorShape", not: ["dot"] }]) }
        ] },
        { title: "Shadow", items: [
            { key: "cursorShadow", label: "Shadow", kind: "glyph", glyph: "left_ptr", fallback: "soft",
              options: Cursor.shadows.keys, labels: Cursor.shadows.labels, abouts: Cursor.shadows.abouts, when: OWN },
            { key: "cursorShadowColor", label: "Shadow color", kind: "enum", fallback: "dark", options: ["dark", "accent"],
              labels: { dark: "Dark", accent: "Accent glow" }, when: own([{ key: "cursorShadow", not: ["none"] }]) },
            { key: "cursorShadowDir", label: "Shadow falls", kind: "enum", fallback: "below", options: ["below", "around"],
              labels: { below: "Below", around: "All around" }, when: own([{ key: "cursorShadow", not: ["none", "long"] }]) },
            { key: "cursorShadowStrength", label: "Shadow strength", kind: "int", fallback: 60, min: 10, max: 100, step: 5,
              when: own([{ key: "cursorShadow", not: ["none"] }]) }
        ] },
        { title: "The other cursors", items: [
            { key: "cursorHand", label: "Over links", kind: "glyph", glyph: "hand2", fallback: "hand",
              options: Glyphs.handKeys, labels: Glyphs.handLabels, when: OWN },
            { key: "cursorBeam", label: "Over text", kind: "glyph", glyph: "text", fallback: "beam",
              options: Glyphs.beamKeys, labels: Glyphs.beamLabels, when: OWN },
            { key: "cursorBusy", label: "Busy", kind: "glyph", glyph: "wait", fallback: "ring",
              options: Glyphs.spinnerKeys, labels: Glyphs.spinnerLabels, when: OWN },
            { key: "cursorBusySpeed", label: "Busy speed", kind: "enum", fallback: "normal",
              options: ["slow", "normal", "fast"], labels: { slow: "Slow", normal: "Normal", fast: "Fast" }, when: OWN }
        ] },
        { title: "Hiding", items: [
            { key: "hideAfter", label: "Hide when idle", kind: "enum", fallback: "keep",
              options: ["keep", "0", "2", "5", "10", "30"],
              labels: { keep: "As Omarchy sets it", "0": "Never", "2": "2 s", "5": "5 s", "10": "10 s", "30": "30 s" },
              hint: "Hide the pointer after it rests this long." },
            { key: "hideTyping", label: "Hide while typing", kind: "enum", fallback: "keep",
              options: ["keep", "on", "off"], labels: { keep: "As Omarchy sets it", on: "On", off: "Off" } }
        ] }
    ] },
    { key: "find", title: "Find", groups: [
        { title: "Shake to find", items: [
            { key: "shake", label: "Shake to find", kind: "bool", fallback: true,
              hint: "Shake the mouse left and right and rings rush out of the pointer." },
            { key: "shakeSensitivity", label: "Sensitivity", kind: "int", fallback: 5, min: 1, max: 10, step: 1,
              hint: "Low needs a big shake, high a little wiggle.", when: [{ key: "shake", is: [true] }] },
            { key: "findSize", label: "Size", kind: "int", fallback: 60, min: 30, max: 160, step: 5 }
        ] }
    ] },
    { key: "behavior", title: "Behavior", groups: [
        { title: "Effects", items: [
            { key: "enabled", label: "Effects", kind: "bool", fallback: true,
              hint: "The trail, the halo and the find rings. The bar button turns them on and off too." },
            { key: "fullscreen", label: "Over fullscreen windows", kind: "enum", fallback: "hide",
              options: ["hide", "show"], labels: { hide: "Hide", show: "Show" },
              hint: "Games and videos in fullscreen stay clean unless you say otherwise." },
            { key: "fps", label: "Smoothness", kind: "enum", fallback: "60",
              options: ["30", "60"], labels: { "30": "30 frames", "60": "60 frames" },
              hint: "60 is smoother, 30 is lighter. Nothing is drawn while the pointer rests." }
        ] },
        { title: "Bar button", items: [
            { key: "wheelLooks", label: "Scroll for looks", kind: "bool", fallback: true,
              hint: "Scroll on the bar button to go through the ready made looks." },
            { key: "startLook", label: "Look at login", kind: "enum", fallback: "keep",
              options: ["keep", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
              labels: { keep: "As I left it" },
              hint: "Start every session with one of your saved places." }
        ] }
    ] },
    { key: "about", title: "About", kind: "about", groups: [] }
];

// ---- every item, by key --------------------------------------------------------------

var items = [];
var byKey = {};
for (let ti = 0; ti < tabs.length; ti++) {
    for (let gi = 0; gi < tabs[ti].groups.length; gi++) {
        const grp = tabs[ti].groups[gi];
        for (let ii = 0; ii < grp.items.length; ii++) {
            const it = grp.items[ii];
            it.tab = tabs[ti].key;
            it.group = grp.title;
            items.push(it);
            byKey[it.key] = it;
        }
    }
}

function defaults() {
    const out = {};
    for (const it of items) out[it.key] = it.fallback;
    return out;
}

// one value, checked against its item; anything unknown or broken gives the default
function cleanValue(key, v) {
    const it = byKey[key];
    if (!it) return undefined;
    if (v === undefined || v === null) return it.fallback;
    switch (it.kind) {
    case "bool":
        return v === true || v === "true" ? true : (v === false || v === "false" ? false : it.fallback);
    case "int": {
        const n = typeof v === "number" ? v : parseFloat(v);
        return isFinite(n) ? Math.max(it.min, Math.min(it.max, Math.round(n))) : it.fallback;
    }
    case "color":
        return typeof v === "string" && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) ? v : it.fallback;
    case "cursor":
        // a theme name as Pointer.js accepts it, "" for leaving the cursor alone, or the
        // cursor made here
        return typeof v === "string" && (v === "" || v === MINE || /^[A-Za-z0-9][A-Za-z0-9._+ -]{0,63}$/.test(v)) ? v : it.fallback;
    default: {
        const s = typeof v === "number" ? String(v) : v;
        return typeof s === "string" && it.options.indexOf(s) >= 0 ? s : it.fallback;
    }
    }
}

// every setting, layered: defaults, then the shell's own widget settings, then what
// was changed in the panel. Each value checked.
function resolve(shellSettings, local) {
    const out = {};
    for (const k of Object.keys(defaults())) {
        let v;
        if (local && local[k] !== undefined && local[k] !== null) v = local[k];
        else if (shellSettings && shellSettings[k] !== undefined && shellSettings[k] !== null) v = shellSettings[k];
        out[k] = cleanValue(k, v);
    }
    return out;
}

// is an item's row in effect with these values?
function active(it, values) {
    if (!it.when) return true;
    return it.when.every((c) => c.is ? c.is.map(String).indexOf(String(values[c.key])) >= 0
                                     : c.not.map(String).indexOf(String(values[c.key])) < 0);
}

// ---- looks ------------------------------------------------------------------------------
// A look is how the effects look: the trail, the halo, their colors and the find rings.
// The pointer itself, the panel and the behavior are left alone.

var lookTabs = ["trail", "halo", "colors"];
var lookExclude = {};
for (let pk = 0; pk < items.length; pk++) if (/^panel/.test(items[pk].key)) lookExclude[items[pk].key] = true;
var lookKeys = [];
for (let lk = 0; lk < items.length; lk++)
    if (lookTabs.indexOf(items[lk].tab) >= 0 && !lookExclude[items[lk].key]) lookKeys.push(items[lk].key);

var looks = [
    { key: "classic", label: "Classic", set: {} },
    { key: "neon", label: "Neon", set: { trail: "ribbon", trailSize: 6, halo: "ring", haloSize: 44, colorMode: "rainbow" } },
    { key: "ember", label: "Ember", set: { trail: "sparks", trailLife: 70, trailSize: 10, halo: "glow", haloSize: 56, colorMode: "speed" } },
    { key: "bubbles", label: "Bubbles", set: { trail: "bubbles", trailLife: 110, trailSize: 12, halo: "none", colorMode: "palette" } },
    { key: "echo", label: "Echo", set: { trail: "echoes", trailLife: 60, trailSize: 10, halo: "pulse", haloSize: 48, colorMode: "border" } },
    { key: "beads", label: "Beads", set: { trail: "beads", trailLife: 60, trailSize: 7, halo: "ring", haloSize: 36, colorMode: "gradient",
                                            customColor: "#7dcfff", customColor2: "#bb9af7" } },
    { key: "aurora", label: "Aurora", set: { trail: "ribbon", trailLife: 80, trailSize: 12, trailStrength: 70, halo: "glow", haloSize: 90,
                                              colorMode: "border" } },
    { key: "drift", label: "Drift", set: { trail: "comet", trailLife: 70, trailSize: 10, halo: "glow", colorMode: "fade" } },
    { key: "presenter", label: "Presenter", set: { trail: "none", halo: "spotlight", haloSize: 120, haloStrength: 75, haloShow: "still" } },
    { key: "sniper", label: "Crosshair", set: { trail: "none", halo: "crosshair", haloSize: 40, colorMode: "custom", customColor: "#f7768e" } },
    { key: "target", label: "Target", set: { trail: "comet", trailLife: 25, trailSize: 4, halo: "target", haloSize: 54 } },
    { key: "minimal", label: "Minimal", set: { trail: "none", halo: "ring", haloSize: 30, haloStrength: 60 } }
];
var lookByKey = {};
var lookOptions = [];
var lookLabels = {};
for (let li = 0; li < looks.length; li++) {
    lookByKey[looks[li].key] = looks[li];
    lookOptions.push(looks[li].key);
    lookLabels[looks[li].key] = looks[li].label;
}

// a whole ready made look: every look key, from the defaults and the look's own settings
function lookSet(key) {
    const L = lookByKey[key];
    if (!L) return null;
    const d = defaults(), out = {};
    for (const k of lookKeys) out[k] = L.set[k] !== undefined ? cleanValue(k, L.set[k]) : d[k];
    return out;
}
// just the look part of a set of values (for saving, undo and export)
function lookOf(values) {
    const out = {};
    for (const k of lookKeys) if (values[k] !== undefined) out[k] = cleanValue(k, values[k]);
    return out;
}
// the ready made look these values are wearing, or ""
function lookNow(values) {
    for (const L of looks) {
        const want = lookSet(L.key);
        if (lookKeys.every((k) => String(values[k]) === String(want[k]))) return L.key;
    }
    return "";
}
// a look from outside (an import or a saved slot): only look keys, every one checked
function cleanLook(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const out = {};
    let any = false;
    for (const k of lookKeys) if (raw[k] !== undefined) { out[k] = cleanValue(k, raw[k]); any = true; }
    return any ? out : null;
}

// ---- ready made cursors ------------------------------------------------------------------------
// A cursor look sets how the cursor made here looks, and puts it on. Its size and the
// hiding are left alone.

var cursorKeys = [];
for (let ck = 0; ck < items.length; ck++)
    if (items[ck].tab === "cursor" && /^cursor/.test(items[ck].key)) cursorKeys.push(items[ck].key);

var cursorLooks = [
    { key: "plume", label: "Plume", set: {} },
    { key: "ink", label: "Ink", set: { cursorColor: "black", cursorLineWidth: 1, cursorLineColor: "white" } },
    { key: "paper", label: "Paper", set: { cursorColor: "white", cursorLineWidth: 1, cursorLineColor: "black", cursorShadow: "hard",
                                            cursorShadowStrength: 45, cursorRound: 10 } },
    { key: "accent", label: "Accent", set: { cursorShape: "slim", cursorFill: "gradient", cursorColor: "accent", cursorGradientTo: "lighter",
                                              cursorLineWidth: 1, cursorLineColor: "background", cursorShadowColor: "accent", cursorShadowStrength: 50 } },
    { key: "neon", label: "Neon", set: { cursorShape: "needle", cursorSurface: "clear", cursorColor: "accent", cursorLine: "neon",
                                          cursorLineColor: "accent", cursorShadowColor: "accent", cursorShadowStrength: 70, cursorHand: "ring",
                                          cursorBeam: "caret", cursorBusy: "orbit" } },
    { key: "glass", label: "Glass", set: { cursorShape: "teardrop", cursorFill: "glass", cursorColor: "accent", cursorLineWidth: 1,
                                            cursorRound: 40 } },
    { key: "candy", label: "Candy", set: { cursorShape: "chunky", cursorSurface: "candy", cursorColor: "border", cursorColor2: "border2",
                                            cursorLineWidth: 3, cursorLineColor: "background", cursorShadow: "long", cursorShadowStrength: 50,
                                            cursorRound: 60 } },
    { key: "gilded", label: "Gilded", set: { cursorShape: "crest", cursorSurface: "velvet", cursorColor: "background", cursorColor2: "accent",
                                              cursorLine: "gilded", cursorLineColor: "accent", cursorLineWidth: 2, cursorOrnament: "studs",
                                              cursorOrnamentSize: 6, cursorRound: 20 } },
    { key: "marble", label: "Marble", set: { cursorShape: "wedge", cursorSurface: "marble", cursorColor: "foreground", cursorColor2: "accent",
                                              cursorLineColor: "background", cursorDepth: "raised", cursorRound: 45 } },
    { key: "nebula", label: "Nebula", set: { cursorShape: "leaf", cursorSurface: "nebula", cursorColor: "border", cursorColor2: "border2",
                                              cursorLine: "glow", cursorLineColor: "foreground", cursorLineWidth: 1, cursorShadowColor: "accent" } },
    { key: "stitch", label: "Stitched", set: { cursorShape: "feather", cursorSurface: "leather", cursorColor: "accent", cursorLine: "stitched",
                                                cursorLineColor: "background", cursorShadow: "hard", cursorShadowStrength: 50 } },
    { key: "dot", label: "Dot", set: { cursorShape: "dot", cursorColor: "accent", cursorLineColor: "background", cursorShadowColor: "accent",
                                        cursorHand: "ring", cursorBusy: "dots" } },
    { key: "sharp", label: "Sharp", set: { cursorRound: 0, cursorColor: "white", cursorLineWidth: 3, cursorLineColor: "black",
                                            cursorShadow: "none", cursorDetail: "tip" } },
    { key: "glitch", label: "Glitch", set: { cursorShape: "chevron", cursorSurface: "crt", cursorColor: "background", cursorLine: "glitch",
                                              cursorLineColor: "foreground", cursorLineWidth: 2, cursorRound: 10 } },
    { key: "terrazzo", label: "Terrazzo", set: { cursorShape: "bullet", cursorSurface: "terrazzo", cursorColor: "foreground", cursorColor2: "accent",
                                                  cursorLine: "beads", cursorLineColor: "accent", cursorLineWidth: 1, cursorRound: 50 } },
    { key: "holo", label: "Hologram", set: { cursorShape: "kite", cursorSurface: "holo", cursorColor: "foreground", cursorLine: "double",
                                              cursorLineColor: "accent", cursorOrnament: "stars", cursorOrnamentSize: 5 } }
];
var cursorLookByKey = {};
for (let cl = 0; cl < cursorLooks.length; cl++) cursorLookByKey[cursorLooks[cl].key] = cursorLooks[cl];

// every cursor key of a ready made cursor, with it put on
function cursorLookSet(key) {
    const L = cursorLookByKey[key];
    if (!L) return null;
    const d = defaults(), out = { pointerTheme: MINE };
    for (const k of cursorKeys) out[k] = L.set[k] !== undefined ? cleanValue(k, L.set[k]) : d[k];
    return out;
}
// the ready made cursor these values are wearing, or ""
function cursorLookNow(values) {
    if (values.pointerTheme !== MINE) return "";
    for (const L of cursorLooks) {
        const want = cursorLookSet(L.key);
        if (cursorKeys.every((k) => String(values[k]) === String(want[k]))) return L.key;
    }
    return "";
}

// ---- your own saved places ------------------------------------------------------------------
// A place you save keeps every setting there is, not only the look: the pointer, the
// panel, everything, so choosing it again brings all of it back. Only "Look at login"
// stays out, or a saved place would switch itself off at the next login.

var slotSkip = { startLook: true };

function settingsOf(values) {
    const out = {};
    for (const k of Object.keys(defaults())) if (!slotSkip[k]) out[k] = cleanValue(k, values ? values[k] : undefined);
    return out;
}
function cleanSettings(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const out = {};
    let any = false;
    for (const k of Object.keys(defaults())) {
        if (slotSkip[k] || raw[k] === undefined) continue;
        out[k] = cleanValue(k, raw[k]);
        any = true;
    }
    return any ? out : null;
}

// ---- search -------------------------------------------------------------------------------

function matches(it, text) {
    const q = String(text || "").trim().toLowerCase();
    if (q === "") return true;
    const hay = (it.label + " " + (it.hint || "") + " " + it.group).toLowerCase();
    return q.split(/\s+/).every((w) => hay.indexOf(w) >= 0);
}
