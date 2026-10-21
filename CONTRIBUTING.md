# Contributing

Thanks for wanting to add to Plume. Arrows, trails, halos and color modes are one small file each, so a new one never has to touch the rest.

## A new arrow

1. Copy `qml/js/arrows/classic.js` to `qml/js/arrows/<yours>.js` and give it its own `key`, `label` and `about`.
2. Give its outline as `points`, in cursor units (a cursor is 32 across, x to the right, y down), starting with the tip at `[0, 0]`: the tip is where the click lands. Keep it within about 16 wide and 24 tall.
3. Drawn standing straight up? Set `upright: true` and Plume leans it like the classic arrow. A round dot instead of a shape: `dot: <radius>`.
4. Add it to the list in `qml/js/Arrows.js`.

Every other cursor that shows an arrow (help, copy, link, progress) uses yours too.

## A new surface, line or ornament

Each list lives in one file: `qml/js/parts/Surfaces.js`, `Lines.js` and `Ornaments.js`. Add an entry with its own `key`, `label` and `about`, and a function that returns SVG; the comment at the top of each file lists everything it is handed (the shape, its colors, its box and outline, helpers for gradients, patterns and masks). Keep it to plain shapes, gradients, patterns, masks and blurs, so the settings panel can draw it too. To look at it, `node tests/test_cursor.js` checks it draws well, and the **Cursor** tab shows it on a tile.

## A new trail

1. Copy `qml/js/trails/comet.js` to `qml/js/trails/<yours>.js` and give it its own `key`, `label` and `about`.
2. Write `draw(g)`. It paints one frame into `g.ctx`, a canvas the size of the screen:
   - `g.pts`: the path, newest first, as `{ x, y, t }`; `t` is 0 at the pointer and 1 at the end of the trail
   - `g.size`, `g.strength` (0..1), `g.life` (seconds the trail lasts)
   - `g.dt` (seconds since the last frame) and `g.moved` (how far the pointer moved since then)
   - `g.color(t, alpha)`: the color for a spot along the trail, ready for `fillStyle` or `strokeStyle`
   - `g.mem`: kept from frame to frame, for particles and the like. Keep it bounded.
   - set `g.busy = true` while something still moves after the pointer has stopped
3. Add it to the list in `qml/js/Trails.js`.

## A new halo

The same in `qml/js/halos/`, listed in `qml/js/Halos.js`. A halo draws around `g.x`, `g.y` on a screen of `g.w` by `g.h`; set `full: true` when it reaches across the whole screen.

## A new color mode

Copy `qml/js/colors/theme.js` and write `at(t, c)`, returning `[r, g, b]` or `[r, g, b, a]`. `c` holds `accent`, `palette`, `border`, `custom`, `custom2` (as `[r, g, b]`, lists for the palette and the border), `speed` (0..1) and `time` (seconds). Add it to `qml/js/Colors.js`.

## A new ready made look

Add it to `looks` in `qml/js/Schema.js`. A look only sets trail, halo and color settings.

## Check your work

```bash
node tests/test_parts.js      # every trail, halo and color mode draws clean numbers; looks and settings hold together
node tests/test_cursor.js     # every arrow and style draws a well formed cursor; the theme and its zips hold together
node tests/test_motion.js     # the pointer's path, shaking, and the hyprctl commands
python3 tests/test_manifest.py
```

The settings panel shows every new arrow, trail, halo and color mode as a tile on its own. Keep comments and text plain: say what it does, the way the rest of the files do.
