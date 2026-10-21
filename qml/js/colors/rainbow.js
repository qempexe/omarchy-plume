.pragma library
.import "../Ink.js" as Ink

var color = {
    key: "rainbow",
    label: "Rainbow",
    about: "Every hue along the tail, slowly turning.",
    at(t, c) { return Ink.hsl(c.time * 40 + t * 300, 0.85, 0.62); }
};
