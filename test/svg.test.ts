import assert from "node:assert/strict";
import { test } from "node:test";
import {
    decorateSvg,
    finalizeIconSvg,
    recolorSvg,
    type SvgOptions,
} from "../src/svg";

const GLYPH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M19 14h480"/></svg>`;
const MIXED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none"><path fill="#020202" d="M1 1h2"/><path fill="#0C6FFF" d="M5 5h2"/></g></svg>`;
const WIDE = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 153"><path fill="#f90" d="M0 0h256v153H0z"/></svg>`;
const HOSTILE = `<?xml version="1.0"?><!-- note --><svg viewBox="0 0 24 24" onload="alert(1)"><script>alert(2)</script><path onclick='steal()' d="M0 0h24"/></svg>`;

const OPTIONS: SvgOptions = { size: 64, recolor: {} };

function finish(svg: string, overrides: Partial<SvgOptions> = {}) {
    const result = finalizeIconSvg(svg, { ...OPTIONS, ...overrides });
    assert.ok(result, "finalizeIconSvg returned null");
    return result;
}

const rootTag = (svg: string): string => /^<svg[^>]*>/.exec(svg)?.[0] ?? "";

test("currentColor takes the chosen colour", () => {
    const { svg } = finish(GLYPH, { recolor: { currentcolor: "#ff4d4d" } });
    assert.ok(!svg.includes("currentColor"));
    assert.match(svg, /<path fill="#ff4d4d"/);
});

test("hex paints are swapped whatever their case, and none stays none", () => {
    const svg = recolorSvg(MIXED, {
        "#020202": "#111111",
        "#0c6fff": "#b3e000",
    });
    assert.match(svg, /<g fill="none">/);
    assert.match(svg, /<path fill="#111111" d="M1 1h2"/);
    assert.match(svg, /<path fill="#b3e000" d="M5 5h2"/);
});

test("paints not in the map keep their colour", () => {
    const { svg } = finish(WIDE, { recolor: { currentcolor: "#ff4d4d" } });
    assert.match(svg, /<path fill="#f90"/);
});

test("a wide viewBox keeps its aspect on the board and stays crisp", () => {
    const { svg, width, height } = finish(WIDE);
    assert.equal(width, 64);
    assert.equal(height, 38.25);
    assert.match(rootTag(svg), / width="512"/);
    assert.match(rootTag(svg), / height="306"/);
});

test("an icon without a viewBox is treated as 24 by 24", () => {
    const { svg, width, height } = finish(`<svg><path d="M0 0"/></svg>`, {
        size: 128,
    });
    assert.deepEqual([width, height], [128, 128]);
    assert.match(rootTag(svg), / viewBox="0 0 24 24"/);
});

test("scripts, event handlers, comments and the XML declaration are stripped", () => {
    const { svg } = finish(HOSTILE);
    assert.ok(!/script/i.test(svg));
    assert.ok(!/\son[a-z]+\s*=/i.test(svg));
    assert.ok(!svg.includes("<!--"));
    assert.ok(!svg.includes("<?xml"));
    assert.match(svg, /<path\s+d="M0 0h24"\/>/);
});

test("text that is not an SVG is refused", () => {
    assert.equal(finalizeIconSvg("<html></html>", OPTIONS), null);
    assert.equal(finalizeIconSvg("", OPTIONS), null);
});

test("Tile puts a rounded square in the colour behind the shrunk, recoloured glyph", () => {
    const { svg, width, height } = finish(GLYPH, {
        recolor: { currentcolor: "#ffffff" },
        backdrop: { shape: "tile", color: "#be123c" },
    });
    assert.deepEqual([width, height], [64, 64]);
    assert.match(
        svg,
        /<rect x="0" y="0" width="512" height="512" rx="92.16" fill="#be123c"\/><g transform="translate\(71.68 71.68\) scale\(0.72\)"><path fill="#ffffff"/
    );
    assert.ok(svg.endsWith("</g></svg>"));
    assert.ok(!svg.includes("currentColor"));
});

test("Token puts a circle behind the glyph, centred on the viewBox", () => {
    const svg = decorateSvg(
        `<svg viewBox="10 20 100 100"><path fill="currentColor" d="M0 0"/></svg>`,
        {
            recolor: { currentcolor: "#18181b" },
            backdrop: { shape: "token", color: "#f4f4f5" },
        }
    );
    assert.match(svg, /<circle cx="60" cy="70" r="50" fill="#f4f4f5"\/>/);
    assert.match(svg, /<path fill="#18181b"/);
});

test("Plain adds no backdrop", () => {
    const svg = decorateSvg(GLYPH, { recolor: { currentcolor: "#ff4d4d" } });
    assert.ok(!/<rect|<circle|<g transform/.test(svg));
});
