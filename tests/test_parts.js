// Run with: node tests/test_parts.js
// Every trail, halo and color mode: well formed, and drawing without errors or
// broken numbers, at small and big sizes, still and moving; the settings and the
// ready made looks hold together.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { load, mockCtx } = require("./load.js");

const ROOT = path.join(__dirname, "..");
const js = (f) => path.join(ROOT, "qml/js", f);
const Ink = load(js("Ink.js"));
const Trails = load(js("Trails.js"));
const Halos = load(js("Halos.js"));
const Colors = load(js("Colors.js"));
const Find = load(js("Find.js"));
const Schema = load(js("Schema.js"));

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log("ok  " + name); }
    catch (e) { console.log("FAIL " + name + "\n     " + (e && e.message)); process.exitCode = 1; }
}

const colorCtx = { accent: [200, 146, 90], custom: [122, 162, 247], custom2: [247, 118, 142],
                   palette: [[210, 122, 82], [158, 206, 106], [122, 162, 247]], border: [[224, 178, 92], [194, 122, 160]],
                   speed: 0.5, time: 3.2 };

// a curving path, newest first
function path_(n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: 400 - i * 9, y: 300 + Math.sin(i / 4) * 40, t: n > 1 ? i / (n - 1) : 0 });
    return out;
}

function g(ctx, extra) {
    return Object.assign({ ctx: ctx, pts: path_(30), size: 8, strength: 0.85, life: 0.45, dt: 1 / 60, moved: 14,
        mem: {}, time: 2.5, x: 400, y: 300, w: 1920, h: 1080,
        color: (t, a) => Ink.css(Colors.at("rainbow", t, colorCtx), a) }, extra || {});
}

const registries = [["trail", Trails], ["halo", Halos]];
for (const [kind, R] of registries) {
    test(kind + "s: keys unique, labels and abouts present", () => {
        assert.strictEqual(new Set(R.keys).size, R.keys.length);
        for (const k of R.keys) {
            assert.ok(R.labels[k], "label for " + k);
            assert.ok(R.abouts[k], "about for " + k);
            assert.strictEqual(typeof R.byKey[k].draw, "function");
        }
        assert.strictEqual(R.keys[0], "none", "None comes first");
    });
    for (const k of R.keys) {
        test(kind + " " + k + " draws clean numbers", () => {
            for (const size of [2, 8, 30, 240]) for (const pts of [path_(0), path_(1), path_(2), path_(60)]) {
                const ctx = mockCtx();
                const gg = g(ctx, { size: size, pts: pts, mem: {} });
                for (let f = 0; f < 5; f++) R.byKey[k].draw(gg);
                assert.deepStrictEqual(ctx.bad, [], k + " at size " + size);
            }
        });
    }
}

test("particles stay capped", () => {
    for (const k of ["sparks", "bubbles"]) {
        const gg = g(mockCtx(), { moved: 500, mem: {} });
        for (let f = 0; f < 400; f++) Trails.byKey[k].draw(gg);
        const n = (gg.mem.parts || gg.mem.bubbles).length;
        assert.ok(n <= 180, k + " has " + n);
    }
});

test("the find burst draws, then ends", () => {
    const ctx = mockCtx();
    assert.ok(Find.draw(g(ctx), 0.3));
    assert.ok(!Find.draw(g(ctx), 5));
    assert.deepStrictEqual(ctx.bad, []);
});

test("every color mode gives a color everywhere along the trail", () => {
    for (const k of Colors.keys) for (const t of [0, 0.3, 1]) {
        for (const c of [colorCtx, { accent: [255, 255, 255], palette: [], border: [], speed: 0, time: 0 }]) {
            const out = Colors.at(k, t, c);
            assert.ok(out.length >= 3 && out.slice(0, 3).every((v) => isFinite(v) && v >= 0 && v <= 255.001), k + " " + JSON.stringify(out));
        }
    }
});

test("css is a plain rgba string", () => {
    assert.strictEqual(Ink.css([10, 20, 30], 0.5), "rgba(10,20,30,0.500)");
    assert.strictEqual(Ink.css([10, 20, 30, 0.5], 0.5), "rgba(10,20,30,0.250)");
});

test("schema: every default is valid and survives cleanValue", () => {
    const d = Schema.defaults();
    for (const k in d) assert.deepStrictEqual(Schema.cleanValue(k, d[k]), d[k], k);
    assert.strictEqual(Schema.cleanValue("trail", "nope"), "comet");
    assert.strictEqual(Schema.cleanValue("trailSize", 999), 30);
    assert.strictEqual(Schema.cleanValue("pointerTheme", "Bibata-Modern-Ice"), "Bibata-Modern-Ice");
    assert.strictEqual(Schema.cleanValue("pointerTheme", "$(rm -rf ~)"), "");
    assert.strictEqual(Schema.cleanValue("hideAfter", 5), "5");
});

test("looks: each one is a real, different set of looks keys", () => {
    const seen = new Set();
    for (const key of Schema.lookOptions) {
        const s = Schema.lookSet(key);
        for (const k in s) assert.ok(Schema.lookKeys.indexOf(k) >= 0);
        const id = JSON.stringify(s);
        assert.ok(!seen.has(id), key + " is the same as another look");
        seen.add(id);
        assert.strictEqual(Schema.lookNow(Object.assign(Schema.defaults(), s)), key);
    }
    assert.strictEqual(Schema.lookSet("nope"), null);
    for (const L of Schema.looks) for (const k in L.set) assert.ok(Schema.lookKeys.indexOf(k) >= 0, L.key + " sets " + k);
});

test("saved places keep everything but the look at login", () => {
    const v = Object.assign(Schema.defaults(), { pointerTheme: "Adwaita", startLook: "3", trail: "sparks" });
    const s = Schema.settingsOf(v);
    assert.strictEqual(s.pointerTheme, "Adwaita");
    assert.strictEqual(s.startLook, undefined);
    assert.deepStrictEqual(Schema.cleanSettings(s), s);
    assert.strictEqual(Schema.cleanSettings([1]), null);
});

test("manifest.json lists every setting with its default and options", () => {
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
    const bw = m.barWidget;
    assert.strictEqual(JSON.stringify(bw.schema.map((s) => s.key)), JSON.stringify(Schema.items.map((it) => it.key)));
    for (const it of Schema.items) {
        const s = bw.schema.find((x) => x.key === it.key);
        assert.deepStrictEqual(s.defaultValue, it.fallback, it.key);
        assert.deepStrictEqual(bw.defaults[it.key], it.fallback, it.key);
        if (it.options) assert.strictEqual(JSON.stringify(s.options), JSON.stringify(it.options), it.key);
        if (it.kind === "int") assert.deepStrictEqual([s.min, s.max, s.step], [it.min, it.max, it.step], it.key);
    }
});

console.log(passed + " passed");
