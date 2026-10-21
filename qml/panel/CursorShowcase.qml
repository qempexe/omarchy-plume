import QtQuick
import QtQuick.Layouts
import "../js/Cursor.js" as Cursor

// The cursor made in Plume at a glance: its main cursors on a light and on a dark
// strip, the busy ones turning, as the settings below make them.
ColumnLayout {
    id: root

    property var design: null
    property bool worn: false
    property color ink: "white"
    property color accent: ink
    property string fontFamily: ""

    readonly property var dirs: ["left_ptr", "hand2", "text", "wait", "progress", "move", "nwse-resize", "not-allowed"]
    property int frame: 0

    spacing: 6

    Timer {
        interval: root.design ? root.design.delay : 70
        repeat: true
        running: root.visible && root.design !== null
        onTriggered: root.frame = (root.frame + 1) % Cursor.FRAMES
    }

    Repeater {
        model: [Qt.rgba(0.93, 0.91, 0.89, 1), Qt.rgba(0.16, 0.13, 0.12, 1)]
        delegate: Rectangle {
            required property var modelData
            Layout.fillWidth: true
            implicitHeight: 48
            radius: 8
            color: modelData
            border.width: 1
            border.color: Qt.rgba(root.ink.r, root.ink.g, root.ink.b, 0.1)

            Row {
                anchors.centerIn: parent
                spacing: Math.max(4, (parent.width - 16 - root.dirs.length * 38) / (root.dirs.length - 1))
                Repeater {
                    model: root.dirs
                    delegate: CursorArt {
                        required property var modelData
                        width: 38
                        height: 38
                        svg: root.design ? Cursor.svgFor(modelData, root.design,
                                                         modelData === "wait" || modelData === "progress" ? root.frame : 0) : ""
                    }
                }
            }
        }
    }

    Text {
        textFormat: Text.PlainText
        visible: !root.worn
        Layout.fillWidth: true
        text: "Pick Made in Plume above to wear this cursor."
        color: root.ink
        opacity: 0.6
        font.family: root.fontFamily
        font.pixelSize: 8
        wrapMode: Text.Wrap
    }
}
