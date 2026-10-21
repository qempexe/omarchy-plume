import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "panel"
import "js/Schema.js" as Schema

// The bar button: a pointer glyph, bright while the effects are on.
//   left click     effects on / off
//   right click    the settings panel
//   middle click   find the pointer (the rings)
//   scroll         the next or the previous ready made look
BarWidget {
    id: root

    moduleName: "io.github.qempexe.plume"

    readonly property var service: bar && bar.shell ? bar.shell.serviceFor(moduleName) : null
    readonly property var cfg: service ? service.cfg : Schema.resolve(root.settings, null)
    readonly property bool on: cfg.enabled === true
    readonly property color fg: bar ? bar.barForeground : Color.foreground
    readonly property string fontName: bar ? bar.fontFamily : Style.font.family

    // the service reads the widget's own settings from shell.json through here
    onSettingsChanged: if (service) service.shellSettings = root.settings
    onServiceChanged: if (service) service.shellSettings = root.settings

    implicitWidth: button.implicitWidth
    implicitHeight: button.implicitHeight

    WidgetButton {
        id: button
        anchors.fill: parent
        bar: root.bar
        text: "󰇀"                 // a pointer
        dimmed: !root.on
        tooltipText: "Plume: effects " + (root.on ? "on" : "off")
            + (root.service ? " · " + (Schema.lookNow(root.cfg) !== "" ? Schema.lookLabels[Schema.lookNow(root.cfg)] : "your own look") : "")
        onPressed: function(buttonCode) {
            if (!root.service) return
            if (buttonCode === Qt.LeftButton) root.service.setSetting("enabled", !root.on)
            else if (buttonCode === Qt.RightButton) settingsPopup.toggle()
            else if (buttonCode === Qt.MiddleButton) root.service.find()
        }
    }

    // the scroll wheel goes through the ready made looks
    property real wheelRest: 0
    MouseArea {
        anchors.fill: parent
        acceptedButtons: Qt.NoButton
        onWheel: function(w) {
            if (!root.service || !root.cfg.wheelLooks) return
            root.wheelRest += w.angleDelta.y
            if (Math.abs(root.wheelRest) < 120) return
            root.service.stepLook(root.wheelRest < 0 ? 1 : -1)
            root.wheelRest = 0
        }
    }

    SettingsPopup {
        id: settingsPopup
        svc: root.service
        shellSettings: root.settings
        cfg: root.cfg
        anchorItem: root
        barObject: root.bar
        vertical: root.vertical
        fg: root.fg
        fontFamily: root.fontName
    }
}
