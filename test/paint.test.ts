import assert from "node:assert/strict";
import { test } from "node:test";
import { paint } from "../src/paint";

const LIGHT = { ink: "#1e1e1e", paper: "#ffffff" };
const DARK = { ink: "#f4f4f5", paper: "#18181b" };

test("Plain draws the glyph and its label in the chosen colour", () => {
    assert.deepEqual(paint("plain", "#ff4d4d", LIGHT.ink, LIGHT.paper), {
        recolor: { currentcolor: "#ff4d4d" },
        label: "#ff4d4d",
    });
});

test("Plain with Ink follows the board's ink in light and dark", () => {
    for (const board of [LIGHT, DARK]) {
        assert.deepEqual(paint("plain", "ink", board.ink, board.paper), {
            recolor: { currentcolor: board.ink },
            label: board.ink,
        });
    }
});

test("Tile fills the shape with the colour and cuts the glyph out in the board's background", () => {
    assert.deepEqual(paint("tile", "#698cf9", DARK.ink, DARK.paper), {
        recolor: { currentcolor: DARK.paper },
        label: DARK.ink,
        backdrop: { shape: "tile", color: "#698cf9" },
    });
});

test("Token with Ink is an ink circle with a background-coloured glyph", () => {
    for (const board of [LIGHT, DARK]) {
        assert.deepEqual(paint("token", "ink", board.ink, board.paper), {
            recolor: { currentcolor: board.paper },
            label: board.ink,
            backdrop: { shape: "token", color: board.ink },
        });
    }
});
