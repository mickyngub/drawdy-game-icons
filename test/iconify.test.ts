import assert from "node:assert/strict";
import { test } from "node:test";
import { iconifyBatchUrls, iconifySvg, type IconifyData } from "../src/iconify";

const HOST = "https://api.iconify.design";
const BASE = `${HOST}/logos.json?icons=`;
const NAMES = Array.from(
    { length: 150 },
    (_, i) => `logo-${"x".repeat(i % 9)}${i}`
);

const DATA: IconifyData = {
    prefix: "circle-flags",
    width: 512,
    height: 512,
    icons: {
        th: { body: `<path d="M0 0h512v512H0z"/>` },
        wide: { body: "<g/>", width: 512, height: 214 },
        shifted: { body: "<g/>", left: -2, top: 4, width: 20 },
        "lang-en": { body: "<circle r='1'/>" },
    },
    aliases: {
        uk: { parent: "lang-en" },
        flipped: { parent: "th", hFlip: true },
        lost: { parent: "nowhere" },
    },
};

const svgOf = (viewBox: string, body: string): string =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;

test("batch URLs stay within 480 characters and keep every name in order", () => {
    const batches = iconifyBatchUrls(HOST, "logos", NAMES);
    assert.ok(batches.length > 1);
    for (const batch of batches) {
        assert.ok(batch.url.length <= 480, `${batch.url.length} characters`);
        assert.equal(batch.url, BASE + batch.names.join(","));
    }
    assert.deepEqual(
        batches.flatMap((batch) => batch.names),
        NAMES
    );
});

test("a batch that reaches exactly 480 characters closes there", () => {
    const filler = Array.from({ length: 10 }, (_, i) => `name-${i}000`);
    const used = BASE.length + filler.join(",").length + 1;
    const last = "z".repeat(480 - used);
    const batches = iconifyBatchUrls(HOST, "logos", [...filler, last, "next"]);
    assert.equal(batches.length, 2);
    assert.equal(batches[0].url.length, 480);
    assert.deepEqual(batches[1].names, ["next"]);
});

test("iconifySvg uses the set's size unless the icon has its own", () => {
    assert.equal(
        iconifySvg(DATA, "th"),
        svgOf("0 0 512 512", `<path d="M0 0h512v512H0z"/>`)
    );
    assert.equal(iconifySvg(DATA, "wide"), svgOf("0 0 512 214", "<g/>"));
});

test("iconifySvg keeps left and top offsets and falls back to 16", () => {
    const { width, height, ...unsized } = DATA;
    assert.equal(iconifySvg(unsized, "shifted"), svgOf("-2 4 20 16", "<g/>"));
});

test("iconifySvg resolves a parent-only alias", () => {
    assert.equal(
        iconifySvg(DATA, "uk"),
        svgOf("0 0 512 512", "<circle r='1'/>")
    );
});

test("iconifySvg refuses transformed aliases and missing names", () => {
    assert.equal(iconifySvg(DATA, "flipped"), null);
    assert.equal(iconifySvg(DATA, "lost"), null);
    assert.equal(iconifySvg(DATA, "nope"), null);
    assert.equal(iconifySvg(DATA, "constructor"), null);
});

test("both functions work the same after a toString round trip", () => {
    const batchUrls = new Function(
        `return ${iconifyBatchUrls.toString()}`
    )() as typeof iconifyBatchUrls;
    const svg = new Function(
        `return ${iconifySvg.toString()}`
    )() as typeof iconifySvg;
    assert.deepEqual(
        batchUrls(HOST, "logos", NAMES),
        iconifyBatchUrls(HOST, "logos", NAMES)
    );
    for (const name of ["th", "wide", "shifted", "uk", "flipped", "nope"]) {
        assert.equal(svg(DATA, name), iconifySvg(DATA, name));
    }
});
