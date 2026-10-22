import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "panel"
import "js/Schema.js" as Schema
import "js/BarBridge.js" as BarBridge

// The bar button: a pointer glyph, bright while the effects are on.
//   left click     effects on / off
//   right click    the settings panel
//   middle click   find the pointer (the rings)
//   scroll         the next or the previous ready made look
BarWidget {
    id: root

    moduleName: "io.github.qempexe.plume"

    // The built-in bar hands over the live service. A replacement bar only gets a
    // service-less facade, so fall back to the detached snapshot the service
    // publishes through js/BarBridge.js.
    readonly property var directService: bar && bar.shell && typeof bar.shell.serviceFor === "function"
        ? bar.shell.serviceFor(moduleName) : null
    property var bridgeApi: null
    property var bridgeSnapshot: null
    property string bridgeSnapshotText: ""
    property string shellSettingsText: ""
    readonly property var service: directService || (bridgeSnapshot ? bridgeService : null)
    readonly property var cfg: service ? service.cfg : Schema.resolve(root.settings, null)
    readonly property bool on: cfg.enabled === true
    readonly property color fg: bar ? bar.barForeground : Color.foreground
    readonly property string fontName: bar ? bar.fontFamily : Style.font.family

    // the service reads the widget's own settings from shell.json through here
    onSettingsChanged: root.pushShellSettings()
    onDirectServiceChanged: {
        root.shellSettingsText = ""
        root.pushShellSettings()
    }

    implicitWidth: button.implicitWidth
    implicitHeight: button.implicitHeight

    ServiceProxy {
        id: bridgeService
        snapshot: root.bridgeSnapshot
        api: root.bridgeApi
    }

    // The snapshot is small and made in the shell process. Poll it only when this
    // bar gave us no service, faster while the settings panel is open.
    Timer {
        interval: settingsPopup.visible ? 250 : 1000
        running: !root.directService
        repeat: true
        triggeredOnStart: true
        onTriggered: root.syncBridge()
    }

    function syncBridge() {
        if (root.directService) return
        const api = BarBridge.current()
        if (!api) {
            root.bridgeApi = null
            root.bridgeSnapshot = null
            root.bridgeSnapshotText = ""
            return
        }
        const next = api.snapshot()
        if (!next) {
            root.bridgeApi = null
            root.bridgeSnapshot = null
            root.bridgeSnapshotText = ""
            return
        }
        const text = JSON.stringify(next)
        if (api !== root.bridgeApi) {
            root.bridgeApi = api
            // a new service (hot reload) needs this widget's entry again
            root.shellSettingsText = ""
            root.pushShellSettings()
        }
        if (text !== root.bridgeSnapshotText) {
            root.bridgeSnapshotText = text
            root.bridgeSnapshot = next
        }
    }

    function pushShellSettings() {
        let next = ({})
        try {
            next = JSON.parse(JSON.stringify(root.settings && typeof root.settings === "object"
                ? root.settings : ({})))
        } catch (e) { return }
        const text = JSON.stringify(next)
        if (text === root.shellSettingsText) return
        let sent = false
        if (root.directService && typeof root.directService.setShellSettings === "function") {
            sent = root.directService.setShellSettings(next)
        } else if (root.bridgeApi) {
            sent = root.bridgeApi.call("setShellSettings", [next]) === true
        }
        if (sent) root.shellSettingsText = text
    }

    Component.onCompleted: {
        root.syncBridge()
        root.pushShellSettings()
    }

    // The shell's summon/toggle path for bar-widget panels: a key binding, or
    // `omarchy-shell shell toggle io.github.qempexe.plume`, opens the settings.
    readonly property bool opened: settingsPopup.visible
    function open() { settingsPopup.open() }
    function close() { settingsPopup.close() }

    WidgetButton {
        id: button
        anchors.fill: parent
        bar: root.bar
        text: "󰇀"                 // a pointer
        dimmed: !root.on
        tooltipText: "Plume: effects " + (root.on ? "on" : "off")
            + (root.service ? " · " + (Schema.lookNow(root.cfg) !== "" ? Schema.lookLabels[Schema.lookNow(root.cfg)] : "your own look") : "")
        onPressed: function(buttonCode) {
            root.syncBridge()
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
