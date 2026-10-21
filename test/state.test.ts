import assert from "node:assert/strict";
import { test } from "node:test";
import { readState } from "../src/index";

const DEFAULT_OPTIONS = {
    size: 64,
    style: "plain",
    color: "ink",
    label: false,
};

test("readState falls back to the defaults, with labels off", () => {
    const empty = { recent: [], options: DEFAULT_OPTIONS };
    assert.deepEqual(readState(undefined), empty);
    assert.deepEqual(readState({}), empty);
});

test("readState keeps valid values", () => {
    for (const style of ["tile", "token"]) {
        const options = { size: 256, style, color: "#be123c", label: true };
        const recent = [
            {
                prefix: "game-icons",
                name: "crossed-swords",
                title: "Crossed swords",
            },
            {
                prefix: "game-icons",
                name: "card-10-spades",
                title: "Card 10 spades",
            },
        ];
        assert.deepEqual(readState({ recent, options }), { recent, options });
    }
});

test("readState rejects a bad size, style, colour and label", () => {
    const state = readState({
        options: { size: 100, style: "pencil", color: "red", label: "true" },
    });
    assert.deepEqual(state.options, DEFAULT_OPTIONS);
    assert.equal(
        readState({ options: { color: "#12345" } }).options.color,
        "ink"
    );
});

test("readState drops recent icons from other sets and odd names, and keeps 12", () => {
    const kept = { prefix: "game-icons", name: "chest", title: "Chest" };
    const state = readState({
        recent: [
            { prefix: "streamline-freehand", name: "camera", title: "Camera" },
            { source: "lucide", name: "server", title: "Server" },
            { prefix: "game-icons", name: "Chest", title: "Chest" },
            { prefix: "game-icons", name: "../x", title: "x" },
            kept,
        ],
    });
    assert.deepEqual(state.recent, [kept]);
    const many = Array.from({ length: 20 }, (_, i) => ({
        ...kept,
        name: `chest-${i}`,
    }));
    assert.equal(readState({ recent: many }).recent.length, 12);
});
