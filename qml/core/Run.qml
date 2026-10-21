import QtQuick
import Quickshell.Io

// Runs one helper command with two limits: a time limit and a size limit on what
// it prints. The command is an argument array (never a shell string), and it runs
// under `timeout`, which also stops anything the command started. Output is read
// in chunks as it arrives; once it passes the limit the command is stopped and the
// run ends as "too big", so nothing larger is ever held in memory.
//
//   Run { id: lister; seconds: 20; maxOut: 2 * 1048576
//         onDone: function(code, out, err) { ... } }
//   lister.start(["omarchy", "plugin", "list", "--json"])
//
// `code` is the command's exit code, 124 when it ran out of time, and -1 when its
// output grew past the limit.
Item {
    id: root

    visible: false

    property int seconds: 30                 // time limit
    property int maxOut: 1048576             // characters of stdout kept
    property int maxErr: 16384               // characters of stderr kept
    property var environment: ({})

    readonly property bool running: proc.running
    readonly property int tooBig: -1
    readonly property int timedOut: 124

    signal done(int code, string out, string err)

    property var argv: []
    property string outBuf: ""
    property string errBuf: ""
    property bool over: false
    property bool stopping: false

    function start(command) {
        if (proc.running) return false
        if (!Array.isArray(command) || command.length === 0) return false
        root.argv = command.map(String)
        root.outBuf = ""
        root.errBuf = ""
        root.over = false
        root.stopping = false
        proc.command = ["timeout", "-k", "2", "--", String(Math.max(1, root.seconds))].concat(root.argv)
        proc.running = true
        return true
    }

    // Stops the command (and whatever it started). No `done` follows.
    function stop() {
        if (!proc.running) return
        root.stopping = true
        proc.running = false
    }

    function take(data) {
        if (root.over) return
        if (root.outBuf.length + data.length > root.maxOut) {
            root.over = true
            root.outBuf = ""
            proc.running = false
            return
        }
        root.outBuf += data
    }

    function takeErr(data) {
        if (root.errBuf.length >= root.maxErr) return
        root.errBuf += data.slice(0, root.maxErr - root.errBuf.length)
    }

    function finish(code) {
        const out = root.outBuf, err = root.errBuf
        root.outBuf = ""
        root.errBuf = ""
        if (root.stopping) { root.stopping = false; return }
        root.done(root.over ? root.tooBig : code, root.over ? "" : out, err)
    }

    Process {
        id: proc
        running: false
        environment: root.environment
        stdout: SplitParser { splitMarker: ""; onRead: data => root.take(data) }
        stderr: SplitParser { splitMarker: ""; onRead: data => root.takeErr(data) }
        onExited: code => root.finish(code)
    }
}
