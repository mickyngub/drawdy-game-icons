import assert from "node:assert/strict";
import { test } from "node:test";
import { ICONS, type CatalogIcon } from "../src/catalog";
import { rank, searchEntry, searchTerms } from "../src/search";

const icon = (name: string, title: string, keywords = ""): CatalogIcon => ({
    name,
    title,
    keywords,
});

const POOL = [
    icon("light-bulb-idea", "Light bulb idea", "essentials"),
    icon("creativity-idea-bulb", "Creativity idea bulb", "work"),
    icon("idea", "Idea", "work"),
    icon("cash-payment-bill", "Cash payment bill", "money"),
].map(searchEntry);

const names = (query: string) =>
    rank(POOL, searchTerms(query)).map((entry) => entry.icon.name);

test("an exact name ranks first, then names that start with the term", () => {
    assert.deepEqual(names("idea"), [
        "idea",
        "light-bulb-idea",
        "creativity-idea-bulb",
    ]);
});

test("every term must match, in any order", () => {
    assert.deepEqual(names("bulb creativity"), ["creativity-idea-bulb"]);
    assert.deepEqual(names("bulb cash"), []);
});

test("a topic keyword finds icons whose names do not say it", () => {
    assert.deepEqual(names("money"), ["cash-payment-bill"]);
});

test("search terms are trimmed, lower-cased and split on spaces", () => {
    assert.deepEqual(searchTerms("  Light   BULB "), ["light", "bulb"]);
    assert.deepEqual(searchTerms("   "), []);
});

test("d20 finds the twenty-sided die first, and loot finds chests", () => {
    const all = ICONS.map(searchEntry);
    const top = (query: string) => rank(all, searchTerms(query))[0]?.icon.name;
    assert.match(top("d20") ?? "", /^dice-twenty-faces-/);
    assert.equal(top("crossed swords"), "crossed-swords");
    assert.ok(
        rank(all, searchTerms("loot"))
            .map((entry) => entry.icon.name)
            .includes("open-treasure-chest")
    );
});
