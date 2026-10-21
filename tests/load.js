// Loads the plugin's .pragma library files in node: each `.import "x.js" as Name`
// becomes a global Name in the file's own context, and the file's top-level names
// come back as the module.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const cache = new Map();

function load(file) {
    const full = path.resolve(file);
    if (cache.has(full)) return cache.get(full);
    const src = fs.readFileSync(full, "utf8");
    const sandbox = { console, Math, JSON, Date, Object };
    const lines = src.split("\n").map((line) => {
        if (/^\s*\.pragma\s+library/.test(line)) return "";
        const m = /^\s*\.import\s+"([^"]+)"\s+as\s+(\w+)/.exec(line);
        if (m) {
            sandbox[m[2]] = load(path.join(path.dirname(full), m[1]));
            return "";
        }
        return line;
    });
    const ctx = vm.createContext(sandbox);
    cache.set(full, ctx);
    vm.runInContext(lines.join("\n"), ctx, { filename: full });
    return ctx;
}

// A canvas context that checks every number it is given.
function mockCtx() {
    const bad = [];
    const calls = { n: 0 };
    const check = (name, args) => {
        calls.n++;
        for (const a of args) if (typeof a === "number" && !isFinite(a)) bad.push(name + "(" + args.join(",") + ")");
    };
    const gradient = () => ({ addColorStop(t, c) {
        if (!(t >= 0 && t <= 1)) bad.push("stop " + t);
        if (typeof c !== "string" || c.indexOf("NaN") >= 0) bad.push("stop color " + c);
    } });
    const ctx = new Proxy({ bad, calls }, {
        get(target, prop) {
            if (prop in target) return target[prop];
            if (prop === "createLinearGradient" || prop === "createRadialGradient")
                return (...args) => { check(prop, args); return gradient(); };
            if (prop === "getImageData") return () => ({ data: [] });
            return (...args) => check(String(prop), args);
        },
        set(target, prop, value) {
            if (typeof value === "number" && !isFinite(value)) bad.push(String(prop) + "=" + value);
            if (typeof value === "string" && value.indexOf("NaN") >= 0) bad.push(String(prop) + "=" + value);
            target[prop] = value;
            return true;
        }
    });
    return ctx;
}

module.exports = { load, mockCtx };
