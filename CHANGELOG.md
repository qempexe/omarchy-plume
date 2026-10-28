# Changelog

All notable changes to Plume. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-10-28

### Added

- **Replacement bars**: the bar button and its settings now work in a custom bar too. Where the shell gives a replacement bar's widget no live service, Plume reads a detached snapshot and calls a short allowlist of actions instead; the built-in bar keeps its direct service path. Thanks to [keylimesoda](https://github.com/keylimesoda).
- The settings can also be opened from a key binding with `omarchy-shell shell toggle io.github.qempexe.plume`.
- **XCursor copy**: the cursor made in Plume is also drawn as XCursor and worn as GTK's cursor theme, so GTK 3 programs (WebKitGTK apps such as Tauri and Electrobun ones) and X11 programs show it instead of the theme from before. Needs `python3` and `rsvg-convert`. Thanks to [vanvonlj](https://github.com/vanvonlj).
- `node tests/test_bridge.js` checks the bridge, its allowlist, and that the snapshot and the panel's view of it stay in step; `python3 tests/test_xcursor.py` checks the XCursor drawing.
- A code of conduct.

### Changed

- The JavaScript is written in ES6: `const` and `let`, arrow functions and method shorthand.
- The README follows a new layout.

### Fixed

- GTK's own cursor theme and size are put back when the shell stops, and at the next start when the cursor made in Plume isn't worn, so GTK programs never point at a folder that is no theme.

## [1.0.0] - 2026-10-22

### Added

- First release.
- **Your own cursor**: 14 arrows with tilt and round corners; 30 surfaces; a solid, gradient or glass fill with a texture, a depth, an opacity and an accent tint; colors from the theme, the window border or your own; 22 lines in four widths, with gradient lines; 18 ornaments and accent caps; 5 shadows, dark or as an accent glow, below or all around. Made into a Hyprcursor theme of SVG pictures and worn through Hyprland, made again when the Omarchy theme changes.
- **Every cursor to match**: the hand (Hand, Arrow and dot, Ring), the text cursor (Beam, Slim, Caret), an animated busy cursor (Ring, Dots, Orbit, at three speeds), help, copy, link, the context menu, not allowed, move, grab, every resize arrow, the crosshair and zoom, under all the names programs ask for.
- **16 ready made cursors**: Plume, Ink, Paper, Accent, Neon, Glass, Candy, Gilded, Marble, Nebula, Stitched, Dot, Sharp, Glitch, Terrazzo and Hologram; `cursor <name>` puts one on from the command line.
- **Trails**: Comet, Beads, Ribbon, Sparks, Echoes and Bubbles, with their length, thickness and strength.
- **Halos**: Glow, Ring, Pulse, Spotlight, Crosshair and Target, with their size and strength, shown always, while moving or when the pointer rests.
- **Colors**: Theme, Theme palette, Window border, Custom, Gradient, Rainbow, Drift and Speed.
- **Shake to find**: shake the mouse and rings rush out of the pointer; `find` does it from the command line.
- **Other cursor themes**: any installed theme and its size, how soon it hides when idle and whether it hides while typing, through Hyprland; "As Omarchy sets it" leaves each one alone and puts back what was there.
- **Looks**: 12 ready made looks, one step of undo, and 12 places of your own that keep every setting.
- **Panel colors**: Follow theme, Theme palette, Window borders, Custom (background, text and accent) or Monochrome; always readable text; an outline in the window border's gradient or one of its colors; a tint and an opacity.
- **A settings panel** with a live preview (your own cursor in it), the cursor on a light and a dark strip as you design it, a search across every setting, and an About tab.
- **The bar button**: effects on and off, the settings, find, and scroll for looks.

[1.1.0]: https://github.com/qempexe/omarchy-plume/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/qempexe/omarchy-plume/releases/tag/v1.0.0
