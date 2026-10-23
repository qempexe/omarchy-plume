import QtQuick
import "../js/Schema.js" as Schema

// What the settings panel reads from the service, detached.
//
// The built-in bar hands the widget the live service object. A replacement bar
// only gets a service-less facade, so the widget polls the snapshot the service
// publishes through js/BarBridge.js and exposes it here under the names the
// panel already uses. Nothing in here points back at the service.
QtObject {
    id: root

    property var snapshot: null
    property var api: null

    // A slider calls setSetting on every move. Keep the new value here until the
    // next snapshot carries it back, so the knob never springs back.
    property var pending: ({})

    readonly property var cfg: {
        const values = root.snapshot && root.snapshot.cfg ? root.snapshot.cfg : ({})
        const out = {}
        for (const key in values) out[key] = values[key]
        for (const key in root.pending) out[key] = root.pending[key]
        return out
    }

    readonly property var themePalette: root.list("themePalette")
    readonly property var borderColors: root.list("borderColors")
    readonly property var cursorThemes: root.list("cursorThemes")
    readonly property var slots: root.list("slots")
    readonly property var cursorHot: root.list("cursorHot", [0.2, 0.15])
    readonly property real borderAngle: root.snapshot ? Number(root.snapshot.borderAngle) || 0 : 0
    readonly property var colorCtx: root.snapshot && root.snapshot.colorCtx ? root.snapshot.colorCtx : ({})
    readonly property var cursorDesign: root.snapshot ? root.snapshot.cursorDesign : null
    readonly property string cursorArrow: root.snapshot && root.snapshot.cursorArrow ? String(root.snapshot.cursorArrow) : ""
    readonly property bool ownCursor: root.snapshot ? root.snapshot.ownCursor === true : false
    readonly property string cursorStatus: root.snapshot && root.snapshot.cursorStatus ? String(root.snapshot.cursorStatus) : ""
    readonly property bool canUndo: root.snapshot ? root.snapshot.canUndo === true : false
    readonly property var manifest: ({ version: root.snapshot && root.snapshot.version ? String(root.snapshot.version) : "" })

    // the panel resets through the service; the flag object it passes is ignored
    readonly property QtObject store: QtObject {
        function resetAll(defaults) { root.clearPending(); root.call("resetAll", []) }
    }

    // a new snapshot arrived: drop the values it already carries back
    onSnapshotChanged: root.absorb()

    function list(name, fallback) {
        const value = root.snapshot ? root.snapshot[name] : null
        return Array.isArray(value) ? value : (fallback !== undefined ? fallback : [])
    }

    function absorb() {
        const values = root.snapshot && root.snapshot.cfg ? root.snapshot.cfg : null
        const next = {}
        for (const key in root.pending) {
            if (!values || values[key] !== root.pending[key]) next[key] = root.pending[key]
        }
        root.pending = next
    }

    function clearPending() { if (Object.keys(root.pending).length > 0) root.pending = ({}) }

    function call(name, args) { return root.api ? root.api.call(name, args) : undefined }

    function setSetting(key, value) {
        const clean = Schema.cleanValue(key, value)
        if (clean !== undefined) {
            const next = {}
            for (const k in root.pending) next[k] = root.pending[k]
            next[key] = clean
            root.pending = next
        }
        return root.call("setSetting", [key, value])
    }

    function setShellSettings(settings) { return root.call("setShellSettings", [settings]) }
    function find() { return root.call("find", []) }
    function stepLook(direction) { root.clearPending(); return root.call("stepLook", [direction]) }

    // these change many settings at once; let the next snapshot be the truth
    function applyLook(key) { root.clearPending(); return root.call("applyLook", [key]) }
    function undoLook() { root.clearPending(); return root.call("undoLook", []) }
    function loadSlot(index) { root.clearPending(); return root.call("loadSlot", [index]) }
    function wearCursor(key) { root.clearPending(); return root.call("wearCursor", [key]) }

    function saveSlot(index) { return root.call("saveSlot", [index]) }
    function saveNew() { return root.call("saveNew", []) }
    function clearSlot(index) { return root.call("clearSlot", [index]) }
}
