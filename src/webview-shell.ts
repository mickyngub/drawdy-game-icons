import { FOCUS, SECONDARY } from "../webview/classes";
import { PANEL_CSS } from "./panel-css";

const TRACK = "flex h-7 gap-0.5 rounded-lg bg-control-subtle p-0.5";
const SEGMENT = `flex-1 cursor-pointer truncate rounded-md px-1.5 text-label text-fg-subtle transition-colors hover:text-fg aria-pressed:bg-control aria-pressed:text-fg ${FOCUS}`;
const SWATCH =
    "relative size-5 shrink-0 cursor-pointer overflow-hidden rounded-full ring-1 ring-black/10 ring-inset aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const SECTION_LABEL =
    "flex items-center justify-between text-label text-fg-muted";
const GRID = "grid grid-cols-6 gap-1";
const BODY = `
<header class="flex flex-none flex-col gap-1.5 px-4 pt-3 pb-1">
    <p class="text-body text-fg-subtle">Drag an icon onto the board, or click to add it in view.</p>
    <div id="chips" class="-mx-4 flex scroll-pr-8 scroll-pl-4 gap-1.5 overflow-x-auto pr-8 pl-4 [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-32px),transparent)] [scrollbar-width:none]"></div>
    <div class="flex gap-2">
        <div class="${TRACK} w-30" role="group" aria-label="Size on the board">
            <button type="button" class="${SEGMENT}" data-size="32" title="32 units">S</button>
            <button type="button" class="${SEGMENT}" data-size="64" title="64 units">M</button>
            <button type="button" class="${SEGMENT}" data-size="128" title="128 units">L</button>
            <button type="button" class="${SEGMENT}" data-size="256" title="256 units">XL</button>
        </div>
        <div class="${TRACK} flex-1" role="group" aria-label="Style">
            <button type="button" class="${SEGMENT}" data-style="plain">Plain</button>
            <button type="button" class="${SEGMENT}" data-style="tile">Tile</button>
            <button type="button" class="${SEGMENT}" data-style="token">Token</button>
        </div>
    </div>
    <div class="flex items-center justify-between gap-3">
        <div id="colors" class="flex items-center gap-2" role="group" aria-label="Colour">
            <button type="button" class="${SWATCH} bg-fg" data-color="ink" title="Ink" aria-label="Ink"></button>
            <button type="button" class="${SWATCH} bg-[#b3e000]" data-color="#b3e000" title="Lime" aria-label="Lime"></button>
            <button type="button" class="${SWATCH} bg-[#ffab3c]" data-color="#ffab3c" title="Orange" aria-label="Orange"></button>
            <button type="button" class="${SWATCH} bg-[#698cf9]" data-color="#698cf9" title="Blue" aria-label="Blue"></button>
            <button type="button" class="${SWATCH} bg-[#ff4d4d]" data-color="#ff4d4d" title="Red" aria-label="Red"></button>
            <label id="custom-swatch" class="${SWATCH} inline-block bg-[conic-gradient(#ff4d4d,#ffab3c,#b3e000,#3cc7ff,#698cf9,#c45cff,#ff4d4d)] data-[custom=true]:bg-(--swatch) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring" title="Custom colour"><input type="color" id="custom-color" value="#000000" aria-label="Custom colour" class="absolute inset-0 size-full cursor-pointer border-0 p-0 opacity-0" /></label>
        </div>
        <label class="inline-flex cursor-pointer items-center gap-2 text-label text-fg-muted select-none"><span class="grid place-items-center"><input type="checkbox" id="label" class="peer col-start-1 row-start-1 m-0 size-4 cursor-pointer appearance-none rounded-sm border border-line-strong transition-colors checked:border-transparent checked:bg-accent-pressed ${FOCUS}" /><svg class="pointer-events-none invisible col-start-1 row-start-1 size-3 text-on-accent peer-checked:visible" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z"/></svg></span>Label</label>
    </div>
    <div class="relative">
        <svg class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM16.0247 15.8748C17.2475 14.6146 18 12.8956 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18C12.8956 18 14.6146 17.2475 15.8748 16.0247L16.0247 15.8748Z"/></svg>
        <input id="search" type="search" placeholder="Search icons (sword, dragon, d20…)" aria-label="Search icons" autocomplete="off" spellcheck="false" class="h-8 w-full rounded-lg border border-line bg-subtle px-3 pl-9 text-[13px] leading-5 text-fg transition-colors placeholder:text-fg-disabled hover:bg-hover focus:border-line-strong focus:bg-active focus:ring-1 focus:ring-ring focus:outline-none" />
    </div>
</header>
<main id="main" class="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4 [scrollbar-color:var(--color-line-strong)_transparent] [scrollbar-width:thin]">
    <section id="recent-wrap" class="mb-3 flex flex-col gap-2 border-b border-divider pb-3" hidden>
        <div class="${SECTION_LABEL}">Recent</div>
        <div id="recent" class="${GRID}" role="group" aria-label="Recent icons"></div>
    </section>
    <div id="status" role="status" class="py-5 text-center text-body text-fg-subtle" hidden></div>
    <div id="results" class="${GRID}" role="group" aria-label="Icons"></div>
    <div id="count" class="pt-3 text-center text-caption text-fg-subtle" hidden></div>
    <div class="flex justify-center"><button id="more" type="button" class="${SECONDARY} mt-2" hidden>Show more</button></div>
</main>
<footer class="flex-none border-t border-divider px-4 py-2 text-caption text-fg-subtle">Icons by Lorc, Delapouite and contributors, <span class="whitespace-nowrap">game-icons.net</span>, CC BY 3.0</footer>
`;

export function shellHtml(js: string): string {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/google-sans-flex@5.3.2/wght.css" />
<style id="drawdy-styling">:root{/*__DRAWDY_STYLING__*/}</style>
<style>${PANEL_CSS}</style>
</head>
<body class="flex h-screen flex-col overflow-hidden bg-panel font-sans text-body text-fg antialiased">
${BODY}
<script>${js}</script>
</body>
</html>`;
}
