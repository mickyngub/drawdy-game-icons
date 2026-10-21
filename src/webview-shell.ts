import { FOCUS } from "../webview/classes";
import { PANEL_CSS } from "./panel-css";

const SEG =
    "inline-flex gap-0.5 rounded-sm border border-border bg-surface p-0.5";
const SEG_BUTTON = `cursor-pointer rounded-[4px] px-[7px] py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs ${FOCUS}`;
const SWATCH = `relative size-[18px] cursor-pointer overflow-hidden rounded-full border border-border aria-pressed:ring-2 aria-pressed:ring-ring aria-pressed:ring-offset-2 aria-pressed:ring-offset-background ${FOCUS}`;
const SECTION_LABEL =
    "mb-1.5 text-[10px] font-semibold tracking-[0.05em] text-muted-foreground uppercase";
const GRID = "grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1.5";
const BODY = `
<header class="flex-none border-b border-border p-3">
    <p class="mb-3 text-[11px]/[1.45] text-muted-foreground">Drag an icon onto the board, or click to add it in view.</p>
    <div id="chips" class="mb-1 flex flex-nowrap gap-1.5 overflow-x-auto pb-1 [scrollbar-color:transparent_transparent] [scrollbar-width:thin] data-[scrolling=true]:[scrollbar-color:var(--color-muted-foreground)_transparent]"></div>
    <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <div class="${SEG}" role="group" aria-label="Size on the board">
            <button type="button" class="${SEG_BUTTON}" data-size="32" title="32 units">S</button>
            <button type="button" class="${SEG_BUTTON}" data-size="64" title="64 units">M</button>
            <button type="button" class="${SEG_BUTTON}" data-size="128" title="128 units">L</button>
            <button type="button" class="${SEG_BUTTON}" data-size="256" title="256 units">XL</button>
        </div>
        <div class="${SEG}" role="group" aria-label="Style">
            <button type="button" class="${SEG_BUTTON}" data-style="plain">Plain</button>
            <button type="button" class="${SEG_BUTTON}" data-style="tile">Tile</button>
            <button type="button" class="${SEG_BUTTON}" data-style="token">Token</button>
        </div>
        <label class="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground select-none"><input type="checkbox" id="label" class="m-0 accent-primary" /> Label</label>
        <div id="colors" class="inline-flex items-center gap-2" role="group" aria-label="Colour">
            <button type="button" class="${SWATCH} bg-foreground" data-color="ink" title="Ink" aria-label="Ink"></button>
            <button type="button" class="${SWATCH} bg-[#b3e000]" data-color="#b3e000" title="Lime" aria-label="Lime"></button>
            <button type="button" class="${SWATCH} bg-[#ffab3c]" data-color="#ffab3c" title="Orange" aria-label="Orange"></button>
            <button type="button" class="${SWATCH} bg-[#698cf9]" data-color="#698cf9" title="Blue" aria-label="Blue"></button>
            <button type="button" class="${SWATCH} bg-[#ff4d4d]" data-color="#ff4d4d" title="Red" aria-label="Red"></button>
            <label id="custom-swatch" class="${SWATCH} inline-block bg-[conic-gradient(#ff4d4d,#ffab3c,#b3e000,#3cc7ff,#698cf9,#c45cff,#ff4d4d)] data-[custom=true]:bg-(--swatch)" title="Custom colour"><input type="color" id="custom-color" value="#000000" aria-label="Custom colour" class="absolute inset-0 size-full cursor-pointer border-0 p-0 opacity-0" /></label>
        </div>
    </div>
    <input id="search" type="search" placeholder="Search game icons (sword, dragon, d20…)" aria-label="Search icons" autocomplete="off" spellcheck="false" class="w-full rounded-md border border-border bg-input px-2.5 py-[7px] text-[13px] text-foreground outline-none focus:border-ring" />
</header>
<div id="recent-wrap" class="flex-none border-b border-border px-3 py-2" hidden>
    <div class="${SECTION_LABEL}">Recent</div>
    <div id="recent" class="${GRID}" role="group" aria-label="Recent icons"></div>
</div>
<main id="main" class="min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-5">
    <div id="status" role="status" class="py-5 text-center text-xs/normal text-muted-foreground" hidden></div>
    <div id="results" class="${GRID}" role="group" aria-label="Icons"></div>
    <div id="count" class="pt-2.5 text-center text-[10px] text-muted-foreground" hidden></div>
    <button id="more" type="button" class="mx-auto mt-2 block cursor-pointer rounded-md border border-border bg-surface px-3 py-[5px] text-xs text-foreground hover:border-primary ${FOCUS}" hidden>Show more</button>
</main>
<footer class="flex-none border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">Icons by Lorc, Delapouite and contributors, game-icons.net, CC BY 3.0</footer>
`;

export function shellHtml(js: string): string {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style id="drawdy-styling">:root{/*__DRAWDY_STYLING__*/}</style>
<style>${PANEL_CSS}</style>
</head>
<body class="flex h-screen flex-col overflow-hidden bg-background font-sans text-xs/[1.4] text-foreground antialiased">
${BODY}
<script>${js}</script>
</body>
</html>`;
}
