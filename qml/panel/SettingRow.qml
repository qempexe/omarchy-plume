import QtQuick
import QtQuick.Layouts
import "../js/Cursor.js" as Cursor
import "../js/Schema.js" as Schema

// One setting in the popup: a label + plain-language hint on the left, the
// current value / reset on the right, and a purpose-built control underneath.
//
//   kind  enum    segmented control (<= 4 options) or wrapping chips
//         trail   tile picker, each tile draws the real trail
//         halo    tile picker, each tile draws the real halo
//         colors  tile picker, each tile draws the effects in that color mode
//         scheme  tile picker for the panel's own colors (theme, palette, borders, custom, monochrome)
//         cursor  "As Omarchy sets it", "Made in Plume" and the installed cursor themes, as chips
//         glyph   tile picker, each tile draws the cursor made in Plume with that option
//         paint   chips with a swatch: where a cursor color comes from
//         int     slider with - / + nudge buttons and a "default" notch
//         bool    switch
//         string  text field (+ optional preset chips)
//         color   swatch palette + hex field
//
// Text and soft tints come from `fg`; selected / filled parts use `accent`
// (the theme accent, a custom color, or `fg` in monochrome). Numbers are shown plain: no px / ms / % suffixes.
//
// Text fields are SafeField items, never TextInput: a TextInput watches the
// clipboard and reads foreign data on every clipboard change (to compute
// canPaste), unbounded, with no way to turn that off. SafeField has no clipboard
// connection at all. Paste requests are emitted as
// `clipboardPaste(target, maxBytes)`; the owner must read at most `maxBytes`
// and then call `insertPasted(target, text)`.
Item {
    id: root

    property string label: ""
    property string hint: ""
    property string kind: "string"
    property var options: []
    property var labels: ({})          // option -> friendly text
    property var abouts: ({})          // option -> one line about it, shown for the picked one
    property string settingKey: ""     // tiles: which setting they change
    property var allValues: ({})       // tiles: every setting, so a tile shows the effects as they would become
    property var fxColors: ({})        // tiles: the colors the effects are painted with
    property var cursorThemes: []      // cursor: the installed themes
    property string cursorNote: ""     // cursor: how making the cursor goes
    property string glyph: ""          // glyph tiles: which cursor they draw
    property string customKey: ""      // paint: the setting holding the custom color
    property var presets: []           // string chips / color palette
    property var value: null
    property var defaultValue: null
    property real min: 0
    property real max: 100
    property real step: 1
    property real divisor: 1           // display value = value / divisor
    property int decimals: 0
    property bool dimmed: false        // setting currently has no effect
    property color fg: "white"
    property color accent: fg          // selected / filled parts
    property color bg: "black"         // text drawn on top of an accent fill
    property color panel: "black"      // opaque popup background
    property color barFg: fg           // bar foreground, for the visualizer tiles
    property var schemeMap: ({})             // scheme tiles: { option: { bg, ac, acs } }
    property color schemeMono: "#f2f2f4"     // the scheme tiles' neutral ink
    property string fontFamily: ""

    // Byte cap for any clipboard read triggered from a text field.
    property int pasteMaxBytes: 1024
    property int maxLength: 256        // text fields: max characters stored

    signal edited(var v)
    signal clipboardPaste(var target, int maxBytes)

    // ---- helpers -----------------------------------------------------------
    function tint(a) { return Qt.rgba(fg.r, fg.g, fg.b, a) }
    function accentTint(a) { return Qt.rgba(accent.r, accent.g, accent.b, a) }
    function str(v) { return (v === null || v === undefined) ? "" : String(v) }
    function same(a, b) { return str(a) === str(b) }
    function labelFor(opt) { return labels[opt] !== undefined ? labels[opt] : String(opt) }
    function show(v) {
        var n = Number(v) / divisor
        if (!isFinite(n)) return "?"
        return String(parseFloat(n.toFixed(decimals)))
    }
    function clamp01(t) { return Math.max(0, Math.min(1, t)) }
    function nudge(dir) {
        var cur = Number(value)
        var v = Math.max(min, Math.min(max, cur + dir * step))
        if (v !== cur) edited(v)
    }

    // Requests a capped clipboard read for `target`; the owner answers via insertPasted().
    function boundedPaste(target) { clipboardPaste(target, pasteMaxBytes) }

    // Owner calls this with the capped text. Single line only, inserted at the cursor.
    function insertPasted(target, raw) {
        if (!target) return
        var t = String(raw === null || raw === undefined ? "" : raw).split(/\r?\n/)[0]
        target.insert(target.cursorPosition, t)
    }

    readonly property bool boolValue: value === true || value === "true"
    readonly property bool atDefault: defaultValue === null || same(value, defaultValue)
    readonly property real span: Math.max(1e-9, max - min)
    readonly property real frac: clamp01((Number(value) - min) / span)
    readonly property real defFrac: clamp01((Number(defaultValue) - min) / span)
    readonly property bool useSegments: kind === "enum" && options.length <= 4
    readonly property bool tiles: kind === "trail" || kind === "halo" || kind === "colors" || kind === "scheme" || kind === "glyph"
    // the cursor made in Plume, as it would look with this option
    function glyphSvg(opt) {
        const d = Cursor.design(root.withOption(opt), root.fxColors)
        const svg = Cursor.svgFor(root.glyph, d, root.glyph === "wait" ? 3 : 0)
        // the arrow fills most of its tile: look closer at it
        return root.glyph === "left_ptr" && d.arrow !== "dot" ? svg.replace('viewBox="0 0 32 32"', 'viewBox="2 1.5 27 27"') : svg
    }
    function paintOf(opt) {
        const v = root.allValues || ({})
        return Cursor.toHex(Cursor.pick(opt === "auto" ? "foreground" : opt, v[root.customKey], root.fxColors))
    }
    function withOption(opt) {
        const out = Object.assign({}, root.allValues || ({}))
        out[root.settingKey] = opt
        return out
    }

    implicitWidth: 400
    implicitHeight: col.implicitHeight
    opacity: dimmed ? 0.4 : 1.0
    Behavior on opacity { NumberAnimation { duration: 140 } }

    // Small square button used for - / + and reset.
    component IconButton: Rectangle {
        id: btn
        property string glyph: ""
        property color ink: "white"
        signal clicked()
        implicitWidth: 22
        implicitHeight: 22
        radius: 6
        color: area.containsMouse
            ? Qt.rgba(ink.r, ink.g, ink.b, 0.18)
            : Qt.rgba(ink.r, ink.g, ink.b, 0.08)
        Text {
            textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
            anchors.centerIn: parent
            text: btn.glyph
            color: btn.ink
            font.family: root.fontFamily
            font.pixelSize: 11
        }
        MouseArea {
            id: area
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: btn.clicked()
        }
    }

    ColumnLayout {
        id: col
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        spacing: 9

        // ---- head: label + hint | value / switch / reset -------------------
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Text {
                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                    Layout.fillWidth: true
                    text: root.label
                    color: root.fg
                    font.family: root.fontFamily
                    font.pixelSize: 10
                    font.weight: Font.DemiBold
                    elide: Text.ElideRight
                }
                Text {
                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                    Layout.fillWidth: true
                    text: root.hint
                    visible: root.hint !== ""
                    color: root.fg
                    opacity: 0.55
                    font.family: root.fontFamily
                    font.pixelSize: 8
                    wrapMode: Text.Wrap
                }
            }

            // numeric stepper
            RowLayout {
                visible: root.kind === "int"
                spacing: 4
                Layout.alignment: Qt.AlignTop

                IconButton { glyph: "\u2212"; ink: root.fg; onClicked: root.nudge(-1) }
                Text {
                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                    Layout.preferredWidth: 34
                    horizontalAlignment: Text.AlignHCenter
                    text: root.show(root.value)
                    color: root.fg
                    font.family: root.fontFamily
                    font.pixelSize: 10
                    font.weight: Font.DemiBold
                }
                IconButton { glyph: "+"; ink: root.fg; onClicked: root.nudge(1) }
            }

            // switch
            Rectangle {
                visible: root.kind === "bool"
                Layout.alignment: Qt.AlignTop
                implicitWidth: 40
                implicitHeight: 22
                radius: 11
                color: root.boolValue ? root.accent : root.tint(0.14)
                Behavior on color { ColorAnimation { duration: 120 } }

                Rectangle {
                    width: 16; height: 16; radius: 8
                    y: 3
                    x: root.boolValue ? parent.width - width - 3 : 3
                    color: root.boolValue ? root.bg : root.tint(0.75)
                    Behavior on x { NumberAnimation { duration: 120; easing.type: Easing.OutCubic } }
                }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: root.edited(!root.boolValue)
                }
            }

            // back to default (only when changed)
            IconButton {
                visible: !root.atDefault
                Layout.alignment: Qt.AlignTop
                glyph: "\u21BA"
                ink: root.fg
                onClicked: root.edited(root.defaultValue)
            }
        }

        // ---- enum: segmented control ----------------------------------------
        Rectangle {
            visible: root.useSegments
            Layout.fillWidth: true
            implicitHeight: 28
            radius: 7
            color: root.tint(0.06)
            border.width: 1
            border.color: root.tint(0.08)

            RowLayout {
                anchors.fill: parent
                anchors.margins: 3
                spacing: 2

                Repeater {
                    model: root.useSegments ? root.options : []
                    delegate: Rectangle {
                        readonly property bool on: root.same(root.value, modelData)
                        Layout.fillWidth: true
                        Layout.preferredWidth: 1
                        Layout.fillHeight: true
                        radius: 6
                        color: on ? root.accent : (seg.containsMouse ? root.tint(0.10) : "transparent")
                        Behavior on color { ColorAnimation { duration: 100 } }

                        Text {
                            textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                            anchors.centerIn: parent
                            width: parent.width - 8
                            horizontalAlignment: Text.AlignHCenter
                            elide: Text.ElideRight
                            text: root.labelFor(modelData)
                            color: parent.on ? root.bg : root.fg
                            font.family: root.fontFamily
                            font.pixelSize: 9
                            font.weight: parent.on ? Font.DemiBold : Font.Normal
                        }
                        MouseArea {
                            id: seg
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.edited(modelData)
                        }
                    }
                }
            }
        }

        // ---- enum with many options: wrapping chips --------------------------
        Flow {
            visible: root.kind === "enum" && !root.useSegments
            Layout.fillWidth: true
            spacing: 6

            Repeater {
                model: (root.kind === "enum" && !root.useSegments) ? root.options : []
                delegate: Rectangle {
                    readonly property bool on: root.same(root.value, modelData)
                    implicitWidth: chipText.implicitWidth + 20
                    implicitHeight: 26
                    radius: 6
                    color: on ? root.accent : root.tint(0.07)
                    Text {
                        textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                        id: chipText
                        anchors.centerIn: parent
                        text: root.labelFor(modelData)
                        color: parent.on ? root.bg : root.fg
                        font.family: root.fontFamily
                        font.pixelSize: 9
                    }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.edited(modelData)
                    }
                }
            }
        }

        // ---- trail / halo / colors: tiles that draw the real thing ---------------
        GridLayout {
            visible: root.tiles
            Layout.fillWidth: true
            columns: root.kind === "scheme" ? 5 : 4
            columnSpacing: 8
            rowSpacing: 8

            Repeater {
                model: root.tiles ? root.options : []
                delegate: Rectangle {
                    id: tile
                    readonly property bool on: root.same(root.value, modelData)
                    Layout.preferredWidth: Math.floor((root.width - (root.kind === "scheme" ? 32 : 24)) / (root.kind === "scheme" ? 5 : 4))
                    Layout.preferredHeight: root.kind === "scheme" ? 62 : (root.kind === "glyph" ? 70 : 58)
                    radius: 8
                    color: on ? root.accentTint(0.16) : (tileArea.containsMouse ? root.tint(0.10) : root.tint(0.05))
                    border.width: on ? 1.5 : 1
                    border.color: on ? root.accent : root.tint(0.10)
                    clip: true
                    Behavior on color { ColorAnimation { duration: 100 } }

                    CursorArt {
                        visible: root.kind === "glyph"
                        anchors.horizontalCenter: parent.horizontalCenter
                        y: 3
                        width: 48
                        height: 48
                        svg: root.kind === "glyph" ? root.glyphSvg(modelData) : ""
                    }

                    FxArt {
                        visible: root.kind !== "scheme" && root.kind !== "glyph"
                        anchors.horizontalCenter: parent.horizontalCenter
                        y: 4
                        width: parent.width - 8
                        height: 34
                        values: root.kind !== "scheme" && root.kind !== "glyph" ? root.withOption(modelData) : ({})
                        colors: root.fxColors
                        scale: 0.42
                    }

                    // scheme tile: a miniature panel drawn in that scheme
                    Rectangle {
                        visible: root.kind === "scheme"
                        anchors.horizontalCenter: parent.horizontalCenter
                        y: 8
                        width: parent.width - 20
                        height: 30
                        radius: 5
                        readonly property var sc: root.schemeMap[modelData] || ({ bg: "#121216", ac: root.accent, acs: [] })
                        color: sc.bg
                        border.width: 1
                        border.color: root.tint(0.14)

                        Row {     // a fake selected segment, then the scheme's other colors
                            x: 6; y: 6
                            spacing: 3
                            Rectangle { width: 16; height: 7; radius: 3; color: parent.parent.sc.ac }
                            Repeater {
                                model: (parent.parent.sc.acs || []).slice(1)
                                delegate: Rectangle { required property var modelData; width: 7; height: 7; radius: 3.5; color: modelData }
                            }
                        }
                        Rectangle {   // fake slider track + fill
                            x: 6; y: 18; width: parent.width - 12; height: 4; radius: 2
                            color: Qt.rgba(root.schemeMono.r, root.schemeMono.g, root.schemeMono.b, 0.18)
                            Rectangle {
                                width: parent.width * 0.55; height: parent.height; radius: 2
                                color: parent.parent.sc.ac
                            }
                        }
                    }
                    Text {
                        textFormat: Text.PlainText
                        anchors.horizontalCenter: parent.horizontalCenter
                        anchors.bottom: parent.bottom
                        anchors.bottomMargin: 6
                        width: parent.width - 6
                        horizontalAlignment: Text.AlignHCenter
                        elide: Text.ElideRight
                        text: root.labelFor(modelData)
                        color: root.fg
                        opacity: tile.on ? 1.0 : 0.7
                        font.family: root.fontFamily
                        font.pixelSize: 8
                        font.weight: tile.on ? Font.DemiBold : Font.Normal
                    }
                    MouseArea {
                        id: tileArea
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.edited(modelData)
                    }
                }
            }
        }

        // ---- paint: where a cursor color comes from, each with a swatch -----------------
        Flow {
            visible: root.kind === "paint"
            Layout.fillWidth: true
            spacing: 6

            Repeater {
                model: root.kind === "paint" ? root.options : []
                delegate: Rectangle {
                    readonly property bool on: root.same(root.value, modelData)
                    implicitWidth: pRow.implicitWidth + 18
                    implicitHeight: 26
                    radius: 6
                    color: on ? root.accent : (pArea.containsMouse ? root.tint(0.12) : root.tint(0.07))
                    Row {
                        id: pRow
                        anchors.centerIn: parent
                        spacing: 6
                        Rectangle {
                            anchors.verticalCenter: parent.verticalCenter
                            width: 10
                            height: 10
                            radius: 5
                            color: modelData === "auto" ? "transparent" : root.paintOf(modelData)
                            border.width: 1
                            border.color: modelData === "auto" ? (parent.parent.on ? root.bg : root.fg) : Qt.rgba(0, 0, 0, 0.35)
                            Rectangle {
                                visible: modelData === "auto"
                                anchors.right: parent.right
                                anchors.top: parent.top
                                anchors.bottom: parent.bottom
                                anchors.margins: 1
                                width: (parent.width - 2) / 2
                                radius: 4
                                color: parent.parent.parent.on ? root.bg : root.fg
                            }
                        }
                        Text {
                            anchors.verticalCenter: parent.verticalCenter
                            textFormat: Text.PlainText
                            text: root.labelFor(modelData)
                            color: parent.parent.on ? root.bg : root.fg
                            font.family: root.fontFamily
                            font.pixelSize: 9
                        }
                    }
                    MouseArea {
                        id: pArea
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.edited(modelData)
                    }
                }
            }
        }

        // ---- cursor themes: "as Omarchy sets it", then every installed one -------------
        Flow {
            visible: root.kind === "cursor"
            Layout.fillWidth: true
            spacing: 6

            Repeater {
                model: root.kind === "cursor" ? ["", Schema.MINE].concat(root.cursorThemes) : []
                delegate: Rectangle {
                    readonly property bool on: root.str(root.value) === String(modelData)
                    implicitWidth: cText.implicitWidth + 20
                    implicitHeight: 26
                    radius: 6
                    color: on ? root.accent : (cArea.containsMouse ? root.tint(0.12) : root.tint(0.07))
                    Text {
                        id: cText
                        textFormat: Text.PlainText
                        anchors.centerIn: parent
                        text: String(modelData) === "" ? "As Omarchy sets it"
                            : (String(modelData) === Schema.MINE ? "Made in Plume" : String(modelData))
                        color: parent.on ? root.bg : root.fg
                        font.family: root.fontFamily
                        font.pixelSize: 9
                    }
                    MouseArea {
                        id: cArea
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.edited(String(modelData))
                    }
                }
            }
        }
        Text {
            textFormat: Text.PlainText
            visible: root.kind === "cursor" && root.cursorNote !== ""
            Layout.fillWidth: true
            text: root.cursorNote
            color: root.accent
            font.family: root.fontFamily
            font.pixelSize: 8
            wrapMode: Text.Wrap
        }
        Text {
            textFormat: Text.PlainText
            visible: root.kind === "cursor" && root.cursorThemes.length === 0
            Layout.fillWidth: true
            text: "No cursor themes found in ~/.local/share/icons, ~/.icons or /usr/share/icons."
            color: root.fg
            opacity: 0.5
            font.family: root.fontFamily
            font.pixelSize: 8
            wrapMode: Text.Wrap
        }

        // what the picked tile does
        Text {
            textFormat: Text.PlainText
            visible: (root.kind === "trail" || root.kind === "halo" || root.kind === "colors" || root.kind === "glyph") && text !== ""
            Layout.fillWidth: true
            text: root.abouts && root.abouts[root.str(root.value)] ? root.labelFor(root.value) + ": " + root.abouts[root.str(root.value)] : ""
            color: root.fg
            opacity: 0.6
            font.family: root.fontFamily
            font.pixelSize: 8
            wrapMode: Text.Wrap
        }

        // ---- int: slider ---------------------------------------------------------
        ColumnLayout {
            visible: root.kind === "int"
            Layout.fillWidth: true
            spacing: 1

            Item {
                id: slider
                Layout.fillWidth: true
                implicitHeight: 22
                readonly property real knob: 16

                Rectangle {
                    id: track
                    anchors.verticalCenter: parent.verticalCenter
                    width: parent.width
                    height: 6
                    radius: 3
                    color: root.tint(0.12)

                    Rectangle {
                        width: handle.x + handle.width / 2
                        height: parent.height
                        radius: parent.radius
                        color: root.accent
                    }
                }
                // small notch marking where the default sits
                Rectangle {
                    visible: root.defaultValue !== null
                    width: 2; height: 12; radius: 1
                    x: (slider.width - slider.knob) * root.defFrac + slider.knob / 2 - 1
                    anchors.verticalCenter: parent.verticalCenter
                    color: root.tint(0.35)
                }
                Rectangle {
                    id: handle
                    width: slider.knob; height: slider.knob; radius: slider.knob / 2
                    x: (slider.width - width) * root.frac
                    anchors.verticalCenter: parent.verticalCenter
                    color: root.accent
                    border.width: 3
                    border.color: root.panel
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    function apply(mx) {
                        var room = Math.max(1, slider.width - slider.knob)
                        var t = Math.max(0, Math.min(1, (mx - slider.knob / 2) / room))
                        var v = root.min + t * (root.max - root.min)
                        v = Math.round((v - root.min) / root.step) * root.step + root.min
                        v = Math.max(root.min, Math.min(root.max, v))
                        // only report real changes, so dragging doesn't spam the config
                        if (v !== Number(root.value)) root.edited(v)
                    }
                    onPressed: function(m) { apply(m.x) }
                    onPositionChanged: function(m) { if (pressed) apply(m.x) }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                Text {
                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                    text: root.show(root.min)
                    color: root.fg; opacity: 0.4
                    font.family: root.fontFamily; font.pixelSize: 8
                }
                Item { Layout.fillWidth: true }
                Text {
                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                    text: root.show(root.max)
                    color: root.fg; opacity: 0.4
                    font.family: root.fontFamily; font.pixelSize: 8
                }
            }
        }

        // ---- string: field + preset chips ----------------------------------------
        RowLayout {
            visible: root.kind === "string"
            Layout.fillWidth: true
            spacing: 8

            Rectangle {
                Layout.preferredWidth: root.presets.length > 0 ? 90 : 200
                Layout.fillWidth: root.presets.length === 0
                implicitHeight: 26
                radius: 6
                color: root.tint(0.06)
                border.width: 1
                border.color: textIn.activeFocus ? root.accent : root.tint(0.12)

                SafeField {
                    id: textIn

                    maxChars: root.maxLength

                    onPasteRequested: root.boundedPaste(textIn)
                    anchors.fill: parent
                    anchors.leftMargin: 9
                    anchors.rightMargin: 9
                    color: root.fg
                    selectionColor: root.accentTint(0.35)
                    fontFamily: root.fontFamily
                    fontPixelSize: 10
                    onEditingFinished: root.edited(text)
                    // mirror the store unless the user is typing
                    Binding on text {
                        when: !textIn.activeFocus
                        value: root.str(root.value)
                    }
                }
            }

            Flow {
                visible: root.presets.length > 0
                Layout.fillWidth: true
                spacing: 4

                Repeater {
                    model: root.kind === "string" ? root.presets : []
                    delegate: Rectangle {
                        readonly property bool on: root.same(root.value, modelData)
                        implicitWidth: 28
                        implicitHeight: 28
                        radius: 6
                        color: on ? root.accent : (pArea.containsMouse ? root.tint(0.14) : root.tint(0.07))
                        Text {
                            textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                            anchors.centerIn: parent
                            text: String(modelData).trim() === "" ? "\u2423" : String(modelData).trim()
                            color: parent.on ? root.bg : root.fg
                            font.family: root.fontFamily
                            font.pixelSize: 11
                        }
                        MouseArea {
                            id: pArea
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.edited(modelData)
                        }
                    }
                }
            }
        }

        // ---- color: palette + hex field ------------------------------------------
        ColumnLayout {
            visible: root.kind === "color"
            Layout.fillWidth: true
            spacing: 8

            Flow {
                Layout.fillWidth: true
                spacing: 8

                Repeater {
                    model: root.kind === "color" ? root.presets : []
                    delegate: Rectangle {
                        readonly property bool on: root.str(root.value).toLowerCase() === String(modelData).toLowerCase()
                        width: 24; height: 24; radius: 12
                        color: modelData
                        border.width: on ? 2 : 1
                        border.color: on ? root.fg : root.tint(0.2)
                        scale: cArea.containsMouse ? 1.12 : 1.0
                        Behavior on scale { NumberAnimation { duration: 90 } }
                        MouseArea {
                            id: cArea
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.edited(modelData)
                        }
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Rectangle {
                    readonly property bool valid: /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(root.str(root.value))
                    width: 28; height: 28; radius: 6
                    color: valid ? root.str(root.value) : "transparent"
                    border.width: 1
                    border.color: root.tint(0.25)
                }
                Rectangle {
                    Layout.preferredWidth: 110
                    implicitHeight: 28
                    radius: 6
                    color: root.tint(0.06)
                    border.width: 1
                    border.color: hexIn.activeFocus ? root.accent : root.tint(0.12)

                    SafeField {
                        id: hexIn

                        maxChars: 9          // '#' + 8 hex digits

                        onPasteRequested: root.boundedPaste(hexIn)
                        anchors.fill: parent
                        anchors.leftMargin: 9
                        anchors.rightMargin: 9
                        color: root.fg
                        selectionColor: root.accentTint(0.35)
                        fontFamily: root.fontFamily
                        fontPixelSize: 10
                        onEditingFinished: root.edited(text)
                        Binding on text {
                            when: !hexIn.activeFocus
                            value: root.str(root.value)
                        }
                    }
                }
                Item { Layout.fillWidth: true }
            }
        }
    }
}
