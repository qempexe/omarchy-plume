import QtQuick
import "../js/Demo.js" as Demo

// A small picture of the effects as some values would draw them: the trail, the
// halo and their colors around a pointer sweeping through the box. With `live` it
// keeps moving, for the preview at the top of the panel. With `cursorSvg` the pointer
// is the cursor made in Plume instead of a plain arrow.
Canvas {
    id: root

    property var values: ({})          // every setting, as Schema.resolve gives them
    property var colors: ({})          // the service's colorCtx
    property real scale: 0.45          // effects are drawn this much smaller than on screen
    property bool live: false
    property string cursorSvg: ""
    property var cursorHot: [0.2, 0.15]

    property real phase: 0.15
    property var mem: null

    renderTarget: Canvas.Image
    readonly property string key: JSON.stringify([values, colors, width, height, scale])
    onKeyChanged: { mem = null; requestPaint() }
    onVisibleChanged: if (visible) requestPaint()

    Timer {
        interval: 33
        repeat: true
        running: root.live && root.visible
        onTriggered: { root.phase = (root.phase + 0.004) % 1; root.requestPaint() }
    }

    onPaint: {
        const ctx = getContext("2d")
        ctx.reset()
        if (width < 4 || height < 4 || !root.values || !root.values.trail) return
        if (root.live && !root.mem) root.mem = ({})
        Demo.draw(ctx, root.values, root.colors, width, height, root.phase, root.scale,
                  root.live ? root.mem : null, root.live ? Date.now() / 1000 : 2.4, root.cursorSvg !== "")
    }

    CursorArt {
        visible: root.cursorSvg !== ""
        svg: root.cursorSvg
        readonly property var at: Demo.head(root.width, root.height, root.phase)
        width: Demo.pointerSize(root.height) * 1.55
        height: width
        x: at.x - root.cursorHot[0] * width
        y: at.y - root.cursorHot[1] * height
    }
}
