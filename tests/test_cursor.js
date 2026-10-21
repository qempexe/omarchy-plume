// Run with: node tests/test_cursor.js
// The cursor made in Plume: every option draws a well formed picture, the theme holds
// what Hyprcursor needs, and the zips are real zips.
const assert = require("assert");
const path = require("path");
const { load } = require("./load.js");

const js = (f) => path.join(__dirname, "..", "qml/js", f);
const Schema = load(js("Schema.js"));
const Cursor = load(js("Cursor.js"));
const Glyphs = load(js("Glyphs.js"));
const Arrows = load(js("Arrows.js"));
const Zip = load(js("Zip.js"));

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log("ok  " + name); }
    catch (e) { console.log("FAIL " + name + "\n     " + (e && e.message)); process.exitCode = 1; }
}

const theme = { accent: [200, 146, 90], foreground: [234, 219, 200], background: [18, 11, 9],
                border: [[224, 178, 92], [194, 122, 160]], palette: [[200, 146, 90], [158, 206, 106]], borderAngle: 30 };
const cfgWith = (set) => Object.assign(Schema.defaults(), { pointerTheme: Schema.MINE }, set || {});

// a picture is well formed: no broken numbers, every tag closed, every url(#id) defined once
function wellFormed(svg, what) {
    assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"') && svg.endsWith("</svg>"), what + ": svg");
    assert.ok(!/NaN|undefined|Infinity|null/.test(svg), what + ": " + (svg.match(/.{30}(NaN|undefined|Infinity|null).{10}/) || [""])[0]);
    const open = (svg.match(/<(g|svg|defs|mask|filter|linearGradient|pattern)[ >]/g) || []).length;
    const close = (svg.match(/<\/(g|svg|defs|mask|filter|linearGradient|pattern)>/g) || []).length;
    assert.strictEqual(open, close, what + ": tags");
    const ids = (svg.match(/ id="([^"]+)"/g) || []).map((s) => s.slice(5, -1));
    assert.strictEqual(new Set(ids).size, ids.length, what + ": ids");
    for (const ref of svg.match(/url\(#([^)]+)\)/g) || []) assert.ok(ids.indexOf(ref.slice(5, -1)) >= 0, what + ": " + ref);
}

test("surfaces, lines and ornaments: keys unique, each with a label and an about", () => {
    for (const R of [Cursor.surfaces, Cursor.lines, Cursor.ornaments]) {
        assert.strictEqual(new Set(R.keys).size, R.keys.length);
        for (const k of R.keys) assert.ok(R.labels[k] && R.abouts[k], k);
    }
    assert.strictEqual(Cursor.surfaces.keys.length, 30);
    assert.strictEqual(Cursor.lines.keys.length, 22);
    assert.strictEqual(Cursor.ornaments.keys.length, 18);
});

test("geometry: grown and shrunk outlines, walked evenly", () => {
    const Geo = load(js("Geo.js"));
    const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
    assert.strictEqual(JSON.stringify(Geo.offset(sq, -1)), "[[1,1],[9,1],[9,9],[1,9]]");
    const out = Geo.offset(sq, 1);
    assert.ok(out.every((p) => p[0] >= -1.001 && p[0] <= 11.001 && p[1] >= -1.001 && p[1] <= 11.001));
    assert.strictEqual(Geo.walk(sq, 1).length, 40);
    assert.strictEqual(Geo.polygonOf({ t: "stroke", d: "M0 0 L1 1", w: 1 }), null);
});

test("arrows: keys unique, each with a label, an about and a shape", () => {
    assert.strictEqual(new Set(Arrows.keys).size, Arrows.keys.length);
    for (const A of Arrows.list) {
        assert.ok(A.label && A.about, A.key);
        assert.ok(A.dot > 0 || (Array.isArray(A.points) && A.points.length >= 3 && A.points[0][0] === 0 && A.points[0][1] === 0), A.key);
    }
});

test("every arrow, surface, fill, texture, depth, line, ornament, shadow and detail draws well", () => {
    const tables = { cursorShape: Arrows.keys, cursorSurface: Cursor.surfaces.keys, cursorLine: Cursor.lines.keys,
                     cursorOrnament: Cursor.ornaments.keys, cursorShadow: Cursor.shadows.keys, cursorDetail: Cursor.details.keys,
                     cursorFill: ["solid", "gradient", "glass"], cursorPattern: ["none", "stripes", "dots", "grid"],
                     cursorDepth: ["flat", "raised", "sunken"], cursorCap: ["none", "tip", "tail", "both"] };
    for (const key in tables) for (const v of tables[key]) for (const tilt of [0, -30, 30]) {
        const d = Cursor.design(cfgWith({ [key]: v, cursorTilt: tilt, cursorRound: 100 }), theme);
        wellFormed(Cursor.svgFor("left_ptr", d), key + "=" + v);
        const h = Cursor.hotspot(Cursor.glyphFor("left_ptr", d), d);
        assert.ok(h[0] >= 0 && h[0] <= 0.5 && h[1] >= 0 && h[1] <= 0.5, key + "=" + v + " hotspot " + h);
    }
});

test("every cursor in the theme, every frame, every hand, beam and spinner", () => {
    for (const hand of Glyphs.handKeys) for (const beam of Glyphs.beamKeys) for (const busy of Glyphs.spinnerKeys) {
        const d = Cursor.design(cfgWith({ cursorHand: hand, cursorBeam: beam, cursorBusy: busy, cursorSurface: "stained", cursorLine: "beads",
                                          cursorOrnament: "studs", cursorOrnamentsOn: "all", cursorLineGradient: true }), theme);
        for (const S of Glyphs.shapes) for (let f = 0; f < (S.frames ? Cursor.FRAMES : 1); f++)
            wellFormed(Cursor.render(S.make(d, f, Cursor.FRAMES), d), S.dir + " " + hand + "/" + beam + "/" + busy + " frame " + f);
    }
});

test("every ready made cursor is different and puts the cursor on", () => {
    const seen = new Set();
    for (const L of Schema.cursorLooks) {
        const set = Schema.cursorLookSet(L.key);
        assert.strictEqual(set.pointerTheme, Schema.MINE);
        for (const k in L.set) assert.ok(Schema.cursorKeys.indexOf(k) >= 0, L.key + " sets " + k);
        const id = JSON.stringify(set);
        assert.ok(!seen.has(id), L.key + " is the same as another");
        seen.add(id);
        assert.strictEqual(Schema.cursorLookNow(Object.assign(Schema.defaults(), set)), L.key);
        wellFormed(Cursor.svgFor("left_ptr", Cursor.design(Object.assign(Schema.defaults(), set), theme)), L.key);
    }
    assert.strictEqual(Schema.cursorLookSet("nope"), null);
});

test("colors: theme, custom and automatic outline", () => {
    const d = Cursor.design(cfgWith({ cursorColor: "custom", cursorColorCustom: "#ff0000", cursorColor2: "border2", cursorLineColor: "auto" }), theme);
    assert.strictEqual(d.c1, "#ff0000");
    assert.strictEqual(d.c2, "#c27aa0");
    assert.strictEqual(d.lineColor, "#faf7f2", "a light line around a dark red");
    assert.strictEqual(Cursor.design(cfgWith({ cursorColor: "white" }), theme).lineColor, "#181412");
    const clear = Cursor.design(cfgWith({ cursorSurface: "clear", cursorLine: "none" }), theme);
    assert.strictEqual(clear.line, "solid", "a clear cursor keeps a line");
    assert.strictEqual(clear.shadow, "none", "and casts no shadow");
    assert.strictEqual(Cursor.design(cfgWith({ cursorColor: "border" }), { accent: [1, 2, 3] }).c1, "#010203", "no border: the accent");
    assert.strictEqual(Cursor.design(cfgWith({ cursorColor: "white", cursorTint: 40 }), { accent: [0, 0, 0] }).c1, "#969696", "the accent tint");
    const g = Cursor.design(cfgWith({ cursorFill: "gradient", cursorGradientTo: "palette", cursorColor: "accent" }), theme);
    assert.strictEqual(g.gradTo, "#9ece6a", "the next theme color, not the same one");
});

test("the theme: 32 cursors, names Hyprcursor accepts, each name once", () => {
    const d = Cursor.design(cfgWith(), theme);
    const t = Cursor.theme(d, "plume-a", "Bibata");
    assert.ok(/^name = plume-a\n/.test(t.manifest) && /cursors_directory = hyprcursors/.test(t.manifest));
    assert.ok(/Inherits=Bibata/.test(t.index));
    assert.strictEqual(t.shapes.length, Glyphs.shapes.length);
    const names = new Set();
    for (const s of t.shapes) {
        assert.ok(!names.has(s.dir)); names.add(s.dir);
        assert.strictEqual(s.files[0].name, "meta.hl");
        const meta = s.files[0].text;
        const hx = parseFloat(/hotspot_x = ([0-9.]+)/.exec(meta)[1]), hy = parseFloat(/hotspot_y = ([0-9.]+)/.exec(meta)[1]);
        assert.ok(hx >= 0 && hx <= 1 && hy >= 0 && hy <= 1, s.dir);
        for (const m of meta.match(/define_size = 0, ([^,\n]+)/g)) assert.ok(/^define_size = 0, [A-Za-z0-9_.-]+\.svg$/.test(m), m);
        for (const m of meta.match(/define_override = (.+)/g) || []) {
            const n = m.split(" = ")[1];
            assert.ok(!names.has(n), n + " answers for two cursors");
            names.add(n);
        }
        for (const f of s.files.slice(1)) assert.ok(meta.indexOf(f.name) >= 0, f.name + " in meta");
    }
    for (const want of ["default", "pointer", "text", "wait", "progress", "not-allowed", "grab", "grabbing", "ew-resize", "ns-resize", "nwse-resize", "nesw-resize", "crosshair", "help", "move"])
        assert.ok(names.has(want), want);
    assert.strictEqual(Cursor.theme(d, "../x", "a"), null, "only plume-a, plume-b ...");
    assert.ok(/Inherits=default/.test(Cursor.theme(d, "plume-b", "$(x)").index));
});

test("the cursor setting takes the cursor made here, and nothing odd", () => {
    assert.strictEqual(Schema.cleanValue("pointerTheme", "*plume"), "*plume");
    assert.strictEqual(Schema.cleanValue("pointerTheme", "*other"), "");
    assert.strictEqual(Schema.cleanValue("cursorShape", "../x"), "classic");
    assert.strictEqual(Schema.cleanValue("cursorTilt", -99), -30);
});

test("the fingerprint changes with the design", () => {
    const a = Cursor.key(Cursor.design(cfgWith(), theme)), b = Cursor.key(Cursor.design(cfgWith({ cursorTilt: 4 }), theme));
    assert.ok(a !== b && /^[0-9a-z]+$/.test(a));
});

test("zip: a real zip, stored, with the right checksums", () => {
    assert.strictEqual(Zip.crc32(Zip.utf8("123456789")).toString(16), "cbf43926");
    assert.strictEqual(JSON.stringify(Zip.utf8("é")), "[195,169]");
    const files = [{ name: "meta.hl", text: "hotspot_x = 0.5\n" }, { name: "a.svg", text: "<svg/>" }];
    const b = new Uint8Array(Zip.zip(files));
    const u32 = (o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
    const u16 = (o) => b[o] | (b[o + 1] << 8);
    assert.strictEqual(u32(0), 0x04034b50);
    const end = b.length - 22;
    assert.strictEqual(u32(end), 0x06054b50);
    assert.strictEqual(u16(end + 10), 2);
    let at = u32(end + 16);
    for (const f of files) {
        assert.strictEqual(u32(at), 0x02014b50);
        const n = u16(at + 28), local = u32(at + 42);
        assert.strictEqual(String.fromCharCode.apply(null, b.slice(at + 46, at + 46 + n)), f.name);
        const size = u32(local + 22), nameLen = u16(local + 26);
        const body = b.slice(local + 30 + nameLen, local + 30 + nameLen + size);
        assert.strictEqual(String.fromCharCode.apply(null, body), f.text);
        assert.strictEqual(u32(local + 14), Zip.crc32(Zip.utf8(f.text)));
        at += 46 + n;
    }
});

console.log(passed + " passed");
