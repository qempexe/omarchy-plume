import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Io
import qs.Commons
import "../core"
import "../js/Schema.js" as Schema

// Floating settings panel for Plume.
//
//   * Header card: the name, the look being worn, and a live preview of the
//     effects as the settings draw them.
//   * Tabs from js/Schema.js, a search box that looks through all of them and a
//     "Changed only" switch. Every change goes through the service, which keeps it
//     in memory and saves it.
//   * Looks: ready made looks (one step of undo) and twelve places for your own.
//   * Every setting is a SettingRow: plain numbers (no px/ms/%), friendly
//     option names, a one-line hint, and a reset arrow once it differs from
//     the default. Settings that currently have no effect are dimmed.
//   * Colors: Panel colors picks the scheme (Follow theme, Theme palette, Window
//     borders, Custom, Monochrome); Text, the outline, the tint and the opacity
//     follow their own settings.
PopupWindow {
    id: root

    property var svc: null                    // the shared service
    property var shellSettings: ({})          // this widget's entry in shell.json
    property var cfg: ({})                    // every setting, resolved
    property var anchorItem: null
    property bool vertical: false             // bar is on the left / right edge
    property color fg: "white"
    property string fontFamily: ""

    readonly property var store: svc ? svc.store : null

    property int tab: 0
    property bool confirmReset: false
    property string query: ""
    property bool changedOnly: false

    // ---- colors --------------------------------------------------------------
    // Look up a color the shell's theme may expose, trying several likely names.
    // Missing names just return undefined, so an unknown theme falls back to the
    // bar foreground instead of breaking.
    function themeColor(names) {
        for (var i = 0; i < names.length; i++) {
            var raw
            try { raw = Color[names[i]] } catch (e) { raw = undefined }
            if (raw === undefined || raw === null) continue
            try {
                var c = Qt.color(raw)
                if (c && c.valid !== false) return c
            } catch (e2) { }
        }
        return null
    }
    function hexColor(text) {
        var t = String(text)
        return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(t) ? Qt.color(t) : null
    }
    function luma(c) { return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b }

    readonly property bool lightText: luma(fg) > 0.5
    readonly property var themeAccentColor: themeColor(["accent", "primary", "highlight", "accentColor", "color4", "blue"])
    readonly property var themeBgColor: themeColor(["background", "surface", "base", "bg"])
    readonly property var customAccentColor: hexColor(root.cfg.panelCustomColor)

    // The panel's colors, the same choices as the other panels:
    //   theme       the Omarchy theme's background, text and accent, live
    //   palette     the same, with every tab in its own color from the theme's palette
    //   borders     the accent (and the outline) from the active window border
    //   custom      your own background, text and accent
    //   monochrome  no hue at all
    readonly property string panelMode: String(root.cfg.panelColor || "theme")
    readonly property bool useCustom: panelMode === "custom"
    readonly property bool useMono: panelMode === "monochrome"
    readonly property var palette: root.svc ? root.svc.themePalette : []
    readonly property var borderColors: root.svc ? root.svc.borderColors : []

    // Neutral panel, used by monochrome (and by the theme modes when the shell
    // exposes no background).
    readonly property color neutralBg: lightText ? Qt.rgba(0.07, 0.07, 0.09, 1) : Qt.rgba(0.97, 0.97, 0.98, 1)
    readonly property color neutralInk: lightText ? Qt.rgba(0.95, 0.95, 0.96, 1) : Qt.rgba(0.10, 0.10, 0.12, 1)
    readonly property color themeAc: themeAccentColor ? themeAccentColor : fg
    readonly property color surface: useCustom ? (hexColor(root.cfg.panelBg) || neutralBg)
        : (useMono || !themeBgColor ? neutralBg : themeBgColor)

    // accent: filled and selected parts
    readonly property color accent: {
        if (useCustom && customAccentColor) return customAccentColor
        if (useMono) return baseInk
        if (panelMode === "borders" && borderColors.length > 0) return Qt.color(borderColors[0])
        if (panelMode === "palette" && palette.length > 0) return Qt.color(palette[root.tab % palette.length])
        return themeAc
    }
    // ink: text and soft tints
    readonly property color baseInk: useCustom ? (hexColor(root.cfg.panelFg) || fg) : (useMono ? neutralInk : fg)
    readonly property color ink: {
        const t = root.cfg.panelText
        if (t === "custom") return hexColor(root.cfg.panelFg) || baseInk
        if (t === "theme") return fg
        // always readable: black or white when the panel is too close to the text
        if (Math.abs(luma(baseInk) - luma(surface)) >= 0.35) return baseInk
        return luma(surface) > 0.5 ? Qt.rgba(0.07, 0.07, 0.09, 1) : Qt.rgba(0.97, 0.97, 0.98, 1)
    }
    // the background: a wash of the accent, as solid as Panel opacity says
    readonly property real tintK: Math.max(0, Math.min(30, Number(root.cfg.panelTint) || 0)) / 100
    readonly property color panelSolid: Qt.rgba(surface.r + (accent.r - surface.r) * tintK, surface.g + (accent.g - surface.g) * tintK,
                                                surface.b + (accent.b - surface.b) * tintK, 1)
    readonly property color panelBg: Qt.rgba(panelSolid.r, panelSolid.g, panelSolid.b,
                                             Math.max(50, Math.min(100, Number(root.cfg.panelOpacity) || 97)) / 100)
    // Text on top of an accent fill.
    readonly property color inkOnFg: luma(accent) > 0.55 ? Qt.rgba(0.07, 0.07, 0.09, 1) : Qt.rgba(0.97, 0.97, 0.98, 1)

    // the outline: the window border's gradient, one color from it, or the accent
    readonly property bool frameOn: root.cfg.panelFrame === true
    readonly property bool frameGradientOn: frameOn && root.cfg.panelFrameGradient !== false && borderColors.length > 1
    readonly property color frameColor: {
        const n = borderColors.length, pick = root.cfg.panelFrameColor
        if (n === 0 || pick === "accent" || !pick) return accent
        if (pick === "first") return Qt.color(borderColors[0])
        if (pick === "last") return Qt.color(borderColors[n - 1])
        return Qt.color(borderColors[Math.floor((n - 1) / 2)])
    }

    // the colors of each scheme, for its tile: background, accent, and a few more
    function schemeColors(name) {
        const bg = themeBgColor ? themeBgColor : neutralBg
        if (name === "custom") return { bg: hexColor(root.cfg.panelBg) || neutralBg, ac: customAccentColor || themeAc, acs: [] }
        if (name === "monochrome") return { bg: neutralBg, ac: neutralInk, acs: [] }
        const list = name === "borders" ? borderColors : (name === "palette" ? palette : [])
        const acs = list.slice(0, 3).map((c) => Qt.color(c))
        return { bg: bg, ac: name === "borders" && acs.length > 0 ? acs[0] : themeAc, acs: acs }
    }
    readonly property var schemeMap: ({ theme: schemeColors("theme"), palette: schemeColors("palette"), borders: schemeColors("borders"),
                                        custom: schemeColors("custom"), monochrome: schemeColors("monochrome") })
    function tint(a) { return Qt.rgba(ink.r, ink.g, ink.b, a) }
    function accentTint(a) { return Qt.rgba(accent.r, accent.g, accent.b, a) }


    // ---- placement: never overlap the bar -----------------------------------------
    // Worked out each time the panel is about to open (see toggle()), because the
    // bar's position is not known yet when this file is first loaded.
    //
    // The panel is anchored to the outer edge of the bar's own window (not to the
    // widget, which sits inside the bar's padding), and the gap is transparent
    // padding inside the popup window, so it works whatever the compositor does
    // with anchor margins.
    property var barObject: null              // the shell's bar, used as a hint for its edge
    property bool barAtTop: true              // horizontal bar: top edge (else bottom)
    property bool barAtLeft: true             // vertical bar: left edge (else right)
    property bool useRect: false              // anchor to the bar window's edge
    property var anchorWin: null
    property real rectX: 0
    property real rectY: 0
    property real rectW: 1
    property real rectH: 1
    property real extra: 0                    // extra clearance when only the widget is known
    property real maxHeight: 620
    readonly property int gap: 0              // free space between the bar and the panel (0 = flush)
    readonly property real padTop: (!vertical && barAtTop) ? gap + extra : 0
    readonly property real padBottom: (!vertical && !barAtTop) ? gap + extra : 0
    readonly property real padLeft: (vertical && barAtLeft) ? gap + extra : 0
    readonly property real padRight: (vertical && !barAtLeft) ? gap + extra : 0

    function sideFromText(v) {
        var t = String(v === undefined || v === null ? "" : v).toLowerCase()
        if (t.indexOf("top") >= 0) return "top"
        if (t.indexOf("bottom") >= 0) return "bottom"
        if (t.indexOf("left") >= 0) return "left"
        if (t.indexOf("right") >= 0) return "right"
        return ""
    }

    function locate() {
        var item = root.anchorItem
        if (!item) return
        var scr = item.screen
        var sw = scr ? scr.width : 1920
        var sh = scr ? scr.height : 1080
        var side = ""
        var qsWin = null
        var win = null

        // 1. the bar window knows which edges it is attached to
        try { qsWin = item.QsWindow.window } catch (e0) { qsWin = null }
        try { win = qsWin ? qsWin : item.Window.window } catch (e1) { win = null }
        try {
            var an = win ? win.anchors : null
            if (an) {
                if (root.vertical) {
                    if (an.left && !an.right) side = "left"
                    else if (an.right && !an.left) side = "right"
                } else {
                    if (an.top && !an.bottom) side = "top"
                    else if (an.bottom && !an.top) side = "bottom"
                }
            }
        } catch (e2) { side = "" }

        // 2. the shell's bar object may say it outright
        if (side === "" && root.barObject) {
            var names = ["position", "barPosition", "edge", "side", "location", "placement", "barSide"]
            for (var i = 0; i < names.length && side === ""; i++) {
                var got = ""
                try { got = root.sideFromText(root.barObject[names[i]]) } catch (e3) { got = "" }
                if ((root.vertical && (got === "left" || got === "right"))
                        || (!root.vertical && (got === "top" || got === "bottom")))
                    side = got
            }
        }

        // 3. last resort: which half of the screen (only meaningful when the bar
        //    window is as big as the screen)
        var pos = item.mapToItem(null, 0, 0)
        if (side === "") {
            if (root.vertical) side = pos.x < sw / 2 ? "left" : "right"
            else side = pos.y < sh / 2 ? "top" : "bottom"
        }
        root.barAtTop = side === "top"
        root.barAtLeft = side === "left"

        // Anchor rectangle on the bar window's outer edge (window coordinates).
        var ww = (win && win.width > 0) ? win.width : 0
        var wh = (win && win.height > 0) ? win.height : 0
        var small = root.vertical ? (ww > 0 && ww < sw * 0.5) : (wh > 0 && wh < sh * 0.5)
        root.useRect = !!qsWin && small
        root.anchorWin = qsWin
        if (root.useRect) {
            if (root.vertical) {
                root.rectW = 1
                root.rectH = Math.max(1, item.height)
                root.rectY = pos.y
                root.rectX = side === "left" ? Math.max(0, ww - 1) : 0
            } else {
                root.rectW = Math.max(1, item.width)
                root.rectH = 1
                root.rectX = pos.x
                root.rectY = side === "top" ? Math.max(0, wh - 1) : 0
            }
            root.extra = 0
        } else {
            root.extra = 6                    // only the widget is known: allow a little for bar padding
        }

        // Tallest the panel may be and still fit between the bar and the far edge.
        var thick = (!root.vertical && wh > 0 && wh < sh * 0.5) ? wh : 40
        var room = root.vertical ? sh - 40 : sh - thick - root.gap - root.extra - 16
        root.maxHeight = Math.max(300, Math.min(680, room))
    }

    function toggle() {
        // A click on the widget while the panel is open first closes it as an
        // "outside click" (below); don't let the same click open it again.
        if (!root.visible && Date.now() - root.grabClosedAt < 500) return
        if (!root.visible) root.locate()
        root.visible = !root.visible
    }

    // ---- click outside to close -----------------------------------------------------
    // Hyprland's focus grab reports any click outside the panel. It is created at
    // runtime so a shell without that module simply keeps the X button and Esc.
    property var grab: null
    property double grabClosedAt: 0
    property double openedAt: 0
    property int grabTries: 0

    Component.onCompleted: {
        try {
            var g = Qt.createQmlObject(
                'import Quickshell.Hyprland\nHyprlandFocusGrab { }', root, "PlumeFocusGrab")
            g.windows = [root]
            g.cleared.connect(function() {
                // A grab that ends right after opening was taken before the panel was
                // on screen: take it again instead of closing what was just opened.
                if (root.visible && Date.now() - root.openedAt < 700 && root.grabTries < 4) {
                    root.grabTries++
                    grabTimer.restart()
                    return
                }
                root.grabClosedAt = Date.now()
                root.visible = false
            })
            root.grab = g
        } catch (e) {
            root.grab = null
        }
    }

    // ---- settings --------------------------------------------------------------
    readonly property var tabs: Schema.tabs
    readonly property var defaults: Schema.defaults()

    function val(key) { return root.cfg[key] }
    function isChanged(it) { return String(root.cfg[it.key]) !== String(it.fallback) }
    function dimmed(it) { return !Schema.active(it, root.cfg) }
    function setValue(it, v) { if (root.svc) root.svc.setSetting(it.key, v) }

    function resetAll() {
        if (!root.store) return
        if (!root.confirmReset) {
            root.confirmReset = true
            confirmTimer.restart()
            return
        }
        root.confirmReset = false
        root.store.resetAll(root.defaults)
    }

    // What the list shows: the active tab's groups, or with a search every match,
    // under the name of its tab. Headers and rows in one flat list.
    readonly property var rows: {
        const out = []
        const q = root.query.trim()
        const pick = (it) => Schema.matches(it, q) && (!root.changedOnly || root.isChanged(it))
        if (q !== "" || root.changedOnly) {
            for (const t of root.tabs) {
                let first = true
                for (const g of t.groups) for (const it of g.items) {
                    if (!pick(it)) continue
                    if (first) { out.push({ header: t.title }); first = false }
                    out.push({ item: it })
                }
            }
            return out
        }
        const t = root.tabs[root.tab]
        for (const g of t.groups) {
            out.push({ header: g.title })
            for (const it of g.items) out.push({ item: it })
        }
        return out
    }
    readonly property bool listing: root.query.trim() !== "" || root.changedOnly
    readonly property string pageKind: root.listing ? "list" : (root.tabs[root.tab].kind || "list")

    function stepTab(d) {
        root.query = ""
        root.tab = (root.tab + d + root.tabs.length) % root.tabs.length
    }

    // what the effects in the tiles and the preview are painted with
    readonly property color themeAccent: Color.accent
    readonly property var fxColors: root.svc ? root.svc.colorCtx : ({})
    readonly property string lookName: {
        const k = Schema.lookNow(root.cfg)
        return k !== "" ? Schema.lookLabels[k] : "Your own look"
    }

    // ---- clipboard paste for text fields ---------------------------------------
    // Native paste is disabled in SettingRow. A paste request runs a fixed command
    // that reads at most `pasteMaxBytes` from the clipboard, and the text is handed
    // back to the row that asked. One paste runs at a time; extra requests are dropped.
    readonly property int pasteMaxBytes: 1024
    property var pasteRow: null
    property var pasteTarget: null

    function requestPaste(row, target) {
        if (pasteRun.running) return
        pasteRow = row
        pasteTarget = target
        pasteRun.start(["wl-paste", "--no-newline"])
    }

    function finishPaste(raw) {
        var row = pasteRow
        var target = pasteTarget
        pasteRow = null
        pasteTarget = null
        if (!row || !target) return
        try { row.insertPasted(target, raw) } catch (e) { }   // row may have closed mid-paste
    }

    // wl-paste with a 2 second limit; a clipboard bigger than the cap is not pasted
    Run {
        id: pasteRun
        seconds: 2
        maxOut: root.pasteMaxBytes
        onDone: function(code, out, err) { root.finishPaste(code === 0 ? out : "") }
    }

    // the search field pastes through the same capped read
    function insertPasted(target, raw) {
        const t = String(raw === null || raw === undefined ? "" : raw).split(/\r?\n/)[0]
        target.insert(target.cursorPosition, t)
        root.query = target.text
    }

    // ---- window geometry -------------------------------------------------------
    visible: false
    color: "transparent"
    implicitWidth: 470 + root.padLeft + root.padRight
    implicitHeight: Math.min(root.maxHeight, mainCol.implicitHeight + 28) + root.padTop + root.padBottom

    anchor.item: root.useRect ? null : root.anchorItem
    anchor.window: root.useRect ? root.anchorWin : null
    anchor.rect.x: root.rectX
    anchor.rect.y: root.rectY
    anchor.rect.width: root.rectW
    anchor.rect.height: root.rectH
    // The panel opens on the side of the anchor facing away from the bar.
    anchor.edges: root.vertical ? (root.barAtLeft ? Edges.Right : Edges.Left)
                                : (root.barAtTop ? Edges.Bottom : Edges.Top)
    anchor.gravity: root.vertical ? (root.barAtLeft ? Edges.Right : Edges.Left)
                                  : (root.barAtTop ? Edges.Bottom : Edges.Top)
    // Only slide along the bar, never across it, so the panel can't be pushed onto the bar.
    anchor.adjustment: root.vertical ? PopupAdjustment.SlideY : PopupAdjustment.SlideX

    onVisibleChanged: {
        if (!visible) {
            root.confirmReset = false
            grabTimer.stop()
            if (root.grab) root.grab.active = false
            return
        }
        root.openedAt = Date.now()
        root.grabTries = 0
        // the grab only holds once the panel is really on screen, which takes a frame
        // or two for a full page of previews
        grabTimer.restart()
    }

    Timer {
        id: grabTimer
        interval: 150
        onTriggered: if (root.grab && root.visible) root.grab.active = true
    }

    Timer { id: confirmTimer; interval: 2500; onTriggered: root.confirmReset = false }

    Shortcut {
        sequence: "Escape"
        context: Qt.WindowShortcut
        onActivated: {
            if (root.query !== "") root.query = ""
            else root.visible = false
        }
    }
    Shortcut {
        sequence: "Alt+Right"
        context: Qt.WindowShortcut
        onActivated: root.stepTab(1)
    }
    Shortcut {
        sequence: "Alt+Left"
        context: Qt.WindowShortcut
        onActivated: root.stepTab(-1)
    }
    Shortcut {
        sequence: "Ctrl+F"
        context: Qt.WindowShortcut
        onActivated: searchField.forceActiveFocus()
    }

    component Chip: Rectangle {
        id: chip
        property string text: ""
        property bool on: false
        signal clicked()
        implicitWidth: chipText.implicitWidth + 18
        implicitHeight: 24
        radius: 6
        color: on ? root.accent : (chipArea.containsMouse ? root.tint(0.12) : root.tint(0.06))
        Behavior on color { ColorAnimation { duration: 100 } }
        Text {
            id: chipText
            textFormat: Text.PlainText
            anchors.centerIn: parent
            text: chip.text
            color: chip.on ? root.inkOnFg : root.ink
            font.family: root.fontFamily
            font.pixelSize: 9
            font.weight: chip.on ? Font.DemiBold : Font.Normal
        }
        MouseArea {
            id: chipArea
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: chip.clicked()
        }
    }

    component Heading: Text {
        textFormat: Text.PlainText
        Layout.fillWidth: true
        color: root.ink
        opacity: 0.55
        font.family: root.fontFamily
        font.pixelSize: 8
        font.weight: Font.DemiBold
        font.letterSpacing: 1.2
        font.capitalization: Font.AllUppercase
    }

    Rectangle {
        anchors.fill: parent
        anchors.topMargin: root.padTop
        anchors.bottomMargin: root.padBottom
        anchors.leftMargin: root.padLeft
        anchors.rightMargin: root.padRight
        color: root.panelBg
        border.color: root.frameOn ? root.frameColor : root.tint(0.14)
        border.width: root.frameGradientOn ? 0 : 1
        radius: 12
        clip: true

        Canvas {      // edge in the window border's gradient, at its angle
            anchors.fill: parent
            visible: root.frameGradientOn
            opacity: 0.85
            z: 10
            readonly property var stops: root.borderColors
            readonly property real angle: root.svc ? root.svc.borderAngle : 0
            onStopsChanged: requestPaint()
            onAngleChanged: requestPaint()
            onWidthChanged: requestPaint()
            onHeightChanged: requestPaint()
            onVisibleChanged: if (visible) requestPaint()
            onPaint: {
                const ctx = getContext("2d")
                ctx.reset()
                const n = stops.length
                if (!visible || n < 2 || width < 4 || height < 4) return
                const a = angle * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a)
                const half = (Math.abs(dx) * width + Math.abs(dy) * height) / 2
                const g = ctx.createLinearGradient(width / 2 - dx * half, height / 2 - dy * half, width / 2 + dx * half, height / 2 + dy * half)
                for (let i = 0; i < n; i++) g.addColorStop(i / (n - 1), stops[i])
                const r = 12, x = 0.5, y = 0.5, w = width - 1, h = height - 1
                ctx.beginPath()
                ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
                ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
                ctx.lineWidth = 1.5
                ctx.strokeStyle = g
                ctx.stroke()
            }
        }

        ColumnLayout {
            id: mainCol
            anchors.fill: parent
            anchors.margins: 14
            spacing: 10

            // ---- header: track + live preview ------------------------------------
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: headerCol.implicitHeight + 24
                radius: 10
                color: root.tint(0.05)
                border.width: 1
                border.color: root.tint(0.08)

                ColumnLayout {
                    id: headerCol
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 10

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 12

                        Image {
                            Layout.preferredWidth: 40
                            Layout.preferredHeight: 40
                            source: Qt.resolvedUrl(root.lightText ? "../../assets/logo.png" : "../../assets/logo-dark.png")
                            sourceSize.width: 80
                            sourceSize.height: 80
                            smooth: true
                            mipmap: true
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            Layout.alignment: Qt.AlignVCenter
                            spacing: 2

                            Text {
                                textFormat: Text.PlainText
                                Layout.fillWidth: true
                                text: "Plume"
                                color: root.ink
                                font.family: root.fontFamily
                                font.pixelSize: 11
                                font.weight: Font.DemiBold
                                elide: Text.ElideRight
                            }
                            Text {
                                textFormat: Text.PlainText
                                Layout.fillWidth: true
                                text: !root.cfg.enabled ? "Effects are off" : root.lookName
                                color: root.ink
                                opacity: 0.6
                                font.family: root.fontFamily
                                font.pixelSize: 9
                                elide: Text.ElideRight
                            }
                        }

                        // reset (asks twice) + close
                        Rectangle {
                            Layout.alignment: Qt.AlignTop
                            implicitWidth: resetLabel.implicitWidth + 16
                            implicitHeight: 24
                            radius: 6
                            color: root.confirmReset ? root.accent
                                : (resetArea.containsMouse ? root.tint(0.16) : root.tint(0.08))
                            Behavior on color { ColorAnimation { duration: 100 } }

                            Text {
                                textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                                id: resetLabel
                                anchors.centerIn: parent
                                text: root.confirmReset ? "Really reset?" : "Reset all"
                                color: root.confirmReset ? root.inkOnFg : root.ink
                                font.family: root.fontFamily
                                font.pixelSize: 9
                            }
                            MouseArea {
                                id: resetArea
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: root.resetAll()
                            }
                        }
                        Rectangle {
                            Layout.alignment: Qt.AlignTop
                            implicitWidth: 24; implicitHeight: 24; radius: 6
                            color: closeArea.containsMouse ? root.tint(0.16) : root.tint(0.08)
                            Text {
                                textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                                anchors.centerIn: parent
                                text: "\u00D7"
                                color: root.ink
                                font.pixelSize: 15
                            }
                            MouseArea {
                                id: closeArea
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: root.visible = false
                            }
                        }
                    }

                    // live preview: the effects as the settings draw them
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: 64
                        radius: 8
                        color: root.tint(0.04)
                        clip: true

                        FxArt {
                            anchors.fill: parent
                            anchors.margins: 2
                            values: root.cfg
                            colors: root.fxColors
                            scale: 0.6
                            live: root.visible
                            cursorSvg: root.svc && root.svc.ownCursor ? root.svc.cursorArrow : ""
                            cursorHot: root.svc ? root.svc.cursorHot : [0.2, 0.15]
                        }
                    }
                }
            }

            // ---- search + changed only ---------------------------------------------
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: 26
                    radius: 6
                    color: root.tint(0.06)
                    border.width: 1
                    border.color: searchField.activeFocus ? root.accent : root.tint(0.12)

                    Text {
                        textFormat: Text.PlainText
                        anchors.left: parent.left
                        anchors.leftMargin: 9
                        anchors.verticalCenter: parent.verticalCenter
                        visible: searchField.text === "" && !searchField.activeFocus
                        text: "Search every setting (Ctrl+F)"
                        color: root.ink
                        opacity: 0.4
                        font.family: root.fontFamily
                        font.pixelSize: 9
                    }
                    SafeField {
                        id: searchField
                        anchors.fill: parent
                        anchors.leftMargin: 9
                        anchors.rightMargin: 24
                        maxChars: 40
                        color: root.ink
                        selectionColor: root.accentTint(0.35)
                        fontFamily: root.fontFamily
                        fontPixelSize: 10
                        onTextChanged: root.query = text
                        onPasteRequested: root.requestPaste(root, searchField)
                        Binding on text { when: !searchField.activeFocus; value: root.query }
                    }
                    Text {
                        textFormat: Text.PlainText
                        visible: root.query !== ""
                        anchors.right: parent.right
                        anchors.rightMargin: 8
                        anchors.verticalCenter: parent.verticalCenter
                        text: "\u00D7"
                        color: root.ink
                        font.pixelSize: 13
                        MouseArea {
                            anchors.fill: parent
                            anchors.margins: -4
                            cursorShape: Qt.PointingHandCursor
                            onClicked: { root.query = ""; searchField.text = "" }
                        }
                    }
                }
                Chip {
                    text: "Changed only"
                    on: root.changedOnly
                    onClicked: root.changedOnly = !root.changedOnly
                }
            }

            // ---- tabs --------------------------------------------------------------
            Flow {
                Layout.fillWidth: true
                spacing: 4
                opacity: root.listing ? 0.45 : 1

                Repeater {
                    model: root.tabs
                    delegate: Chip {
                        required property var modelData
                        required property int index
                        text: modelData.title
                        on: !root.listing && index === root.tab
                        onClicked: { root.query = ""; root.changedOnly = false; root.tab = index }
                    }
                }
            }

            // ---- the page ------------------------------------------------------------
            Flickable {
                id: flick
                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.preferredHeight: card.implicitHeight
                contentWidth: width
                contentHeight: card.implicitHeight
                clip: true
                boundsBehavior: Flickable.StopAtBounds

                Rectangle {
                    id: card
                    width: flick.width
                    implicitHeight: rowsCol.implicitHeight + 8
                    radius: 10
                    color: root.tint(0.035)
                    border.width: 1
                    border.color: root.tint(0.07)

                    ColumnLayout {
                        id: rowsCol
                        anchors.left: parent.left
                        anchors.right: parent.right
                        anchors.top: parent.top
                        anchors.leftMargin: 14
                        anchors.rightMargin: 14
                        anchors.topMargin: 4
                        spacing: 0

                        // ---- Looks ---------------------------------------------------------
                        LooksPage {
                            visible: root.pageKind === "looks"
                            Layout.fillWidth: true
                            Layout.preferredWidth: rowsCol.width
                            Layout.maximumWidth: rowsCol.width
                            Layout.topMargin: 12
                            Layout.bottomMargin: 12
                            svc: root.svc
                            cfg: root.cfg
                            ink: root.ink
                            accent: root.accent
                            inkOnFg: root.inkOnFg
                            fontFamily: root.fontFamily
                            colors: root.fxColors
                        }

                        // ---- the cursor made here, at a glance --------------------------------
                        CursorShowcase {
                            visible: !root.listing && root.tabs[root.tab].key === "cursor"
                            Layout.fillWidth: true
                            Layout.topMargin: 12
                            Layout.bottomMargin: 2
                            design: root.svc ? root.svc.cursorDesign : null
                            worn: root.svc ? root.svc.ownCursor : false
                            ink: root.ink
                            accent: root.accent
                            fontFamily: root.fontFamily
                        }

                        // ---- About ---------------------------------------------------------
                        AboutPage {
                            visible: root.pageKind === "about"
                            Layout.fillWidth: true
                            Layout.preferredWidth: rowsCol.width
                            Layout.maximumWidth: rowsCol.width
                            Layout.topMargin: 8
                            version: root.svc && root.svc.manifest && root.svc.manifest.version ? String(root.svc.manifest.version) : ""
                            ink: root.ink
                            accent: root.accent
                            fontFamily: root.fontFamily
                        }

                        // ---- settings rows -------------------------------------------------
                        Repeater {
                            model: root.pageKind === "looks" || root.pageKind === "about" ? [] : root.rows

                            delegate: ColumnLayout {
                                id: entry
                                required property var modelData
                                required property int index
                                Layout.fillWidth: true
                                spacing: 0

                                Heading {
                                    visible: !!entry.modelData.header
                                    Layout.topMargin: entry.index > 0 ? 16 : 12
                                    Layout.bottomMargin: 2
                                    text: entry.modelData.header || ""
                                }

                                Rectangle {
                                    visible: !!entry.modelData.item && entry.index > 0 && !root.rows[entry.index - 1].header
                                    Layout.fillWidth: true
                                    implicitHeight: 1
                                    color: root.tint(0.07)
                                }

                                SettingRow {
                                    id: settingRow
                                    readonly property var it: entry.modelData.item || ({ key: "", label: "", kind: "", fallback: null })
                                    visible: !!entry.modelData.item
                                    Layout.fillWidth: true
                                    Layout.topMargin: 12
                                    Layout.bottomMargin: 12

                                    label: it.label
                                    hint: it.hint || ""
                                    kind: it.kind
                                    options: it.options || []
                                    labels: it.labels || ({})
                                    abouts: it.abouts || ({})
                                    presets: it.presets || []
                                    maxLength: it.maxLength !== undefined ? it.maxLength : 256
                                    min: it.min !== undefined ? it.min : 0
                                    max: it.max !== undefined ? it.max : 100
                                    step: it.step !== undefined ? it.step : 1
                                    divisor: it.divisor !== undefined ? it.divisor : 1
                                    decimals: it.decimals !== undefined ? it.decimals : 0
                                    defaultValue: it.fallback
                                    dimmed: entry.modelData.item ? root.dimmed(it) : false
                                    value: root.cfg[it.key]

                                    fg: root.ink
                                    accent: root.accent
                                    bg: root.inkOnFg
                                    panel: root.panelSolid
                                    barFg: root.fg
                                    fontFamily: root.fontFamily
                                    schemeMap: root.schemeMap
                                    schemeMono: root.neutralInk

                                    settingKey: it.key
                                    allValues: (it.kind === "trail" || it.kind === "halo" || it.kind === "colors"
                                                || it.kind === "glyph" || it.kind === "paint") ? root.cfg : ({})
                                    glyph: it.glyph || ""
                                    customKey: it.custom || ""
                                    cursorNote: it.kind === "cursor" && root.svc ? root.svc.cursorStatus : ""
                                    fxColors: root.fxColors
                                    cursorThemes: it.kind === "cursor" && root.svc ? root.svc.cursorThemes : []
                                    onEdited: function(v) { root.setValue(settingRow.it, v) }
                                    onClipboardPaste: function(target, maxBytes) { root.requestPaste(settingRow, target) }
                                }
                            }
                        }

                        Text {
                            textFormat: Text.PlainText
                            visible: root.listing && root.rows.length === 0
                            Layout.fillWidth: true
                            Layout.topMargin: 14
                            Layout.bottomMargin: 14
                            text: root.changedOnly && root.query.trim() === "" ? "Everything is at its default." : "No setting matches that."
                            color: root.ink
                            opacity: 0.5
                            font.family: root.fontFamily
                            font.pixelSize: 9
                        }
                    }
                }
            }

            // ---- footer ----------------------------------------------------------------
            RowLayout {
                Layout.fillWidth: true
                spacing: 6

                Rectangle {
                    implicitWidth: escLabel.implicitWidth + 10
                    implicitHeight: 16
                    radius: 4
                    color: root.tint(0.08)
                    Text {
                        textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                        id: escLabel
                        anchors.centerIn: parent
                        text: "Esc"
                        color: root.ink
                        opacity: 0.75
                        font.family: root.fontFamily
                        font.pixelSize: 8
                    }
                }
                Text {
                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                    text: "close"
                    color: root.ink
                    opacity: 0.45
                    font.family: root.fontFamily
                    font.pixelSize: 8
                }
                Item { Layout.fillWidth: true }
                Text {
                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                    text: "Changes apply instantly and are saved"
                    color: root.ink
                    opacity: 0.45
                    font.family: root.fontFamily
                    font.pixelSize: 8
                }
            }
        }
    }
}
