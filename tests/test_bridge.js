// node tests/test_bridge.js: the replacement-bar bridge and the panel surface
const fs = require("fs"), path = require("path"), assert = require("assert");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, "qml", f), "utf8");
const load = (f) => read(f).replace(/^\.pragma.*$/m, "");

const B = new Function(load("js/BarBridge.js") + "; return { publish, current, clear };")();
const service = read("Service.qml");
const proxy = read("panel/ServiceProxy.qml");
const widget = read("BarWidget.qml");

// ---- the bridge itself ------------------------------------------------------
{
    let reads = 0;
    const calls = [];
    const api = B.publish(() => ({ count: ++reads }), {
        set: function(a, b) { calls.push([a, b]); return "ok" },
        nested: { not: "a function" }
    });

    assert.deepStrictEqual(Object.keys(api), ["snapshot", "call"]);
    assert.ok(Object.isFrozen(api), "the published api is frozen");
    assert.deepStrictEqual(api.snapshot(), { count: 1 }, "the snapshot is read fresh every time");
    assert.notStrictEqual(api.snapshot(), api.snapshot(), "never the same object");
    assert.strictEqual(api.call("set", [1, 2]), "ok");
    assert.deepStrictEqual(calls, [[1, 2]]);
    api.call("set", "not an array");
    assert.deepStrictEqual(calls[1], [undefined, undefined], "missing args are an empty call");

    for (const name of ["unknown", "constructor", "__proto__", "toString", "nested"])
        assert.strictEqual(api.call(name, [1]), undefined, name + " is not callable");
    assert.strictEqual(B.current(), api);
}

// ---- clear and replacement --------------------------------------------------
{
    let calls = 0;
    const old = B.publish(() => ({ generation: 1 }), { act: function() { calls++ } });
    const next = B.publish(() => ({ generation: 2 }), { act: function() { calls++ } });
    B.clear(old);
    assert.strictEqual(B.current(), next, "a retired service does not clear a newer one");
    assert.strictEqual(old.snapshot(), null);
    assert.strictEqual(old.call("act"), undefined);
    assert.strictEqual(calls, 0);
    assert.strictEqual(next.snapshot().generation, 2);
    next.call("act");
    assert.strictEqual(calls, 1);
    B.clear(next);
    assert.strictEqual(B.current(), null);
}

// ---- every field the proxy reads is in the service snapshot -----------------
{
    const start = service.indexOf("function barSnapshot")
    const end = service.indexOf("function setShellSettings")
    assert.ok(start >= 0 && end > start, "Service.qml has barSnapshot before setShellSettings")
    const snapshot = service.slice(start, end)

    for (const match of proxy.matchAll(/snapshot\.([A-Za-z_][A-Za-z0-9_]*)/g))
        assert.ok(snapshot.includes(match[1] + ":"), "barSnapshot publishes " + match[1])
    for (const match of proxy.matchAll(/list\("([^"]+)"/g))
        assert.ok(snapshot.includes(match[1] + ":"), "barSnapshot publishes " + match[1])
}

// ---- every action the proxy calls is allowlisted ---------------------------
{
    const actions = service.slice(service.indexOf("BarBridge.publish"))
    assert.ok(actions.length > 0, "Service.qml publishes the bridge")
    for (const match of proxy.matchAll(/call\("([A-Za-z_][A-Za-z0-9_]*)"/g))
        assert.ok(new RegExp("\\b" + match[1] + "\\(").test(actions), "the service allows " + match[1])
}

// ---- the widget uses the bridge only as a fallback --------------------------
assert.ok(widget.includes('import "js/BarBridge.js" as BarBridge'))
assert.ok(widget.includes("BarBridge.current()"), "the widget reads the published bridge")
assert.ok(widget.includes("ServiceProxy"), "the widget exposes the snapshot through the proxy")
assert.ok(widget.includes("directService"), "the built-in bar keeps the direct service")
assert.ok(widget.includes("setShellSettings"), "the widget hands over its shell.json entry")
assert.ok(widget.includes("function open()"), "the settings can be opened by the shell")
assert.ok(widget.includes("readonly property bool opened"), "the shell can see whether they are open")
assert.ok(service.includes("function setShellSettings"),
    "the service accepts the widget's shell.json entry through the bridge")

console.log("test_bridge: ok")
