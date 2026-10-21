import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
// @ts-expect-error plain JS
import * as catalogScript from "../scripts/build-catalog.mjs";
import { CATEGORIES, ICONS } from "../src/catalog";

const { buildCatalog, hasWord, titleFor } = catalogScript;
const NAME = /^[a-z0-9-]+$/;
const upstream = JSON.parse(
    readFileSync(
        new URL(
            "../node_modules/@iconify-json/game-icons/icons.json",
            import.meta.url
        ),
        "utf8"
    )
);
const groupOf = (name: string) =>
    CATEGORIES.find((group) => group.names.includes(name))?.id;
const iconOf = (name: string) => ICONS.find((icon) => icon.name === name);

test("the committed catalog matches the pinned package and the word rules", () => {
    const built = buildCatalog(upstream);
    assert.deepEqual(built.icons, ICONS, "run npm run catalog");
    assert.deepEqual(built.categories, CATEGORIES, "run npm run catalog");
});

test("every visible icon is listed once with a plain name and a title", () => {
    const seen = new Set<string>();
    for (const icon of ICONS) {
        assert.match(icon.name, NAME);
        assert.ok(icon.title.length > 0, icon.name);
        assert.ok(!seen.has(icon.name), `${icon.name} is listed twice`);
        seen.add(icon.name);
    }
    const visible = Object.entries(upstream.icons).filter(
        ([, icon]) => !(icon as { hidden?: boolean }).hidden
    );
    assert.equal(ICONS.length, visible.length);
});

test("icons hidden upstream are left out", () => {
    const hidden = Object.entries(upstream.icons)
        .filter(([, icon]) => (icon as { hidden?: boolean }).hidden)
        .map(([name]) => name);
    assert.ok(hidden.length > 0);
    for (const name of hidden) assert.equal(iconOf(name), undefined, name);
});

test("the chips come in order and each holds at least 40 listed icons", () => {
    assert.deepEqual(
        CATEGORIES.map((group) => group.id),
        [
            "weapons",
            "armour",
            "magic",
            "monsters",
            "characters",
            "animals",
            "dice",
            "treasure",
            "places",
            "food",
            "scifi",
            "symbols",
        ]
    );
    const listed = new Set(ICONS.map((icon) => icon.name));
    const placed = new Set<string>();
    for (const group of CATEGORIES) {
        assert.ok(
            group.names.length >= 40,
            `${group.id} has ${group.names.length}`
        );
        for (const name of group.names) {
            assert.ok(listed.has(name), `${group.id}: ${name}`);
            assert.ok(!placed.has(name), `${name} is in two categories`);
            placed.add(name);
        }
    }
});

test("obvious icons land in the obvious category", () => {
    assert.equal(groupOf("crossed-swords"), "weapons");
    assert.equal(groupOf("dragon-head"), "monsters");
    assert.equal(groupOf("dice-twenty-faces-twenty"), "dice");
    assert.equal(groupOf("card-king-hearts"), "dice");
    assert.equal(groupOf("chess-knight"), "dice");
    assert.equal(groupOf("potion-ball"), "magic");
    assert.equal(groupOf("chest"), "treasure");
    assert.equal(groupOf("castle"), "places");
    assert.equal(groupOf("chest-armor"), "armour");
    assert.equal(groupOf("hot-dog"), "food");
    assert.equal(groupOf("bear-head"), "animals");
});

test("gamer words are searchable keywords", () => {
    assert.match(iconOf("dice-twenty-faces-twenty")!.keywords, /\bd20\b/);
    assert.match(iconOf("d12")!.keywords, /\bd12\b/);
    assert.match(iconOf("health-potion")!.keywords, /\bmana\b/);
    assert.match(iconOf("open-treasure-chest")!.keywords, /\bloot\b/);
});

test("titles read as words and keep their numbers", () => {
    assert.equal(titleFor("crossed-swords"), "Crossed swords");
    assert.equal(titleFor("card-10-spades"), "Card 10 spades");
    assert.equal(titleFor("abstract-011"), "Abstract 011");
});

test("a rule word matches whole dash-separated words only", () => {
    assert.ok(hasWord("hot-dog", "hot-dog"));
    assert.ok(hasWord("bear-head", "bear"));
    assert.ok(!hasWord("hot-dogs", "hot-dog"));
    assert.ok(!hasWord("bearded", "bear"));
});
