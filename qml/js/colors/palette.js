.pragma library
.import "../Ink.js" as Ink

var color = {
    key: "palette",
    label: "Theme palette",
    about: "Runs through every color of your theme, from the pointer to the tail.",
    at(t, c) { return Ink.along(c.palette, t) || c.accent; }
};
