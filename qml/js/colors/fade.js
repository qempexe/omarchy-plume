.pragma library
.import "../Ink.js" as Ink

var color = {
    key: "fade",
    label: "Drift",
    about: "Starts on your accent and drifts slowly around the color wheel.",
    at(t, c) { return Ink.hsl(Ink.hueOf(c.accent) + Math.sin(c.time * 0.25) * 70 + t * 30, 0.75, 0.62); }
};
