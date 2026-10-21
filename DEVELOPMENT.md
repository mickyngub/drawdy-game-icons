# Developing Game Icons

```bash
npm install
npm test
npm run typecheck
npm run check-catalog  # does Iconify still serve every icon in the catalog?
npm run dev            # Tailwind watcher plus the dev server on :5207; in Drawdy run ⌘K → "Add extension dev server" on a local board
npm run build          # regenerates src/catalog-data.ts, src/panel-css.ts, src/webview-html.ts and dist/*.drawdyx
npm run preflight      # before submitting: committed, built, pushed, under Drawdy's limits, above the live version
```

The icon list comes from the pinned `@iconify-json/game-icons` package, which has no categories of its own. `scripts/game-categories.mjs` sorts each icon by the words in its name (the first category in `MATCH_ORDER` whose words it contains wins, and icons that match nothing are only under All) and adds gamer search words such as d20, hp and loot; `scripts/build-catalog.mjs` writes the result to `src/catalog-data.ts`. The palette fetches each SVG from the Iconify API as it scrolls into view. Drawdy builds published versions from this repository's `src/index.ts` and runs no build step, so commit the generated `src/catalog-data.ts`, `src/panel-css.ts` and `src/webview-html.ts` after `npm run build`. The panel is styled with Tailwind CSS v4 utilities: `webview/panel.css` maps Drawdy's theme variables onto Tailwind colours, so the panel follows the board's light and dark themes.

The icons are licensed CC BY 3.0, which requires credit: keep the panel footer, the README credits and this note naming Lorc, Delapouite and the other contributors at game-icons.net.

Bump `driverVersion` in `manifest.json` for every release and add it to `CHANGELOG.md`. `npm test` holds the manifest and listing files to Drawdy's submission rules (a description of at most 500 characters, an icon of at most 256 KB, only `@drawdy/driver-protocol` imported from outside the repository), checks that the committed catalog matches the pinned package and the word rules, and tests the categories, search ranking, SVG finishing with Tile and Token backdrops, colours, Iconify batching, the click layout and the saved-state checks.
