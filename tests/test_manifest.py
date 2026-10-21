#!/usr/bin/python3
"""Checks the plugin's files: entry points, plain text everywhere, and helper commands
that are argument arrays with limits (never a shell, never unbounded output).

    python3 tests/test_manifest.py
"""
import json, os, re, unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


def read(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as fh:
        return fh.read()


def code(name):
    src = re.sub(r"/\*.*?\*/", "", read(name), flags=re.S)
    return re.sub(r"(?<![:\"'])//[^\n]*", "", src)


def files(ext):
    return sorted(os.path.relpath(os.path.join(d, f), ROOT)
                  for d, _, fs in os.walk(os.path.join(ROOT, "qml")) for f in fs if f.endswith(ext))


class PluginTests(unittest.TestCase):
    def setUp(self):
        self.m = json.loads(read("manifest.json"))

    def test_entry_points_exist(self):
        for rel in self.m["entryPoints"].values():
            self.assertTrue(os.path.isfile(os.path.join(ROOT, rel)), rel)

    def test_version_has_a_changelog_entry(self):
        self.assertIn("## " + self.m["version"] + "\n", read("CHANGELOG.md"))

    def test_every_text_item_is_plain_text(self):
        """Text.AutoText would render markup (and fetch <img> addresses). Every Text pins PlainText."""
        for name in files(".qml"):
            lines = read(name).split("\n")
            for i, line in enumerate(lines):
                if not re.match(r"^\s*(?:[\w.]+:\s*)?Text \{", line):
                    continue
                depth, block = 0, []
                for l in lines[i:]:
                    depth += l.count("{") - l.count("}")
                    block.append(l)
                    if depth <= 0:
                        break
                self.assertTrue(any("textFormat: Text.PlainText" in b for b in block),
                                "%s:%d Text without textFormat: Text.PlainText" % (name, i + 1))

    def test_helpers_are_bounded_and_never_a_shell(self):
        for name in files(".qml") + files(".js"):
            src = code(name)
            self.assertNotIn("StdioCollector", src, name + ": read output through core/Run.qml")
            self.assertNotRegex(src, r'"(ba)?sh"\s*,\s*"-c"', name + ": no shell")
            if name != "qml/core/Run.qml":
                self.assertNotRegex(src, r"\bProcess\s*\{", name + ": run helpers through core/Run.qml")
        run = code("qml/core/Run.qml")
        self.assertIn('"timeout", "-k"', run)
        self.assertIn('splitMarker: ""', run)

    def test_no_native_text_input(self):
        """TextInput and friends watch the clipboard on their own; fields are SafeField."""
        for name in files(".qml"):
            self.assertNotRegex(code(name), r"\b(TextInput|TextField|TextArea|TextEdit)\s*\{", name)


if __name__ == "__main__":
    unittest.main(verbosity=2)
