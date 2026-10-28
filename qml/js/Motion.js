.pragma library

// The pointer's recent path, and what can be read from it: how fast it moves,
// whether it stands still, whether it is being shaken. Plain functions over a
// state object, so they can be tested without a screen.
//
//   const st = fresh()
//   add(st, x, y, now)        every sample, in screen-layout coordinates, now in ms
//   prune(st, now, life)      forget what is older than the trail lasts
//   pointsFor(st, now, life, ox, oy)   the path for one screen, newest first

var MAX_POINTS = 160;

function fresh() {
    return { pts: [], x: NaN, y: NaN, lastMove: 0, speed: 0, moved: 0, turns: [], dir: 0, run: 0 };
}

function valid(v) { return typeof v === "number" && isFinite(v) && Math.abs(v) < 1e6; }

// Hyprland's answer to j/cursorpos: {"x": 812, "y": 455}. Anything else is null.
function parse(text) {
    if (typeof text !== "string" || text.length > 256) return null;
    let o = null;
    try { o = JSON.parse(text); } catch (e) { return null; }
    if (!o || typeof o !== "object" || !valid(o.x) || !valid(o.y)) return null;
    return { x: o.x, y: o.y };
}

// returns true when the pointer moved
function add(st, x, y, now) {
    if (!valid(x) || !valid(y)) return false;
    const moved = !(x === st.x && y === st.y);
    if (moved) {
        const dx = isNaN(st.x) ? 0 : x - st.x, dy = isNaN(st.y) ? 0 : y - st.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const prev = st.pts.length ? st.pts[0] : null;
        // two answers can land within a millisecond; count at least a frame between them
        const dt = prev ? Math.max(8, now - prev.time) : 16;
        // px per second, eased so one jumpy sample doesn't flash the speed colors, and
        // capped so a jump between screens doesn't count as flying
        st.speed = Math.min(8000, st.speed * 0.6 + (dist / dt * 1000) * 0.4);
        st.moved += dist;
        st.lastMove = now;
        noteTurn(st, dx, now);
        st.pts.unshift({ x, y, time: now });
        if (st.pts.length > MAX_POINTS) st.pts.length = MAX_POINTS;
    } else {
        st.speed *= 0.7;
    }
    st.x = x;
    st.y = y;
    return moved;
}

function prune(st, now, life) {
    const cut = now - life * 1000;
    while (st.pts.length > 0 && st.pts[st.pts.length - 1].time < cut) st.pts.pop();
}

// 0..1, how fast: about 3000 px a second counts as flying
function speed01(st) { return Math.max(0, Math.min(1, st.speed / 3000)); }

// seconds since the pointer last moved
function stillFor(st, now) { return st.lastMove > 0 ? (now - st.lastMove) / 1000 : 1e9; }

// the path for a screen whose top left corner is at (ox, oy): newest first, t 0..1 by age
function pointsFor(st, now, life, ox, oy) {
    const out = [];
    const span = life * 1000;
    for (let i = 0; i < st.pts.length; i++) {
        const p = st.pts[i];
        const t = (now - p.time) / span;
        if (t > 1) break;
        out.push({ x: p.x - ox, y: p.y - oy, t: Math.max(0, t) });
    }
    return out;
}

// ---- shake to find -------------------------------------------------------------
// A shake is the pointer going left and right, quickly, several times. Each sideways
// run long enough counts as a turn when it reverses; enough turns close together is
// a shake. sensitivity 1 (needs a big shake) .. 10 (a little wiggle is enough).

function noteTurn(st, dx, now) {
    if (dx === 0) return;
    const dir = dx > 0 ? 1 : -1;
    if (dir === st.dir) { st.run += Math.abs(dx); return; }
    if (st.dir !== 0 && st.run >= 30) st.turns.push(now);
    st.dir = dir;
    st.run = Math.abs(dx);
    while (st.turns.length > 12) st.turns.shift();
}

function shaken(st, now, sensitivity) {
    const s = Math.max(1, Math.min(10, sensitivity || 5));
    const need = Math.round(7 - s * 0.4);          // 7 turns at 1 .. 3 at 10
    const within = 600 + s * 40;                    // ms
    const recent = st.turns.filter((t) => now - t <= within);
    if (recent.length >= need) {
        st.turns = [];
        return true;
    }
    return false;
}
