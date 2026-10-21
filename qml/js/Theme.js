.pragma library

// Reading colors out of the current Omarchy theme. Only #rrggbb values and a number
// for the angle are taken from the files; nothing in them is run.

// colors.toml: the named colors (red, yellow, ... and their bright versions), or
// color1 … color14 in older themes, in that order, each once
function parsePalette(text) {
    const found = {};
    if (typeof text === "string" && text.length <= 65536) {
        for (const line of text.split("\n")) {
            const m = /^\s*([a-z_]+[0-9]{0,2})\s*=\s*["']?(#[0-9a-fA-F]{6})["']?\s*$/.exec(line);
            if (m) found[m[1]] = m[2].toLowerCase();
        }
    }
    const order = ["red", "orange", "yellow", "green", "cyan", "blue", "magenta",
                   "color1", "color2", "color3", "color4", "color5", "color6",
                   "bright_red", "bright_yellow", "bright_green", "bright_cyan", "bright_blue", "bright_magenta",
                   "color9", "color10", "color11", "color12", "color13", "color14"];
    const out = [];
    for (const k of order) {
        const c = found[k];
        if (typeof c === "string" && out.indexOf(c) === -1) out.push(c);
    }
    return out.slice(0, 12);
}

// The active window border, often a gradient:
//   hyprland.lua:   local active_border_color = { colors = { "rgba(1ee9d6ee)", "rgba(fe4fb6ee)" }, angle = 45 }
//   hyprland.conf:  col.active_border = rgba(33ccffee) rgba(00ff99ee) 45deg
//   colors.toml:    hyprland_active_border = "rgba(12e8daee) rgba(a586fdee) 45deg"
// -> { colors: ["#1ee9d6", "#fe4fb6"], angle: 45 }, or no colors when there's none
function parseBorder(text) {
    const out = { colors: [], angle: 0 };
    if (typeof text !== "string" || text.length > 65536) return out;
    const lines = text.split("\n");
    for (let i = 0; i < lines.length && i < 400; i++) {
        const line = lines[i];
        // the active border, not the inactive one
        if (!/(^|[^a-z])active_border/.test(line)) continue;
        const re = /rgba?\(\s*([0-9a-fA-F]{6})([0-9a-fA-F]{2})?\s*\)/g;
        let m;
        while ((m = re.exec(line)) !== null && out.colors.length < 6) out.colors.push("#" + m[1].toLowerCase());
        const ang = /angle\s*=\s*(-?[0-9]{1,3})/.exec(line) || /(-?[0-9]{1,3})\s*deg/.exec(line);
        if (ang) out.angle = parseFloat(ang[1]);
        if (out.colors.length > 0) break;
    }
    return out;
}
