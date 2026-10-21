import type { CatalogIcon } from "./catalog";

export type SearchEntry = {
    icon: CatalogIcon;
    nameKey: string;
    titleKey: string;
    words: string[];
    haystack: string;
};

export function searchEntry(icon: CatalogIcon): SearchEntry {
    const nameKey = icon.name.toLowerCase();
    const titleKey = icon.title.toLowerCase();
    return {
        icon,
        nameKey,
        titleKey,
        words: `${nameKey} ${titleKey}`.split(/[\s-]+/),
        haystack: `${nameKey} ${titleKey} ${nameKey.replace(/-/g, " ")} ${icon.keywords.toLowerCase()}`,
    };
}

export function searchTerms(query: string): string[] {
    return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function termScore(entry: SearchEntry, term: string): number {
    if (!entry.haystack.includes(term)) return -1;
    if (entry.nameKey === term || entry.titleKey === term) return 0;
    if (entry.nameKey.startsWith(term) || entry.titleKey.startsWith(term)) {
        return 1;
    }
    if (entry.words.some((word) => word.startsWith(term))) return 2;
    if (entry.nameKey.includes(term) || entry.titleKey.includes(term)) return 3;
    return 4;
}

// Every term must match; lower scores (exact, then prefix, then word start)
// rank first and ties keep the catalog's own order.
export function rank(pool: SearchEntry[], terms: string[]): SearchEntry[] {
    const scored: { entry: SearchEntry; score: number; index: number }[] = [];
    pool.forEach((entry, index) => {
        let score = 0;
        for (const term of terms) {
            const one = termScore(entry, term);
            if (one < 0) return;
            score += one;
        }
        scored.push({ entry, score, index });
    });
    scored.sort((a, b) => a.score - b.score || a.index - b.index);
    return scored.map((item) => item.entry);
}
