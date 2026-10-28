// node tests/test_motion.js: the pointer path, speed, stillness and shaking
const fs = require("fs"), path = require("path"), assert = require("assert");
const load = (f) => fs.readFileSync(path.join(__dirname, "..", "qml", "js", f), "utf8").replace(/^\.pragma.*$/m, "");
const M = new Function(load("Motion.js") + "; return { fresh, parse, add, prune, pointsFor, speed01, stillFor, shaken };")();

assert.deepStrictEqual(M.parse('{"x": 812, "y": 455}'), { x: 812, y: 455 });
assert.deepStrictEqual(M.parse('{"x": 1.5, "y": -20}'), { x: 1.5, y: -20 });
assert.strictEqual(M.parse('{"x": "1", "y": 2}'), null, "numbers only");
assert.strictEqual(M.parse("ok"), null);
assert.strictEqual(M.parse('{"x": 1e309, "y": 2}'), null, "no infinities");
assert.strictEqual(M.parse("x".repeat(300)), null, "bounded");

const st = M.fresh();
assert.ok(M.add(st, 100, 100, 1000));
assert.ok(!M.add(st, 100, 100, 1016), "standing still is not a move");
assert.ok(M.add(st, 130, 100, 1032));
assert.strictEqual(st.pts.length, 2);
assert.ok(M.speed01(st) > 0);
assert.strictEqual(M.stillFor(st, 2032), 1, "one second since the last move");

const pts = M.pointsFor(st, 1032, 0.5, 100, 0);
assert.deepStrictEqual(pts.map(p => [p.x, p.y]), [[30, 100], [0, 100]], "newest first, in screen coordinates");
assert.ok(pts[0].t === 0 && pts[1].t > 0 && pts[1].t < 1);
M.prune(st, 3000, 0.5);
assert.strictEqual(st.pts.length, 0, "older than the trail lasts: forgotten");

for (let i = 0; i < 400; i++) M.add(st, i, 0, 4000 + i);
assert.ok(st.pts.length <= 160, "the path is capped");

const jump = M.fresh();
M.add(jump, 0, 0, 9000);
M.add(jump, 3800, 0, 9000.5);
assert.ok(jump.speed <= 8000, "a jump between screens in the same millisecond is not 'flying' at " + jump.speed);

// shaking: left-right runs of 60 px, every 60 ms
const sh = M.fresh();
let x = 500, t = 10000, shook = false;
for (let i = 0; i < 8 && !shook; i++) {
    const dir = i % 2 ? -1 : 1;
    for (let k = 0; k < 3; k++) { x += dir * 20; t += 20; M.add(sh, x, 300, t); }
    shook = M.shaken(sh, t, 5);
}
assert.ok(shook, "a quick left-right shake is noticed");
const calm = M.fresh();
for (let i = 0; i < 40; i++) M.add(calm, 100 + i * 15, 300, 20000 + i * 16);
assert.ok(!M.shaken(calm, 20640, 10), "a straight move is not a shake");
console.log("motion tests: ok");

// ---- the pointer commands ------------------------------------------------------
const P = new Function(load("Pointer.js") + "; return { iconDirs, scanArgs, parseThemes, setcursorArgs, optionsArgs, getoptionArgs, parseOption, baseTheme, xcursorArgs, gtkGetArgs, gtkSetArgs, parseGsetting };")();
assert.deepStrictEqual(P.iconDirs("/home/me", ""), ["/home/me/.local/share/icons", "/home/me/.icons", "/usr/local/share/icons", "/usr/share/icons"]);
assert.deepStrictEqual(P.parseThemes("/usr/share/icons/Adwaita\n/home/me/.icons/Bibata-Modern-Ice\n/usr/share/icons/Adwaita\n/usr/share/icons/default\n/x/$(id)\n/x/-rf\n"),
    ["Adwaita", "Bibata-Modern-Ice"], "names, sorted, each once, nothing odd");
assert.deepStrictEqual(P.setcursorArgs("Bibata-Modern-Ice", 32), ["hyprctl", "setcursor", "Bibata-Modern-Ice", "32"]);
assert.strictEqual(P.setcursorArgs("--help", 24), null);
assert.strictEqual(P.setcursorArgs("Adwaita", 4), null, "sizes stay sensible");
assert.deepStrictEqual(P.optionsArgs({ inactive_timeout: 5, hide_on_key_press: true }),
    ["hyprctl", "eval", "hl.config({ cursor = { inactive_timeout = 5, hide_on_key_press = true } })"]);
