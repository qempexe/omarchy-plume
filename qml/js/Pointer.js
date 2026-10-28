.pragma library

// The pointer itself, through Hyprland: which cursor themes are installed, and the
// commands that set the theme, the size and how the pointer hides. Every command is
// an argument array; what goes into them is checked here first.

var THEME_RE = /^[A-Za-z0-9][A-Za-z0-9._+ -]{0,63}$/;

function iconDirs(home, dataHome) {
    const out = [];
    const add = (d) => { if (d && d.indexOf("/") === 0 && out.indexOf(d) < 0) out.push(d); };
    add(dataHome ? dataHome + "/icons" : (home ? home + "/.local/share/icons" : ""));
    add(home ? home + "/.icons" : "");
    add("/usr/local/share/icons");
    add("/usr/share/icons");
    return out;
}

// find prints the folder of every theme: XCursor themes have cursors/, Hyprcursor
// themes have manifest.hl (or manifest.toml)
function scanArgs(dirs) {
    return ["find"].concat(dirs).concat(["-mindepth", "2", "-maxdepth", "2", "(",
        "-name", "cursors", "-o", "-name", "manifest.hl", "-o", "-name", "manifest.toml", ")", "-printf", "%h\\n"]);
}

function validTheme(name) { return typeof name === "string" && THEME_RE.test(name) && name !== "default"; }

// the folders the cursor made in Plume lives in; not listed as themes of their own
var OWN_RE = /^plume-[a-z]$/;

// theme names from the find output, sorted, each once
function parseThemes(text) {
    const seen = {}, out = [];
    const lines = String(text || "").split("\n");
    for (let i = 0; i < lines.length && out.length < 300; i++) {
        const name = lines[i].trim().replace(/\/+$/, "").split("/").pop();
        if (!validTheme(name) || OWN_RE.test(name) || seen[name]) continue;
        seen[name] = true;
        out.push(name);
    }
    return out.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1);
}

// "default" is the system's own alias, used to go back when nothing else is known
function setcursorArgs(theme, size) {
    const n = Math.round(Number(size));
    if (!(validTheme(theme) || theme === "default") || !(n >= 8 && n <= 256)) return null;
    return ["hyprctl", "setcursor", theme, String(n)];
}

// The cursor options, through Hyprland's Lua config: how the pointer hides, and whether
// Hyprcursor themes are used at all (the cursor made in Plume is one). Only these keys,
// and only a number or true/false, ever reach the line that is run.
function optionsArgs(opts) {
    const parts = [];
    if (opts && typeof opts.inactive_timeout === "number" && isFinite(opts.inactive_timeout))
        parts.push("inactive_timeout = " + Math.max(0, Math.min(600, Math.round(opts.inactive_timeout))));
    if (opts && typeof opts.hide_on_key_press === "boolean")
        parts.push("hide_on_key_press = " + (opts.hide_on_key_press ? "true" : "false"));
    if (opts && typeof opts.enable_hyprcursor === "boolean")
        parts.push("enable_hyprcursor = " + (opts.enable_hyprcursor ? "true" : "false"));
    if (parts.length === 0) return null;
    return ["hyprctl", "eval", "hl.config({ cursor = { " + parts.join(", ") + " } })"];
}

function getoptionArgs(name) {
    if (name !== "cursor:inactive_timeout" && name !== "cursor:hide_on_key_press" && name !== "cursor:enable_hyprcursor") return null;
    return ["hyprctl", "-j", "getoption", name];
}

// {"option":"cursor:inactive_timeout","int":0,...} -> 0, or null when unreadable
function parseOption(text) {
    if (typeof text !== "string" || text.length > 4096) return null;
    let o = null;
    try { o = JSON.parse(text); } catch (e) { return null; }
    if (!o || typeof o !== "object") return null;
    for (const k of ["int", "float", "bool", "value"]) {
        const v = o[k];
        if (typeof v === "number" && isFinite(v)) return v;
        if (typeof v === "boolean") return v ? 1 : 0;
    }
    return null;
}

// The theme to go back to with "As Omarchy sets it": the session's XCURSOR_THEME, unless
// that is one of Plume's own folders or Omarchy's blank startup cursor; then the one
// remembered from before, or the system default.
function baseTheme(env, remembered) {
    const ok = (t) => typeof t === "string" && THEME_RE.test(t) && !OWN_RE.test(t) && t !== "omarchy-startup";
    if (ok(env)) return env;
    if (ok(remembered)) return remembered;
    return "default";
}

// The XCursor copy of the cursor made in Plume: tools/xcursor.py, run on one of its own
// folders, for programs that only know XCursor.
function xcursorArgs(script, dir, size) {
    const n = Math.round(Number(size));
    const name = String(dir || "").replace(/\/+$/, "").split("/").pop();
    if (typeof script !== "string" || script.indexOf("/") !== 0 || !/\/tools\/xcursor\.py$/.test(script)) return null;
    if (typeof dir !== "string" || dir.indexOf("/") !== 0 || dir.indexOf("/../") >= 0 || !OWN_RE.test(name)) return null;
    if (!(n >= 8 && n <= 256)) return null;
    return ["python3", "-I", script, dir, String(n)];
}

// GTK's cursor theme and size, which GTK 3 programs read instead of asking Hyprland.
// Only these two keys, and only a theme name or a size, ever reach gsettings.
var GTK_KEYS = { "cursor-theme": true, "cursor-size": true };

function gtkGetArgs(key) {
    if (!GTK_KEYS[key]) return null;
    return ["gsettings", "get", "org.gnome.desktop.interface", key];
}

function gtkSetArgs(key, value) {
    if (key === "cursor-theme" && (validTheme(value) || value === "default"))
        return ["gsettings", "set", "org.gnome.desktop.interface", key, value];
    const n = Math.round(Number(value));
    if (key === "cursor-size" && n >= 8 && n <= 256)
        return ["gsettings", "set", "org.gnome.desktop.interface", key, String(n)];
    return null;
}

// "'Adwaita'\n" -> "Adwaita", "24\n" -> 24, anything else -> null
function parseGsetting(key, text) {
    const t = String(text || "").trim();
    if (t.length > 80) return null;
    if (key === "cursor-theme") {
        const m = /^'([^']*)'$/.exec(t);
        if (!m || !(validTheme(m[1]) || m[1] === "default")) return null;
        return OWN_RE.test(m[1]) ? "default" : m[1];   // left on one of ours: nothing to go back to
    }
    if (key === "cursor-size") return /^(?:uint32 |int32 )?\d{1,3}$/.test(t) ? parseInt(t.split(" ").pop()) : null;
    return null;
}
