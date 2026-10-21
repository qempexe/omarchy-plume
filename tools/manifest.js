// Writes manifest.json from qml/js/Schema.js, so the settings Omarchy knows about
// always match the ones in the panel:  node tools/manifest.js > manifest.json
// (keep the version and the description up to date by hand, here).
const { load } = require(require("path").join(__dirname, "..", "tests", "load.js"));
const S = load(require("path").join(__dirname, "..", "qml", "js", "Schema.js"));
const type = (it) => ({ bool: "boolean", int: "integer", enum: "enum", trail: "enum", halo: "enum", colors: "enum", scheme: "enum", glyph: "enum", paint: "enum" })[it.kind] || "string";
const schema = [], defaults = {};
for (const it of S.items) {
  const d = { key: it.key, type: type(it), label: it.label };
  if (it.options) d.options = it.options.slice();
  if (it.kind === "int") Object.assign(d, { min: it.min, max: it.max, step: it.step });
  d.defaultValue = it.fallback;
  let desc = it.hint || "";
  if (it.options && it.labels) desc = (desc ? desc + " " : "") + "Options: " + it.options.map(o => o + (it.labels[o] && it.labels[o].toLowerCase() !== String(o) ? " (" + it.labels[o] + ")" : "")).join(", ") + ".";
  if (it.kind === "cursor") desc = "A cursor theme's folder name, *plume for the cursor made in Plume, or empty to leave the cursor as Omarchy sets it.";
  if (it.kind === "color") desc = (desc ? desc + " " : "") + "A hex color like #7aa2f7.";
  d.description = desc || it.label + ".";
  schema.push(d); defaults[it.key] = it.fallback;
}
const m = {
  schemaVersion: 1, id: "io.github.qempexe.plume", name: "Plume", version: "1.0.0", author: "qempexe", license: "MIT",
  description: "Design your own cursor (14 arrows, 30 surfaces, 22 lines, 18 ornaments, shadows, and every other cursor drawn to match) and give your pointer live effects: 6 trails, 6 halos, 8 color modes, shake to find, ready made and saved looks, from one settings panel.",
  kinds: ["service", "bar-widget"], keepLoaded: true,
  entryPoints: { service: "qml/Service.qml", barWidget: "qml/BarWidget.qml" },
  barWidget: { displayName: "Plume", description: "Your own cursor, pointer trails and halos", category: "Appearance",
    aliases: ["cursor", "pointer", "mouse", "trail", "effects"], allowMultiple: false, defaultSection: "right",
    defaults: defaults, schema: schema }
};
process.stdout.write(JSON.stringify(m, null, 2) + "\n");
