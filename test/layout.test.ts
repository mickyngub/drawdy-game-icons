import assert from "node:assert/strict";
import { test } from "node:test";
import { labelSpot, nextInsertSpot, type InsertSpot } from "../src/layout";

const VIEW = { x: 0, y: 0, width: 1000, height: 800 };

function clicks(times: number, label: boolean): InsertSpot {
    let spot = nextInsertSpot(null, VIEW, 64, label);
    for (let i = 1; i < times; i++) {
        spot = nextInsertSpot(spot.run, VIEW, 64, label);
    }
    return spot;
}

test("a click in a new viewport starts a run at its centre", () => {
    const first = nextInsertSpot(null, VIEW, 64, false);
    assert.deepEqual([first.x, first.y, first.run.count], [500, 400, 0]);

    const nudged = nextInsertSpot(first.run, { ...VIEW, x: 0.3 }, 64, false);
    assert.equal(nudged.run.count, 1);

    const moved = nextInsertSpot(nudged.run, { ...VIEW, x: 300 }, 64, false);
    assert.deepEqual([moved.x, moved.y, moved.run.count], [800, 400, 0]);
});

test("the third click in a run sits two steps right of the first", () => {
    const third = clicks(3, false);
    assert.equal(third.run.count, 2);
    assert.deepEqual([third.x, third.y], [500 + 2 * 80, 400]);
});

test("a run wraps to a second row, a label line lower when labels are on", () => {
    const sixth = clicks(6, true);
    assert.deepEqual([sixth.x, sixth.y], [500 + 5 * 80, 400]);

    const seventh = clicks(7, true);
    assert.deepEqual([seventh.x, seventh.y], [500, 400 + (80 + 14 * 1.6)]);

    const unlabelled = clicks(7, false);
    assert.deepEqual([unlabelled.x, unlabelled.y], [500, 480]);
});

test("a label box is centred under its icon and roomy enough not to wrap", () => {
    for (const [title, size] of [
        ["Cloudflare", 64],
        ["Go", 32],
        ["Amazon Simple Queue Service", 256],
    ] as const) {
        const spot = labelSpot(title, size, 500, 532);
        assert.equal(spot.x + spot.width / 2, 500);
        assert.ok(spot.width >= title.length * spot.fontSize * 0.8);
        assert.equal(spot.y, 532 + Math.round(spot.fontSize * 0.5));
    }
});
