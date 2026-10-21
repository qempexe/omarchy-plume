.pragma library
.import "../Ink.js" as Ink

var color = {
    key: "speed",
    label: "Speed",
    about: "Cool blue when the pointer moves slowly, hot red when it flies.",
    at(t, c) { return Ink.hsl(220 - 220 * Math.max(0, Math.min(1, c.speed * (1 - t * 0.5))), 0.85, 0.6); }
};
