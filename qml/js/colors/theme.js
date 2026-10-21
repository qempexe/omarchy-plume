.pragma library

var color = {
    key: "theme",
    label: "Theme",
    about: "Your theme's accent color, all the way.",
    at(t, c) { return c.accent; }
};
