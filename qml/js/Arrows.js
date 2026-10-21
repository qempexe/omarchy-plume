.pragma library
.import "arrows/classic.js" as Classic
.import "arrows/slim.js" as Slim
.import "arrows/chunky.js" as Chunky
.import "arrows/wedge.js" as Wedge
.import "arrows/dart.js" as Dart
.import "arrows/kite.js" as Kite
.import "arrows/needle.js" as Needle
.import "arrows/teardrop.js" as Teardrop
.import "arrows/leaf.js" as Leaf
.import "arrows/bullet.js" as Bullet
.import "arrows/crest.js" as Crest
.import "arrows/chevron.js" as Chevron
.import "arrows/feather.js" as Feather
.import "arrows/dot.js" as Dot

// Every arrow a cursor made in Plume can have, in the order the settings show them.
// Each one lives in its own file under arrows/ (see CONTRIBUTING.md).
//
// An arrow is { key, label, about } and one of:
//   points   its outline, in cursor units (the cursor is 32 across), the tip at [0, 0]
//            and the tip being where the click lands
//   upright  set when the points stand straight up; it is then leaned like the classic
//   dot      a radius: a round dot instead, clicked in its middle

var list = [Classic.arrow, Slim.arrow, Chunky.arrow, Wedge.arrow, Dart.arrow, Kite.arrow,
            Needle.arrow, Teardrop.arrow, Leaf.arrow, Bullet.arrow, Crest.arrow, Chevron.arrow, Feather.arrow, Dot.arrow];

var byKey = {};
var keys = [];
var labels = {};
var abouts = {};
for (var i = 0; i < list.length; i++) {
    byKey[list[i].key] = list[i];
    keys.push(list[i].key);
    labels[list[i].key] = list[i].label;
    abouts[list[i].key] = list[i].about;
}
