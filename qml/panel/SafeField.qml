import QtQuick

// Single-line editor that is NOT a TextInput. QQuickTextInput connects to the
// clipboard's dataChanged / selectionChanged signals in its constructor and
// re-reads the foreign clipboard (to update canPaste) on every change, with
// no size or time limit, even when paste keys and middle clicks are
// intercepted. This item draws a plain Text and handles keys itself, so no
// clipboard connection ever exists. Pasting is only the owner's bounded
// explicit path: Ctrl+V / Shift+Insert emit `pasteRequested`.
// Not supported (by design): IME composition, copy/cut, mouse selection.
Item {
    id: field
    property string text: ""
    property int maxChars: 256
    property int cursorPosition: 0
    property bool selectAll: false
    property color color: "white"
    property color selectionColor: "#557aa2f7"
    property string fontFamily: ""
    property real fontPixelSize: 10
    property bool dirty: false
    signal pasteRequested()
    signal editingFinished()

    activeFocusOnTab: true
    clip: true

    function clampCursor() {
        cursorPosition = Math.max(0, Math.min(text.length, cursorPosition))
    }

    // Insert plain text at `pos` (replaces everything after select-all).
    function insert(pos, str) {
        let t = String(str === null || str === undefined ? "" : str)
            .replace(/[\u0000-\u001f\u007f]/g, "")
        if (t === "") return
        let base = text
        if (selectAll) { base = ""; pos = 0; selectAll = false }
        const room = maxChars - base.length
        if (room <= 0) return
        t = t.substring(0, room)
        pos = Math.max(0, Math.min(base.length, pos))
        text = base.substring(0, pos) + t + base.substring(pos)
        cursorPosition = pos + t.length
        dirty = true
    }

    function removeBack() {
        if (selectAll) { text = ""; cursorPosition = 0; selectAll = false; dirty = true; return }
        if (cursorPosition <= 0) return
        text = text.substring(0, cursorPosition - 1) + text.substring(cursorPosition)
        cursorPosition -= 1
        dirty = true
    }

    function removeForward() {
        if (selectAll) { removeBack(); return }
        if (cursorPosition >= text.length) return
        text = text.substring(0, cursorPosition) + text.substring(cursorPosition + 1)
        dirty = true
    }

    function finish() {
        selectAll = false
        if (dirty) { dirty = false; editingFinished() }
    }

    onActiveFocusChanged: {
        if (activeFocus) { cursorPosition = text.length; blink.restart() }
        else finish()
    }

    FontMetrics {
        id: fm
        font.family: field.fontFamily
        font.pixelSize: field.fontPixelSize
    }

    Rectangle {          // select-all highlight
        visible: field.selectAll && field.text !== ""
        x: 0
        width: shown.implicitWidth
        height: shown.implicitHeight
        anchors.verticalCenter: parent.verticalCenter
        color: field.selectionColor
    }

    Text {
        id: shown
        textFormat: Text.PlainText
        anchors.verticalCenter: parent.verticalCenter
        text: field.text
        color: field.color
        font.family: field.fontFamily
        font.pixelSize: field.fontPixelSize
    }

    Rectangle {          // caret
        id: caret
        visible: field.activeFocus && blink.on
        width: 1
        height: shown.implicitHeight
        anchors.verticalCenter: parent.verticalCenter
        x: fm.advanceWidth(field.text.substring(0, field.cursorPosition))
        color: field.color
    }

    Timer {
        id: blink
        property bool on: true
        interval: 530
        repeat: true
        running: field.activeFocus
        onTriggered: on = !on
        onRunningChanged: if (running) on = true
    }

    MouseArea {
        anchors.fill: parent
        acceptedButtons: Qt.LeftButton      // middle / right: ignored, nothing pastes
        cursorShape: Qt.IBeamCursor
        onPressed: function(mouse) {
            field.forceActiveFocus()
            field.selectAll = false
            let best = field.text.length
            for (let i = 0; i <= field.text.length; i++) {
                if (fm.advanceWidth(field.text.substring(0, i)) >= mouse.x) { best = i; break }
            }
            field.cursorPosition = best
            blink.on = true
        }
    }

    Keys.onPressed: function(event) {
        const mods = event.modifiers
        const ctrl = (mods & Qt.ControlModifier) !== 0
        blink.on = true
        if (event.matches(StandardKey.Paste)
                || (event.key === Qt.Key_Insert && (mods & Qt.ShiftModifier))) {
            event.accepted = true
            field.pasteRequested()
            return
        }
        if (ctrl && event.key === Qt.Key_A) { selectAll = text !== ""; event.accepted = true; return }
        switch (event.key) {
        case Qt.Key_Return:
        case Qt.Key_Enter:
            finish(); event.accepted = true; return
        case Qt.Key_Backspace: removeBack(); event.accepted = true; return
        case Qt.Key_Delete: removeForward(); event.accepted = true; return
        case Qt.Key_Left: selectAll = false; cursorPosition -= 1; clampCursor(); event.accepted = true; return
        case Qt.Key_Right: selectAll = false; cursorPosition += 1; clampCursor(); event.accepted = true; return
        case Qt.Key_Home: selectAll = false; cursorPosition = 0; event.accepted = true; return
        case Qt.Key_End: selectAll = false; cursorPosition = text.length; event.accepted = true; return
        default: break
        }
        // Printable characters only; leave shortcuts (Esc, Alt+arrows...) to the popup.
        if (!ctrl && !(mods & Qt.AltModifier) && !(mods & Qt.MetaModifier)
                && event.text.length > 0 && event.text.charCodeAt(0) >= 32
                && event.text.charCodeAt(0) !== 127) {
            insert(cursorPosition, event.text)
            event.accepted = true
        }
    }
}
