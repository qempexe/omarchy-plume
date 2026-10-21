import QtQuick
import QtQuick.Layouts

// The About tab: the logo, the name and version, who made it, and where to find
// more plugins by the same author.
ColumnLayout {
    id: root

    property string version: ""
    property color ink: "white"
    property color accent: "white"
    property string fontFamily: ""

    // the author's plugins, in one place
    readonly property string moreUrl: "https://github.com/qempexe?tab=repositories&q=omarchy"

    spacing: 6

    Image {
        Layout.alignment: Qt.AlignHCenter
        Layout.topMargin: 8
        Layout.preferredWidth: 84
        Layout.preferredHeight: 84
        // the light logo on a dark panel, the dark one on a light panel
        source: Qt.resolvedUrl(root.ink.r * 0.299 + root.ink.g * 0.587 + root.ink.b * 0.114 > 0.5
                               ? "../../assets/logo.png" : "../../assets/logo-dark.png")
        sourceSize.width: 168
        sourceSize.height: 168
        smooth: true
        mipmap: true
    }

    Text {
        textFormat: Text.PlainText
        Layout.alignment: Qt.AlignHCenter
        Layout.topMargin: 6
        text: "PLUME"
        color: root.ink
        font.family: root.fontFamily
        font.pixelSize: 16
        font.weight: Font.DemiBold
        font.letterSpacing: 4
    }

    Text {
        textFormat: Text.PlainText
        Layout.alignment: Qt.AlignHCenter
        visible: root.version !== ""
        text: "Version " + root.version
        color: root.accent
        font.family: root.fontFamily
        font.pixelSize: 9
        font.letterSpacing: 1.5
    }

    Row {
        Layout.alignment: Qt.AlignHCenter
        Layout.topMargin: 10
        spacing: 0
        Text {
            textFormat: Text.PlainText
            text: "made with "
            color: root.ink
            opacity: 0.75
            font.family: root.fontFamily
            font.pixelSize: 10
        }
        Text {
            textFormat: Text.PlainText
            text: "\u2665"
            color: root.accent
            font.pixelSize: 11
            anchors.verticalCenter: parent.verticalCenter
        }
        Text {
            textFormat: Text.PlainText
            text: " by qempexe"
            color: root.ink
            opacity: 0.75
            font.family: root.fontFamily
            font.pixelSize: 10
        }
    }

    Rectangle {
        Layout.alignment: Qt.AlignHCenter
        Layout.topMargin: 8
        Layout.bottomMargin: 10
        implicitWidth: moreText.implicitWidth + 24
        implicitHeight: 26
        radius: 6
        color: moreArea.containsMouse ? Qt.rgba(root.accent.r, root.accent.g, root.accent.b, 0.22)
                                      : Qt.rgba(root.ink.r, root.ink.g, root.ink.b, 0.07)
        border.width: 1
        border.color: Qt.rgba(root.accent.r, root.accent.g, root.accent.b, moreArea.containsMouse ? 0.8 : 0.35)
        Behavior on color { ColorAnimation { duration: 100 } }

        Text {
            id: moreText
            textFormat: Text.PlainText
            anchors.centerIn: parent
            text: "Check out my other plugins ↗"
            color: root.ink
            font.family: root.fontFamily
            font.pixelSize: 9
        }
        MouseArea {
            id: moreArea
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: Qt.openUrlExternally(root.moreUrl)
        }
    }
}
