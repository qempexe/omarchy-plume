import QtQuick
import "../js/Motion.js" as Motion
import "../js/Paint.js" as Paint

// The effects on one screen: a canvas the size of the screen, painted from the
// service's frames. It is cleared and left alone once there is nothing to show.
Canvas {
    id: root

    property var svc: null
    property real originX: 0            // where this screen starts in layout coordinates
    property real originY: 0

    readonly property var cfg: svc ? svc.cfg : null
    property var mem: ({})              // what the trail keeps between frames (particles)
    property bool painted: false        // something is on the canvas right now

    // On a GPU the canvas lives in a texture; the software renderer gets an image.
    renderTarget: GraphicsInfo.api === GraphicsInfo.Software ? Canvas.Image : Canvas.FramebufferObject
    renderStrategy: Canvas.Cooperative

    Connections {
        target: root.svc
        function onFrameChanged() { root.requestPaint() }
    }

    onPaint: {
        const ctx = getContext("2d")
        const s = root.svc
        if (!s || !root.cfg) { ctx.reset(); return }
        const st = s.motion
        const life = s.life
        const pts = Motion.pointsFor(st, s.now, life, root.originX, root.originY)
        const px = st.x - root.originX, py = st.y - root.originY
        const here = isFinite(px) && px >= -1 && py >= -1 && px <= width + 1 && py <= height + 1
        const near = here || pts.some((p) => p.x >= -50 && p.y >= -50 && p.x <= width + 50 && p.y <= height + 50)
        if (!near && !root.painted && !(root.mem.parts && root.mem.parts.length) && !(root.mem.bubbles && root.mem.bubbles.length)) return
        ctx.reset()
        const busy = Paint.frame(ctx, {
            cfg: root.cfg, pts: pts, x: px, y: py, here: here, w: width, h: height,
            colors: s.colorCtx, time: s.now / 1000, dt: s.dt, moved: here ? s.moved : 0,
            speed: Motion.speed01(st), still: Motion.stillFor(st, s.now), findAge: (s.now - s.findAt) / 1000,
            mem: root.mem
        })
        root.painted = busy || pts.length > 0 || here
        if (here) s.overlayBusy = busy
    }
}
