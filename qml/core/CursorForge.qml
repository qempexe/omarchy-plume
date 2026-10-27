import QtQuick
import Quickshell
import Quickshell.Io
import "../js/Cursor.js" as Cursor
import "../js/Zip.js" as Zip
import "../js/Pointer.js" as Pointer

// Makes a design into a Hyprcursor theme Hyprland can wear, in
// ~/.local/share/icons/plume-a (or plume-b):
//   manifest.hl              the theme's name
//   index.theme              for programs that only know XCursor: falls back to your theme
//   hyprcursors/<name>.hlc   one per cursor: a zip of its meta.hl and its pictures
//   cursors/<name>           the same cursors as XCursor, added afterwards by
//                            tools/xcursor.py (see xcursor() below)
// Everything is written by the shell itself, no command runs. The two folders take
// turns, so the one being worn is never rewritten under Hyprland's feet and a new name
// always makes it load afresh. The one not worn has its manifest.hl moved aside (to
// manifest.hl.off), so it is no theme and Hyprland never picks it by itself. Nothing is
// ever deleted: each build writes over the same files.
Item {
    id: root

    visible: false

    readonly property string home: Quickshell.env("HOME") || ""
    readonly property string iconsDir: home + "/.local/share/icons"

    property string worn: ""              // the folder worn last session, from the service
    property string builtName: ""         // the folder holding the last finished theme
    property string builtKey: ""          // and the design it holds
    property bool busy: false
    property string error: ""

    signal built(string name, string key)
    signal xcursorMade(string name, int size)

    property var job: null                 // { name, key, waiting }
    property var next: null                // a build asked for while one runs
    property var writers: []

    function build(design, key, inherits) {
        if (root.home.indexOf("/") !== 0) { root.error = "No home folder to keep the cursor in."; return }
        if (root.busy) { root.next = { design: design, key: key, inherits: inherits }; return }
        const name = (root.builtName || root.worn) === "plume-a" ? "plume-b" : "plume-a"
        const theme = Cursor.theme(design, name, inherits)
        if (!theme) return
        const out = root.iconsDir + "/" + name
        const files = [{ path: out + "/manifest.hl", text: theme.manifest }, { path: out + "/index.theme", text: theme.index }]
        for (const s of theme.shapes) files.push({ path: out + "/hyprcursors/" + s.dir + ".hlc", data: Zip.zip(s.files) })

        root.busy = true
        root.job = { name: name, key: key, waiting: files.length }
        dropWriters()
        watchdog.restart()
        for (const f of files) {
            // the path goes in last, once preload is off, so nothing is read first
            const fv = fileComp.createObject(root, { blockWrites: true, preload: false, printErrors: false })
            if (!fv) { root.fail("Could not write the cursor."); return }
            fv.path = f.path
            root.writers.push(fv)
            fv.saved.connect(root.wrote)
            fv.saveFailed.connect(function() { root.fail("Could not write the cursor to ~/.local/share/icons.") })
            if (f.data !== undefined) fv.setData(f.data)
            else fv.setText(f.text)
        }
    }

    Component {
        id: fileComp
        FileView { }
    }
    function dropWriters() {
        for (const fv of root.writers) fv.destroy()
        root.writers = []
    }

    function wrote() {
        if (!root.job) return
        root.job.waiting--
        if (root.job.waiting <= 0) Qt.callLater(root.finish)
    }
    // writes that never answer count as failed
    Timer {
        id: watchdog
        interval: 8000
        onTriggered: if (root.busy) root.fail("Writing the cursor took too long.")
    }

    function finish() {
        const j = root.job
        if (!j) return
        watchdog.stop()
        dropWriters()
        root.job = null
        root.busy = false
        root.error = ""
        root.builtName = j.name
        root.builtKey = j.key
        root.built(j.name, j.key)
        retire(j.name)
        startNext()
    }
    function fail(why) {
        if (!root.busy) return
        watchdog.stop()
        Qt.callLater(root.dropWriters)
        root.job = null
        root.busy = false
        root.error = why
        startNext()
    }
    function startNext() {
        const n = root.next
        root.next = null
        if (n) build(n.design, n.key, n.inherits)
    }

    // moves the manifest of every folder but `keep` aside ("" for all of them)
    property var retiring: []
    function retire(keep) {
        if (root.home.indexOf("/") !== 0 || (root.worn === "" && root.builtName === "")) return
        if (keep === "") root.builtKey = ""
        root.retiring = ["plume-a", "plume-b"].filter((n) => n !== keep)
        retireNext()
    }
    function retireNext() {
        if (root.retiring.length === 0 || mover.running) return
        const dir = root.iconsDir + "/" + root.retiring[0]
        root.retiring = root.retiring.slice(1)
        mover.start(["mv", "-f", "--", dir + "/manifest.hl", dir + "/manifest.hl.off"])
    }
    Run {
        id: mover
        seconds: 5
        maxOut: 1024
        onDone: function(code, out, err) { root.retireNext() }
    }

    // Draws the cursor in `name` once more as XCursor, at `size`, for the programs that
    // only know XCursor (GTK 3 ones, X11 ones in XWayland). It takes a few seconds, so
    // Hyprland wears the cursor first; an ask while one runs waits for it, the latest only.
    readonly property string xcursorScript: decodeURIComponent(Qt.resolvedUrl("../../tools/xcursor.py").toString().replace(/^file:\/\//, ""))
    property var xcJob: null                 // { name, size }
    property var xcNext: null
    function xcursor(name, size) {
        if (xcRun.running) { root.xcNext = { name: name, size: size }; return }
        const argv = Pointer.xcursorArgs(root.xcursorScript, root.iconsDir + "/" + name, size)
        if (!argv) return
        root.xcJob = { name: name, size: size }
        xcRun.start(argv)
    }
    Run {
        id: xcRun
        seconds: 120
        maxOut: 1024
        onDone: function(code, out, err) {
            const j = root.xcJob, n = root.xcNext
            root.xcJob = null
            root.xcNext = null
            if (j && code === 0) root.xcursorMade(j.name, j.size)
            else if (j) console.warn("Plume: the XCursor copy could not be made: " + err.slice(0, 300))
            if (n) Qt.callLater(root.xcursor, n.name, n.size)
        }
    }
}
