import QtQuick
import Quickshell
import Quickshell.Wayland
import Quickshell.Hyprland
import "../js/Trails.js" as Trails
import "../js/Halos.js" as Halos
import "../js/Colors.js" as Colors
import "../js/Find.js" as Find
import "../js/Motion.js" as Motion
import "../js/Ink.js" as Ink

// The effects, drawn on one transparent layer per screen above everything else. The
// layer takes no clicks and no keys (an empty input region), so everything under it
// works as before. It only paints while there is something to show.
Item {
    id: root

    visible: false

    property var svc: null
    readonly property var cfg: svc ? svc.cfg : null

    Variants {
        model: Quickshell.screens

        delegate: Component {
            PanelWindow {
                id: win
                required property var modelData

                screen: modelData
                anchors { top: true; bottom: true; left: true; right: true }
                color: "transparent"
                exclusionMode: ExclusionMode.Ignore
                mask: Region {}
                WlrLayershell.layer: WlrLayer.Overlay
                WlrLayershell.namespace: "plume"
                WlrLayershell.keyboardFocus: WlrKeyboardFocus.None
                visible: root.cfg !== null && !hideHere

                // a fullscreen window on this screen hides the effects, unless asked not to
                readonly property var monitor: {
                    try { return Hyprland.monitorFor(win.modelData) } catch (e) { return null }
                }
                readonly property bool hideHere: {
                    if (!root.cfg || root.cfg.fullscreen === "show" || !monitor) return false
                    try { return monitor.activeWorkspace && monitor.activeWorkspace.hasFullscreen === true } catch (e) { return false }
                }
                Connections {
                    target: Hyprland
                    ignoreUnknownSignals: true
                    function onRawEvent(event) {
                        if (event && String(event.name) === "fullscreen") try { Hyprland.refreshWorkspaces() } catch (e) { }
                    }
                }

                Effects {
                    anchors.fill: parent
                    svc: root.svc
                    originX: win.modelData && typeof win.modelData.x === "number" ? win.modelData.x : 0
                    originY: win.modelData && typeof win.modelData.y === "number" ? win.modelData.y : 0
                }
            }
        }
    }
}