assert.strictEqual(P.optionsArgs({ inactive_timeout: "5); os.execute('x" }), null, "only numbers and true/false reach Lua");
assert.strictEqual(P.optionsArgs({}), null);
assert.strictEqual(P.getoptionArgs("general:gaps_in"), null);
assert.strictEqual(P.parseOption('{"option":"cursor:inactive_timeout","int":3,"set":true}'), 3);
assert.strictEqual(P.parseOption('{"option":"cursor:hide_on_key_press","bool":true}'), 1);
assert.strictEqual(P.parseOption("no"), null);
assert.deepStrictEqual(P.parseThemes("/home/me/.local/share/icons/plume-a\n/home/me/.local/share/icons/plume-b\n/usr/share/icons/Adwaita\n"),
    ["Adwaita"], "the cursor made in Plume is not listed as a theme");
assert.deepStrictEqual(P.setcursorArgs("plume-b", 24), ["hyprctl", "setcursor", "plume-b", "24"]);
assert.deepStrictEqual(P.setcursorArgs("default", 24), ["hyprctl", "setcursor", "default", "24"], "back to the system default");
assert.deepStrictEqual(P.optionsArgs({ enable_hyprcursor: true }), ["hyprctl", "eval", "hl.config({ cursor = { enable_hyprcursor = true } })"]);
assert.strictEqual(P.optionsArgs({ enable_hyprcursor: "true" }), null);

// the XCursor copy and GTK's cursor
assert.deepStrictEqual(P.xcursorArgs("/p/tools/xcursor.py", "/home/me/.local/share/icons/plume-a", 24),
    ["python3", "-I", "/p/tools/xcursor.py", "/home/me/.local/share/icons/plume-a", "24"]);
assert.strictEqual(P.xcursorArgs("/p/tools/xcursor.py", "/usr/share/icons/Adwaita", 24), null, "only Plume's own folders");
assert.strictEqual(P.xcursorArgs("/p/tools/xcursor.py", "/x/../plume-a", 24), null);
assert.strictEqual(P.xcursorArgs("/tmp/evil.py", "/h/plume-a", 24), null, "only the bundled script");
assert.strictEqual(P.xcursorArgs("/p/tools/xcursor.py", "/h/plume-a", 1000), null);
assert.deepStrictEqual(P.gtkGetArgs("cursor-theme"), ["gsettings", "get", "org.gnome.desktop.interface", "cursor-theme"]);
assert.strictEqual(P.gtkGetArgs("gtk-theme"), null, "only the cursor keys");
assert.deepStrictEqual(P.gtkSetArgs("cursor-theme", "plume-b"), ["gsettings", "set", "org.gnome.desktop.interface", "cursor-theme", "plume-b"]);
assert.deepStrictEqual(P.gtkSetArgs("cursor-size", 32), ["gsettings", "set", "org.gnome.desktop.interface", "cursor-size", "32"]);
assert.strictEqual(P.gtkSetArgs("cursor-theme", "--help"), null);
assert.strictEqual(P.gtkSetArgs("cursor-size", "24; x"), null);
assert.strictEqual(P.parseGsetting("cursor-theme", "'Bibata-Modern-Ice'\n"), "Bibata-Modern-Ice");
assert.strictEqual(P.parseGsetting("cursor-theme", "'plume-a'\n"), "default", "never remembered as the one to go back to");
assert.strictEqual(P.parseGsetting("cursor-size", "24\n"), 24);
assert.strictEqual(P.parseGsetting("cursor-size", "uint32 48\n"), 48);
assert.strictEqual(P.parseGsetting("cursor-theme", "'a'b'"), null);
assert.deepStrictEqual(P.getoptionArgs("cursor:enable_hyprcursor"), ["hyprctl", "-j", "getoption", "cursor:enable_hyprcursor"]);
assert.strictEqual(P.baseTheme("Bibata", ""), "Bibata");
assert.strictEqual(P.baseTheme("plume-a", "Bibata"), "Bibata", "never goes back to its own cursor");
assert.strictEqual(P.baseTheme("omarchy-startup", ""), "default", "nor to the blank startup cursor");
assert.strictEqual(P.baseTheme("", "$(x)"), "default");
console.log("pointer tests: ok");
