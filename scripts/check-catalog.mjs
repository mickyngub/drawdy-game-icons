import { ICONS } from "../src/catalog-data.ts";
import { ICONIFY_HOST, PREFIXES } from "../src/sources.ts";

// The catalog is built from pinned packages, but the palette fetches the
// SVGs from Iconify's live API, which can rename or drop an icon.
let missing = 0;
for (const prefix of PREFIXES) {
    const res = await fetch(`${ICONIFY_HOST}/collection?prefix=${prefix}`);
    if (!res.ok) {
        console.error(`Iconify ${prefix}: HTTP ${res.status}`);
        process.exit(2);
    }
    const data = await res.json();
    const served = new Set([
        ...(data.uncategorized ?? []),
        ...Object.values(data.categories ?? {}).flat(),
        ...(data.hidden ?? []),
        ...Object.keys(data.aliases ?? {}),
    ]);
    for (const { name } of ICONS) {
        if (served.has(name)) continue;
        console.log(`✗ ${prefix}:${name} is no longer served by Iconify`);
        missing++;
    }
}
if (missing > 0) process.exit(1);
console.log(
    `✓ Iconify serves all ${ICONS.length} icons in ${PREFIXES.join(" and ")}.`
);
