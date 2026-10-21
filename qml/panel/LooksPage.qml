import QtQuick
import QtQuick.Layouts
import "../js/Schema.js" as Schema
import "../js/Cursor.js" as Cursor

// The Looks tab: ready made looks with one step of undo, ready made cursors, and
// twelve places for your own. A ready made look is the trail, the halo and their
// colors; a ready made cursor is how the cursor made in Plume looks, put on; a place
// of your own keeps every setting.
ColumnLayout {
    id: root

    property var svc: null
    property var cfg: ({})
    property color ink: "white"
    property color accent: "white"
    property color inkOnFg: "black"
    property string fontFamily: ""
    property var colors: ({})           // what the pictures are painted with

    spacing: 8

    function tint(a) { return Qt.rgba(ink.r, ink.g, ink.b, a) }
    function accentTint(a) { return Qt.rgba(accent.r, accent.g, accent.b, a) }

    readonly property string wearing: Schema.lookNow(cfg)
    readonly property string wearingCursor: Schema.cursorLookNow(cfg)
    function cursorsOf(key) {
        const d = Cursor.design(Object.assign({}, root.cfg, Schema.cursorLookSet(key)), root.colors)
        return ["left_ptr", "hand2", "text"].map((dir) => Cursor.svgFor(dir, d, 0))
    }
    readonly property var slots: svc ? svc.slots : []
    readonly property int tileW: Math.floor((width - 24) / 4)

    // these values with a look put on, so the picture shows what it would become
    function withLook(look) { return Object.assign({}, root.cfg, look || ({})) }

    component Small: Rectangle {
        id: sb
        property string text: ""
        property bool strong: false
        signal clicked()
        implicitWidth: sbText.implicitWidth + 16
        implicitHeight: 22
        radius: 6
        color: strong ? root.accent : (sbArea.containsMouse ? root.tint(0.16) : root.tint(0.08))
        Text {
            id: sbText
            textFormat: Text.PlainText
            anchors.centerIn: parent
            text: sb.text
            color: sb.strong ? root.inkOnFg : root.ink
            font.family: root.fontFamily
            font.pixelSize: 9
        }
        MouseArea {
            id: sbArea
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: sb.clicked()
        }
    }

    component Tile: Rectangle {
        id: tile
        property var look: null
        property string title: ""
        property bool on: false
        property bool empty: false
        property var cursors: []
        signal clicked()
        Layout.preferredWidth: root.tileW
        Layout.preferredHeight: 56
        clip: true
        radius: 8
        color: on ? root.accentTint(0.16) : (tArea.containsMouse ? root.tint(0.10) : root.tint(0.05))
        border.width: on ? 1.5 : 1
        border.color: on ? root.accent : root.tint(empty ? 0.18 : 0.10)
        Behavior on color { ColorAnimation { duration: 100 } }

        Row {
            visible: tile.cursors.length > 0
            anchors.horizontalCenter: parent.horizontalCenter
            y: 4
            spacing: -4
            Repeater {
                model: tile.cursors
                delegate: CursorArt {
                    required property var modelData
                    width: 32
                    height: 32
                    svg: modelData
                }
            }
        }
        FxArt {
            visible: !tile.empty && tile.cursors.length === 0
            anchors.horizontalCenter: parent.horizontalCenter
            y: 4
            width: parent.width - 8
            height: 32
            values: tile.look || ({})
            colors: root.colors
            scale: 0.4
        }
        Text {
            textFormat: Text.PlainText
            visible: tile.empty
            anchors.horizontalCenter: parent.horizontalCenter
            y: 10
            text: "+"
            color: root.ink
            opacity: 0.35
            font.pixelSize: 14
        }
        Text {
            textFormat: Text.PlainText
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.bottom: parent.bottom
            anchors.bottomMargin: 5
            width: parent.width - 6
            horizontalAlignment: Text.AlignHCenter
            elide: Text.ElideRight
            text: tile.title
            color: root.ink
            opacity: tile.on ? 1.0 : (tile.empty ? 0.4 : 0.7)
            font.family: root.fontFamily
            font.pixelSize: 8
            font.weight: tile.on ? Font.DemiBold : Font.Normal
        }
        MouseArea {
            id: tArea
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: tile.clicked()
        }
    }

    // ---- ready made --------------------------------------------------------------
    RowLayout {
        Layout.fillWidth: true
        Text {
            textFormat: Text.PlainText
            Layout.fillWidth: true
            text: "Ready made"
            color: root.ink
            font.family: root.fontFamily
            font.pixelSize: 10
            font.weight: Font.DemiBold
        }
        Small {
            visible: root.svc ? root.svc.canUndo : false
            text: "Undo the last look"
            onClicked: if (root.svc) root.svc.undoLook()
        }
    }
    Text {
        textFormat: Text.PlainText
        Layout.fillWidth: true
        Layout.maximumWidth: root.width
        text: "Sets the trail, the halo and their colors in one click. Anything can be changed afterwards."
        color: root.ink
        opacity: 0.55
        font.family: root.fontFamily
        font.pixelSize: 8
        wrapMode: Text.Wrap
    }
    GridLayout {
        Layout.fillWidth: true
        columns: 4
        columnSpacing: 8
        rowSpacing: 8
        Repeater {
            model: Schema.lookOptions
            delegate: Tile {
                required property var modelData
                look: root.withLook(Schema.lookSet(modelData))
                title: Schema.lookLabels[modelData]
                on: root.wearing === modelData
                onClicked: if (root.svc) root.svc.applyLook(modelData)
            }
        }
    }

    // ---- ready made cursors -----------------------------------------------------------
    Text {
        textFormat: Text.PlainText
        Layout.fillWidth: true
        Layout.topMargin: 10
        text: "Cursors"
        color: root.ink
        font.family: root.fontFamily
        font.pixelSize: 10
        font.weight: Font.DemiBold
    }
    Text {
        textFormat: Text.PlainText
        Layout.fillWidth: true
        Layout.maximumWidth: root.width
        text: "Puts on the cursor made in Plume, looking like this. Shape, colors and lines can be changed in Cursor."
        color: root.ink
        opacity: 0.55
        font.family: root.fontFamily
        font.pixelSize: 8
        wrapMode: Text.Wrap
    }
    GridLayout {
        Layout.fillWidth: true
        columns: 4
        columnSpacing: 8
        rowSpacing: 8
        Repeater {
            model: Schema.cursorLooks
            delegate: Tile {
                required property var modelData
                cursors: root.cursorsOf(modelData.key)
                title: modelData.label
                on: root.wearingCursor === modelData.key
                onClicked: if (root.svc) root.svc.wearCursor(modelData.key)
            }
        }
    }

    // ---- yours ---------------------------------------------------------------------
    RowLayout {
        Layout.fillWidth: true
        Layout.topMargin: 10
        Text {
            textFormat: Text.PlainText
            Layout.fillWidth: true
            text: "Yours"
            color: root.ink
            font.family: root.fontFamily
            font.pixelSize: 10
            font.weight: Font.DemiBold
        }
        Small {
            text: "Save in a free place"
            strong: true
            onClicked: if (root.svc) root.svc.saveNew()
        }
    }
    Text {
        textFormat: Text.PlainText
        Layout.fillWidth: true
        Layout.maximumWidth: root.width
        text: "Each place keeps every setting, not only the look. Click an empty place to keep everything as it is now, and a full one to go back to it. Right click a place to save over it, middle click to clear it."
        color: root.ink
        opacity: 0.55
        font.family: root.fontFamily
        font.pixelSize: 8
        wrapMode: Text.Wrap
    }
    GridLayout {
        Layout.fillWidth: true
        columns: 4
        columnSpacing: 8
        rowSpacing: 8
        Repeater {
            model: Schema.SLOTS
            delegate: Tile {
                id: slot
                required property int index
                readonly property var saved: root.slots[index] || null
                empty: !saved
                look: saved ? root.withLook(saved) : null
                title: saved ? "Look " + (index + 1) : "Empty " + (index + 1)
                on: !!saved && JSON.stringify(Schema.settingsOf(root.cfg)) === JSON.stringify(Schema.settingsOf(root.withLook(saved)))
                onClicked: {
                    if (!root.svc) return
                    if (slot.saved) root.svc.loadSlot(index)
                    else root.svc.saveSlot(index)
                }
                MouseArea {
                    anchors.fill: parent
                    acceptedButtons: Qt.RightButton | Qt.MiddleButton
                    onClicked: function(mouse) {
                        if (!root.svc) return
                        if (mouse.button === Qt.RightButton) root.svc.saveSlot(slot.index)
                        else root.svc.clearSlot(slot.index)
                    }
                }
            }
        }
    }
}
