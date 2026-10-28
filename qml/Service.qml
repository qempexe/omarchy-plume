import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import "core"
import "js/Schema.js" as Schema
import "js/Theme.js" as Theme
import "js/Motion.js" as Motion
import "js/Pointer.js" as Pointer
import "js/Ink.js" as Ink
import "js/Cursor.js" as Cursor
import "js/BarBridge.js" as BarBridge

// Shared brain of Plume, one for the whole shell:
//   * the settings and the saved looks
//   * where the pointer is, asked from Hyprland's own socket (no process per frame)
//   * the pointer's path, its speed, and shakes
//   * the cursor theme, its size and how it hides, through hyprctl
//   * the cursor you design: made into a Hyprcursor theme (core/CursorForge.qml)
//   * the effects layer on every screen (overlay/Overlay.qml)
Item {
    id: root

    property var shell: null
    property var manifest: null
    property var barBridge: null

    readonly property string pluginId: "io.github.qempexe.plume"

    // ---- settings ----------------------------------------------------------------
    // What was changed in the settings panel, kept in memory (instant) and saved to
    // ~/.local/state/omarchy-plume/settings.json. Saved looks go to looks.json next to
    // it, so Reset all never touches them.
    property SettingsStore store: SettingsStore { }
    property SettingsStore looksStore: SettingsStore { fileName: "looks.json" }
    // what the pointer was before Plume changed it, to put back with "As Omarchy sets it"
    property SettingsStore pointerStore: SettingsStore { fileName: "pointer.json" }
    readonly property var local: store.values

    // the widget's entry in shell.json, handed over by the bar widget
    property var shellSettings: ({})
    readonly property var cfg: Schema.resolve(root.shellSettings, store.values)

    function setSetting(key, value) { store.set(key, Schema.cleanValue(key, value)) }

    // ---- looks --------------------------------------------------------------------
    function current() { return Schema.resolve(root.shellSettings, store.values) }

    readonly property var slots: {
        const raw = looksStore.values.slots
        const out = []
        for (let i = 0; i < Schema.SLOTS; i++) out.push(Array.isArray(raw) ? Schema.cleanSettings(raw[i]) : null)
        return out
    }
    readonly property bool canUndo: !!Schema.cleanSettings(looksStore.values.undo)

    // Put on a look (a ready made one by key, or a set of values), or with `all` a whole
    // saved place, every setting in it. Everything as it was before is kept, so it can
    // be undone.
    function wear(look, all) {
        const clean = all ? Schema.cleanSettings(look) : Schema.cleanLook(look)
        if (!clean) return false
        looksStore.set("undo", Schema.settingsOf(current()))
        store.setMany(clean)
        return true
    }
    function applyLook(key) { return wear(Schema.lookSet(key)) }
    // a ready made cursor, put on
    function wearCursor(key) {
        const set = Schema.cursorLookSet(key)
        if (!set) return false
        looksStore.set("undo", Schema.settingsOf(current()))
        store.setMany(set)
        return true
    }
    function stepLook(d) {
        const keys = Schema.lookOptions
        const i = keys.indexOf(Schema.lookNow(current()))
        const next = keys[((i < 0 ? (d > 0 ? -1 : 0) : i) + d + keys.length) % keys.length]
        return applyLook(next) ? next : ""
    }
    function nextLook() { return stepLook(1) }
    function undoLook() {
        const back = Schema.cleanSettings(looksStore.values.undo)
        if (!back) return false
        looksStore.set("undo", null)
        store.setMany(back)
        return true
    }
    function setSlot(n, look) {
        const list = []
        for (let i = 0; i < Schema.SLOTS; i++) list.push(slots[i])
        list[n] = look
        looksStore.set("slots", list)
    }
    function saveSlot(n) {
        if (!(n >= 0 && n < Schema.SLOTS)) return false
        setSlot(n, Schema.settingsOf(current()))
        return true
    }
    function saveNew() {
        const free = slots.indexOf(null)
        return free >= 0 && saveSlot(free) ? free : -1
    }
    function loadSlot(n) { return n >= 0 && n < Schema.SLOTS && !!slots[n] && wear(slots[n], true) }
    function clearSlot(n) { if (n >= 0 && n < Schema.SLOTS) setSlot(n, null) }
    function exportLook() { return JSON.stringify(Schema.lookOf(current())) }
    function importLook(text) {
        if (typeof text !== "string" || text.length > 8192) return false
        try { return wear(JSON.parse(text)) } catch (e) { return false }
    }

    // ---- a bar that is not the built-in one ---------------------------------------
    // Omarchy gives a replacement bar a service-less facade, so its widget cannot
    // hold this object. It reads one detached snapshot and calls a short list of
    // actions instead; js/BarBridge.js carries both. The built-in bar keeps the
    // direct service path and never polls.
    function barSnapshot() {
        return JSON.parse(JSON.stringify({
            cfg: root.cfg,
            version: root.manifest && root.manifest.version ? String(root.manifest.version) : "",
            themePalette: root.themePalette,
            borderColors: root.borderColors,
            borderAngle: root.borderAngle,
            colorCtx: root.colorCtx,
            cursorDesign: root.cursorDesign,
            cursorArrow: root.cursorArrow,
            cursorHot: root.cursorHot,
            ownCursor: root.ownCursor,
            cursorStatus: root.cursorStatus,
            cursorThemes: root.cursorThemes,
            slots: root.slots,
            canUndo: root.canUndo
        }))
    }

    // this widget's entry in shell.json, handed over by the bar widget
    function setShellSettings(next) {
        if (!next || typeof next !== "object" || Array.isArray(next)) return false
        const clean = {}
        for (const key of Object.keys(next)) {
            if (Schema.byKey[key]) clean[key] = Schema.cleanValue(key, next[key])
        }
        root.shellSettings = clean
        return true
    }

    // a saved place to put on at every login
    property bool startedLook: false
    Connections {
        target: root.store
        function onLoadedChanged() { root.startup() }
    }
    Connections {
        target: root.looksStore
        function onLoadedChanged() { root.startup() }
    }
    Connections {
        target: root.pointerStore
        function onLoadedChanged() { root.startup() }
    }
    function startup() {
        if (startedLook || !store.loaded || !looksStore.loaded || !pointerStore.loaded) return
        startedLook = true
        const n = parseInt(cfg.startLook)
        if (n >= 1 && n <= Schema.SLOTS && slots[n - 1]) wear(slots[n - 1], true)
        applyPointer()
        // not worn, but GTK still points at it (the shell stopped before it was put back)
        if (!ownCursor) { forge.retire(""); restoreGtk() }
        lateApply.start()
    }

    // ---- the theme's colors -------------------------------------------------------
    // For the Theme palette and Window border color modes: the theme's named colors
    // from colors.toml, and the active window border from hyprland.lua (or .conf, or
    // the hyprland_active_border line some themes keep in colors.toml). Only #rrggbb
    // values and an angle are taken from these files.
    property var themePalette: []
    property var tomlBorder: ({ colors: [], angle: 0 })
    property var luaBorder: ({ colors: [], angle: 0 })
    property var confBorder: ({ colors: [], angle: 0 })
    property bool luaMissing: false
    readonly property var borderColors: luaBorder.colors.length > 0 ? luaBorder.colors
        : (confBorder.colors.length > 0 ? confBorder.colors : tomlBorder.colors)
    readonly property real borderAngle: luaBorder.colors.length > 0 ? luaBorder.angle
        : (confBorder.colors.length > 0 ? confBorder.angle : tomlBorder.angle)
    readonly property string themeDir: {
        try { return Color.currentThemePath ? String(Color.currentThemePath) : "" } catch (e) { return "" }
    }

    function fileText(fv) {
        try { const t = typeof fv.text === "function" ? fv.text() : fv.text; return typeof t === "string" ? t : "" } catch (e) { return "" }
    }
    FileView {
        id: paletteFile
        path: root.themeDir !== "" ? root.themeDir + "/colors.toml" : ""
        watchChanges: true
        onFileChanged: reload()
        onLoaded: {
            const t = root.fileText(paletteFile)
            root.themePalette = Theme.parsePalette(t)
            root.tomlBorder = Theme.parseBorder(t)
        }
        onLoadFailed: { root.themePalette = []; root.retryTheme() }
    }
    FileView {
        id: borderLua
        path: root.themeDir !== "" ? root.themeDir + "/hyprland.lua" : ""
        watchChanges: true
        onFileChanged: reload()
        onLoaded: { root.luaMissing = false; root.luaBorder = Theme.parseBorder(root.fileText(borderLua)) }
        onLoadFailed: { root.luaBorder = ({ colors: [], angle: 0 }); root.luaMissing = true }
    }
    FileView {
        id: borderConf
        // only looked at when the theme has no hyprland.lua
        path: root.themeDir !== "" && root.luaMissing ? root.themeDir + "/hyprland.conf" : ""
        watchChanges: true
        onFileChanged: reload()
        onPathChanged: if (path === "") root.confBorder = ({ colors: [], angle: 0 })
        onLoaded: root.confBorder = Theme.parseBorder(root.fileText(borderConf))
        onLoadFailed: root.confBorder = ({ colors: [], angle: 0 })
    }
    property int themeTries: 0
    function retryTheme() { if (themeTries < 3) { themeTries++; themeRetry.restart() } }
    Timer {
        id: themeRetry
        interval: 800
        onTriggered: { paletteFile.reload(); borderLua.reload(); borderConf.reload() }
    }
    Connections {
        target: Color
        ignoreUnknownSignals: true
        function onAccentChanged() { root.themeTries = 0; themeRetry.restart() }
        function onBackgroundChanged() { root.themeTries = 0; themeRetry.restart() }
    }

    // the colors the effects are painted with, as [r, g, b]
    function hexes(list) {
        const out = []
        for (const h of list || []) { const c = Ink.hex(h); if (c) out.push(c) }
        return out
    }
    function rgb(c) { return [c.r * 255, c.g * 255, c.b * 255] }
    readonly property var colorCtx: ({
        accent: rgb(Color.accent),
        foreground: rgb(Color.foreground),
        background: rgb(Color.background),
        palette: hexes(root.themePalette),
        border: hexes(root.borderColors),
        custom: Ink.hex(root.cfg.customColor),
        custom2: Ink.hex(root.cfg.customColor2),
        borderAngle: root.borderAngle
    })

    // ---- the pointer: where it is -------------------------------------------------------
    // Hyprland answers `j/cursorpos` on its request socket with {"x": .., "y": ..}, in
    // the same layout coordinates the screens use. One short connection per frame, from
    // the shell itself; at most 256 characters of answer are kept.
    readonly property string socketPath: {
        const run = Quickshell.env("XDG_RUNTIME_DIR") || ""
        const sig = Quickshell.env("HYPRLAND_INSTANCE_SIGNATURE") || ""
        if (run.indexOf("/") !== 0 || !/^[A-Za-z0-9_.-]{1,128}$/.test(sig) || sig === "." || sig === "..") return ""
        return run + "/hypr/" + sig + "/.socket.sock"
    }

    readonly property bool tracking: root.cfg.enabled && root.socketPath !== ""
    property var motion: Motion.fresh()
    property bool asking: false
    property double askedAt: 0
    property string answerBuf: ""
    property int failures: 0

    // a frame: the overlays repaint when this changes
    property int frame: 0
    property double now: Date.now()
    property double lastFrame: Date.now()
    property real dt: 1 / 60
    property real moved: 0
    property bool overlayBusy: false              // an effect is still animating on its own
    property double findAt: -1e9                  // when the last find burst started
    readonly property real life: root.cfg.trailLife / 100

    function ask() {
        if (root.socketPath === "") return
        if (root.asking) {
            // Hyprland always answers at once; a request still open after half a
            // second is dropped and asked again
            if (Date.now() - root.askedAt < 500) return
            hypr.connected = false
        }
        root.asking = true
        root.askedAt = Date.now()
        root.answerBuf = ""
        hypr.connected = true
    }

    function takeAnswer() {
        root.asking = false
        const p = Motion.parse(root.answerBuf)
        root.answerBuf = ""
        if (!p) { root.failures++; return }
        root.failures = 0
        if (Motion.add(root.motion, p.x, p.y, Date.now()) && root.cfg.shake
                && Motion.shaken(root.motion, Date.now(), root.cfg.shakeSensitivity))
            root.find()
    }

    Socket {
        id: hypr
        path: root.socketPath
        parser: SplitParser {
            splitMarker: ""
            onRead: data => {
                if (root.answerBuf.length + data.length <= 256) root.answerBuf += data
                else root.answerBuf = "!"
                // The whole answer is in: hang up before Hyprland does. Left to Hyprland,
                // every request ends in a "peer closed" warning in the shell's log.
                if (/\}\s*$/.test(root.answerBuf) || root.answerBuf === "!") hypr.connected = false
            }
        }
        onConnectedChanged: {
            if (connected) {
                write("j/cursorpos")
                flush()
            } else if (root.asking) {
                root.takeAnswer()
            }
        }
        // Hyprland closing the connection after its answer is how every request ends
        onError: function(error) {
            if (root.asking && root.answerBuf !== "") { root.takeAnswer(); return }
            root.asking = false
            root.failures++
        }
    }

    // Each tick asks where the pointer is and advances the effects. While the pointer
    // rests and nothing animates, it only checks a few times a second.
    readonly property bool resting: Motion.stillFor(root.motion, root.now) > root.life + 0.6
                                    && !root.overlayBusy && root.now - root.findAt > 1600
    Timer {
        id: ticker
        interval: root.resting ? 125 : Math.round(1000 / Number(root.cfg.fps))
        repeat: true
        running: root.tracking
        onTriggered: root.tick()
    }
    function tick() {
        const t = Date.now()
        root.dt = Math.min(0.25, (t - root.lastFrame) / 1000)
        root.lastFrame = t
        root.now = t
        Motion.prune(root.motion, t, root.life)
        root.moved = root.motion.moved
        root.motion.moved = 0
        root.ask()
        root.frame++
    }

    function find() { root.findAt = Date.now() }

    // ---- the pointer: theme, size and hiding ------------------------------------------------
    property var cursorThemes: []
    property string appliedCursor: ""
    property string appliedOptions: ""

    function scanThemes() {
        const dirs = Pointer.iconDirs(Quickshell.env("HOME") || "", Quickshell.env("XDG_DATA_HOME") || "")
        themeScan.start(Pointer.scanArgs(dirs))
    }
    Run {
        id: themeScan
        seconds: 20
        maxOut: 262144
        onDone: function(code, out, err) { root.cursorThemes = Pointer.parseThemes(out) }
    }

    // The theme Omarchy started the session with, to go back to.
    function omarchyCursor() {
        const env = Quickshell.env("XCURSOR_THEME") || ""
        const t = Pointer.baseTheme(env, pointerStore.values.baseTheme)
        if (t === env && t !== "default" && pointerStore.values.baseTheme !== t) pointerStore.set("baseTheme", t)
        const s = parseInt(Quickshell.env("XCURSOR_SIZE") || "24")
        return { theme: t, size: s >= 8 && s <= 256 ? s : 24 }
    }

    // ---- the cursor made here -----------------------------------------------------------
    // The settings make a design; the design is made into a Hyprcursor theme in
    // ~/.local/share/icons/plume-a (or plume-b, the two taking turns so Hyprland always
    // loads it fresh), and then worn. Theme colors in it follow the Omarchy theme.
    readonly property bool ownCursor: root.cfg.pointerTheme === Schema.MINE
    readonly property var cursorDesign: Cursor.design(root.cfg, root.colorCtx)
    readonly property string cursorKey: Cursor.key(root.cursorDesign)
    readonly property string cursorArrow: Cursor.svgFor("left_ptr", root.cursorDesign)
    readonly property var cursorHot: Cursor.hotspot(Cursor.glyphFor("left_ptr", root.cursorDesign), root.cursorDesign)

    CursorForge {
        id: forge
        worn: typeof root.pointerStore.values.cursorSlot === "string" ? root.pointerStore.values.cursorSlot : ""
        onBuilt: function(name, key) {
            root.pointerStore.set("cursorSlot", name)
            root.applyPointer()
        }
        onXcursorMade: function(name, size) {
            if (root.ownCursor && name === forge.builtName && size === root.cfg.pointerSize) root.wearGtk(name, size)
        }
    }
    readonly property string cursorStatus: forge.error !== "" ? forge.error
        : (forge.busy ? "Making your cursor…" : "")
    Timer {
        id: forgeDelay
        interval: 350
        onTriggered: root.applyPointer()
    }
    onCursorKeyChanged: if (startedLook && ownCursor) forgeDelay.restart()

    function applyPointer() {
        if (!store.loaded) return
        // the cursor theme and size
        let want = null, key = ""
        if (root.ownCursor) {
            if (forge.builtKey !== root.cursorKey || forge.builtName === "") {
                forge.build(root.cursorDesign, root.cursorKey, omarchyCursor().theme)
                return                          // worn once it is made (onBuilt)
            }
            want = { theme: forge.builtName, size: root.cfg.pointerSize }
            key = forge.builtName + "|" + root.cursorKey + "|" + want.size
        } else if (root.cfg.pointerTheme !== "") {
            want = { theme: root.cfg.pointerTheme, size: root.cfg.pointerSize }
            key = want.theme + "|" + want.size
        } else {
            want = omarchyCursor()
        }
        if (key !== root.appliedCursor) {
            const wasChanged = root.appliedCursor !== "" || pointerStore.values.changed === true
            root.appliedCursor = key
            if (key !== "" || wasChanged) {
                const argv = Pointer.setcursorArgs(want.theme, want.size)
                if (argv) cursorRun.start(argv)
                pointerStore.set("changed", key !== "")
            }
        }
        // and as XCursor too, for the programs that only know XCursor; worn there once made
        if (root.ownCursor && key !== root.xcursorKey) {
            root.xcursorKey = key
            forge.xcursor(forge.builtName, root.cfg.pointerSize)
        }
        // hiding: remember Hyprland's own values the first time they are changed
        const opts = {}
        const saved = pointerStore.values
        if (root.cfg.hideAfter !== "keep") opts.inactive_timeout = parseInt(root.cfg.hideAfter)
        else if (typeof saved.inactive_timeout === "number") opts.inactive_timeout = saved.inactive_timeout
        if (root.cfg.hideTyping !== "keep") opts.hide_on_key_press = root.cfg.hideTyping === "on"
        else if (typeof saved.hide_on_key_press === "boolean") opts.hide_on_key_press = saved.hide_on_key_press
        // the cursor made here is a Hyprcursor theme, so Hyprcursor has to be on to show it
        if (root.ownCursor) opts.enable_hyprcursor = true
        else if (typeof saved.enable_hyprcursor === "boolean") opts.enable_hyprcursor = saved.enable_hyprcursor
        const okey = JSON.stringify(opts)
        if (okey === root.appliedOptions) return
        root.appliedOptions = okey
        if (root.cfg.hideAfter !== "keep" && typeof saved.inactive_timeout !== "number") rememberOption("cursor:inactive_timeout")
        if (root.cfg.hideTyping !== "keep" && typeof saved.hide_on_key_press !== "boolean") rememberOption("cursor:hide_on_key_press")
        if (root.ownCursor && typeof saved.enable_hyprcursor !== "boolean") rememberOption("cursor:enable_hyprcursor")
        // set only after Hyprland's own values have been read, or ours would be remembered
        root.pendingOptions = Pointer.optionsArgs(opts)
        if (root.asked.length === 0 && !optionRead.running) root.flushOptions()
        // back to Hyprland's own: forget what was remembered
        if (root.cfg.hideAfter === "keep" && typeof saved.inactive_timeout === "number") pointerStore.set("inactive_timeout", null)
        if (root.cfg.hideTyping === "keep" && typeof saved.hide_on_key_press === "boolean") pointerStore.set("hide_on_key_press", null)
        if (!root.ownCursor && typeof saved.enable_hyprcursor === "boolean") pointerStore.set("enable_hyprcursor", null)
    }
    readonly property string pointerKey: [cfg.pointerTheme, cfg.pointerSize, cfg.hideAfter, cfg.hideTyping].join("|")
    onPointerKeyChanged: if (startedLook) Qt.callLater(applyPointer)
    // While the cursor made here is not worn, its folders are no themes, so Hyprland never
    // picks one by itself at the next login
    onOwnCursorChanged: if (startedLook && !ownCursor) { forge.retire(""); root.xcursorKey = ""; restoreGtk() }

    // ---- GTK's cursor ---------------------------------------------------------------
    // GTK 3 programs (WebKitGTK apps among them) draw the cursor themselves from GTK's
    // cursor theme rather than asking Hyprland, so the XCursor copy is worn there too.
    // GTK's own theme and size are remembered the first time, and put back when the cursor
    // made here is taken off.
    property string xcursorKey: ""
    property var gtkQueue: []                // [{ argv, get }]
    function wearGtk(name, size) {
        const saved = pointerStore.values
        const q = []
        if (typeof saved.gtkTheme !== "string")
            q.push({ argv: Pointer.gtkGetArgs("cursor-theme"), get: "cursor-theme" },
                   { argv: Pointer.gtkGetArgs("cursor-size"), get: "cursor-size" })
        q.push({ argv: Pointer.gtkSetArgs("cursor-theme", name) }, { argv: Pointer.gtkSetArgs("cursor-size", size) })
        queueGtk(q)
    }
    function restoreGtk() {
        const saved = pointerStore.values
        if (typeof saved.gtkTheme !== "string") return
        const q = [{ argv: Pointer.gtkSetArgs("cursor-theme", saved.gtkTheme) }]
        if (typeof saved.gtkSize === "number") q.push({ argv: Pointer.gtkSetArgs("cursor-size", saved.gtkSize) })
        queueGtk(q)
        pointerStore.set("gtkTheme", null)
        pointerStore.set("gtkSize", null)
    }
    function queueGtk(items) {
        root.gtkQueue = root.gtkQueue.concat(items.filter((i) => i.argv))
        if (!gtkRun.running) nextGtk()
    }
    function nextGtk() {
        if (root.gtkQueue.length === 0) return
        gtkRun.start(root.gtkQueue[0].argv)
    }
    Run {
        id: gtkRun
        seconds: 5
        maxOut: 1024
        onDone: function(code, out, err) {
            const item = root.gtkQueue[0]
            root.gtkQueue = root.gtkQueue.slice(1)
            if (item && item.get && code === 0) {
                // only the first reading counts: a later one may already be ours
                const v = Pointer.parseGsetting(item.get, out)
                const k = item.get === "cursor-theme" ? "gtkTheme" : "gtkSize"
                if (v !== null && root.pointerStore.values[k] === undefined) root.pointerStore.set(k, v)
            }
            root.nextGtk()
        }
    }

    // Omarchy reveals the cursor a few seconds into a session, setting its own theme as it
    // does; anything but "As Omarchy sets it" is put back on after that.
    Timer {
        id: lateApply
        property int round: 0
        interval: round === 0 ? 6000 : 10000
        onTriggered: {
            if (root.cfg.pointerTheme !== "") { root.appliedCursor = ""; root.applyPointer() }
            if (++round < 2) restart()
        }
    }

    property var asked: []
    property var pendingOptions: null
    function flushOptions() {
        const argv = root.pendingOptions
        root.pendingOptions = null
        if (argv) optionsRun.start(argv)
    }
    function rememberOption(name) {
        const argv = Pointer.getoptionArgs(name)
        if (!argv) return
        asked = asked.concat([name])
        if (!optionRead.running) optionRead.start(argv)
    }
    Run {
        id: optionRead
        seconds: 5
        maxOut: 4096
        onDone: function(code, out, err) {
            const name = root.asked[0]
            root.asked = root.asked.slice(1)
            const v = Pointer.parseOption(out)
            if (v !== null && name === "cursor:inactive_timeout") root.pointerStore.set("inactive_timeout", v)
            if (v !== null && name === "cursor:hide_on_key_press") root.pointerStore.set("hide_on_key_press", v !== 0)
            if (v !== null && name === "cursor:enable_hyprcursor") root.pointerStore.set("enable_hyprcursor", v !== 0)
            if (root.asked.length > 0) start(Pointer.getoptionArgs(root.asked[0]))
            else root.flushOptions()
        }
    }
    Run { id: cursorRun; seconds: 10; maxOut: 4096 }
    Run {
        id: optionsRun
        seconds: 10
        maxOut: 4096
        // Hyprcursor may only just have been turned on: wear the cursor made here again,
        // so Hyprland loads it as a Hyprcursor theme
        onDone: function(code, out, err) { if (root.ownCursor && forge.builtName !== "") resend.restart() }
    }
    Timer {
        id: resend
        interval: 150
        onTriggered: {
            const argv = Pointer.setcursorArgs(forge.builtName, root.cfg.pointerSize)
            if (!argv) return
            if (cursorRun.running) restart()
            else cursorRun.start(argv)
        }
    }

    Component.onCompleted: {
        scanThemes()
        root.barBridge = BarBridge.publish(function() { return root.barSnapshot() }, {
            setSetting: function(key, value) {
                const k = String(key || "")
                if (!Schema.byKey[k]) return undefined
                root.setSetting(k, value)
                return root.cfg[k]
            },
            setShellSettings: function(settings) { return root.setShellSettings(settings) },
            find: function() { root.find(); return true },
            stepLook: function(direction) {
                const d = Number(direction)
                return root.stepLook(isFinite(d) && d !== 0 ? (d > 0 ? 1 : -1) : 1) !== ""
            },
            applyLook: function(key) { return root.applyLook(String(key || "")) },
            undoLook: function() { return root.undoLook() },
            saveSlot: function(index) { return root.saveSlot(Math.round(Number(index))) },
            saveNew: function() { return root.saveNew() },
            loadSlot: function(index) { return root.loadSlot(Math.round(Number(index))) },
            clearSlot: function(index) { root.clearSlot(Math.round(Number(index))); return true },
            wearCursor: function(key) { return root.wearCursor(String(key || "")) },
            resetAll: function() { root.store.resetAll(Schema.defaults()); return true }
        })
    }

    Component.onDestruction: {
        BarBridge.clear(root.barBridge)
        putBackGtk()
    }

    // The shell stops (a restart, the plugin turned off or removed): GTK's own cursor goes
    // back right away, so GTK programs never point at a folder that's no theme. The values
    // stay remembered, and the next start wears the copy again once it's made.
    function putBackGtk() {
        const saved = pointerStore.values
        if (!root.ownCursor || typeof saved.gtkTheme !== "string") return
        const theme = Pointer.gtkSetArgs("cursor-theme", saved.gtkTheme)
        const size = typeof saved.gtkSize === "number" ? Pointer.gtkSetArgs("cursor-size", saved.gtkSize) : null
        if (theme) Quickshell.execDetached(theme)
        if (size) Quickshell.execDetached(size)
    }

    // ---- the effects layer ---------------------------------------------------------
    Loader {
        active: root.tracking
        source: "overlay/Overlay.qml"
        onLoaded: item.svc = root
        onStatusChanged: if (status === Loader.Error) console.warn("Plume: the effects layer could not load")
    }

    // ---- ipc: omarchy-shell io.github.qempexe.plume <function> ---------------------------
    IpcHandler {
        target: root.pluginId

        function status(): string {
            return JSON.stringify({
                effects: root.cfg.enabled, trail: root.cfg.trail, halo: root.cfg.halo,
                colors: root.cfg.colorMode, look: Schema.lookNow(root.current()),
                pointer: { x: root.motion.x, y: root.motion.y, speed: Math.round(root.motion.speed) },
                socket: root.socketPath !== "", cursorThemes: root.cursorThemes.length,
                cursor: root.ownCursor ? (forge.builtName || "making") : (root.cfg.pointerTheme || "as Omarchy sets it")
            })
        }
        function toggle(): string { root.setSetting("enabled", !root.cfg.enabled); return root.cfg.enabled ? "on" : "off" }
        function on(): string { root.setSetting("enabled", true); return "on" }
        function off(): string { root.setSetting("enabled", false); return "off" }
        function find(): string { root.find(); return "ok" }
        function look(key: string): string { return root.applyLook(key) ? "ok" : "unknown look" }
        function nextLook(): string { return root.nextLook() }
        function undo(): string { return root.undoLook() ? "ok" : "nothing to undo" }
        function save(slot: int): string { return root.saveSlot(slot - 1) ? "ok" : "slots are 1 to " + Schema.SLOTS }
        function saveNew(): string { const n = root.saveNew(); return n >= 0 ? String(n + 1) : "no free slot" }
        function load(slot: int): string { return root.loadSlot(slot - 1) ? "ok" : "empty slot" }
        function exportLook(): string { return root.exportLook() }
        function importLook(json: string): string { return root.importLook(json) ? "ok" : "not a look" }
        function themes(): string { return root.cursorThemes.join("\n") }
        function cursor(key: string): string { return root.wearCursor(key) ? "ok" : "unknown cursor" }
        function set(key: string, value: string): string {
            if (!Schema.byKey[key]) return "unknown setting"
            root.setSetting(key, value)
            return JSON.stringify(root.cfg[key])
        }
    }
}
