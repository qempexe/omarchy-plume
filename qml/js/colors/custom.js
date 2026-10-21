.pragma library

var color = {
    key: "custom",
    label: "Custom",
    about: "One color of your choosing.",
    uses: ["customColor"],
    at(t, c) { return c.custom || c.accent; }
};
