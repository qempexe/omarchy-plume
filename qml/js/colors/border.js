.pragma library
.import "../Ink.js" as Ink

var color = {
    key: "border",
    label: "Window border",
    about: "The colors of your active window border, as the same gradient.",
    at(t, c) { return Ink.along(c.border, t) || c.accent; }
};
