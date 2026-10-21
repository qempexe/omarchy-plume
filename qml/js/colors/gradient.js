.pragma library
.import "../Ink.js" as Ink

var color = {
    key: "gradient",
    label: "Gradient",
    about: "From your first color at the pointer to your second at the end of the tail.",
    uses: ["customColor", "customColor2"],
    at(t, c) { return Ink.mix(c.custom || c.accent, c.custom2 || c.accent, t); }
};
