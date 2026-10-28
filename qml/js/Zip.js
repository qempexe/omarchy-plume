.pragma library

// A tiny zip writer: each cursor of a Hyprcursor theme is a zip (a .hlc file) holding
// its meta.hl and its pictures. The files are stored as they are, without compression;
// they are small SVG text. Gives an ArrayBuffer, which FileView.setData() writes.

var CRC = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t.push(c >>> 0);
    }
    return t;
})();

function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

// text as UTF-8 bytes
function utf8(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
        let c = s.charCodeAt(i);
        if (c >= 0xd800 && c < 0xdc00 && i + 1 < s.length) c = 0x10000 + ((c - 0xd800) << 10) + (s.charCodeAt(++i) - 0xdc00);
        if (c < 0x80) out.push(c);
        else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
        else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
        else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
}

// files: [{ name, text }] -> ArrayBuffer
function zip(files) {
    const parts = [], central = [];
    let offset = 0;
    const u16 = (a, v) => a.push(v & 255, (v >>> 8) & 255);
    const u32 = (a, v) => a.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255);
    const DATE = (0 << 9) | (1 << 5) | 1;             // 1 January 1980, the zip epoch

    for (const f of files) {
        const name = utf8(f.name), body = utf8(f.text), crc = crc32(body);
        const head = [];
        u32(head, 0x04034b50); u16(head, 10); u16(head, 0x0800); u16(head, 0); u16(head, 0); u16(head, DATE);
        u32(head, crc); u32(head, body.length); u32(head, body.length); u16(head, name.length); u16(head, 0);
        parts.push(head, name, body);

        const c = [];
        u32(c, 0x02014b50); u16(c, 20); u16(c, 10); u16(c, 0x0800); u16(c, 0); u16(c, 0); u16(c, DATE);
        u32(c, crc); u32(c, body.length); u32(c, body.length); u16(c, name.length); u16(c, 0); u16(c, 0);
        u16(c, 0); u16(c, 0); u32(c, 0); u32(c, offset);
        central.push(c, name);
        offset += head.length + name.length + body.length;
    }
    let size = 0;
    for (const c of central) size += c.length;
    const end = [];
    u32(end, 0x06054b50); u16(end, 0); u16(end, 0); u16(end, files.length); u16(end, files.length);
    u32(end, size); u32(end, offset); u16(end, 0);

    const all = parts.concat(central, [end]);
    let total = 0;
    for (const p of all) total += p.length;
    const buf = new ArrayBuffer(total), view = new Uint8Array(buf);
    let at = 0;
    for (const p of all) { view.set(p, at); at += p.length; }
    return buf;
}
