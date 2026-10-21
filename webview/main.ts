import { CATEGORIES, ICONS, type CatalogIcon } from "../src/catalog";
import { paint } from "../src/paint";
import {
    rank,
    searchEntry,
    searchTerms,
    type SearchEntry,
} from "../src/search";
import type {
    DriverToWebview,
    IconRef,
    IconSize,
    PlaceOptions,
    Style,
    WebviewToDriver,
} from "../src/shared/messages";
import { PREFIX } from "../src/sources";
import { decorateSvg } from "../src/svg";
import { BROKEN, CHIP, GHOST, RETRY, SKELETON, TILE } from "./classes";
import { cachedSvg, forgetFailures, hasFailed, keyOf, loadSvg } from "./loader";

type DrawdyWebviewApi = {
    postMessage(message: unknown): void;
    onMessage(listener: (message: unknown) => void): () => void;
};

declare function acquireDrawdyApi(): DrawdyWebviewApi;

type Tile = HTMLButtonElement & { iconRef?: IconRef };

const ALL = "all";
const PAGE_SIZE = 120;
const SEARCH_DEBOUNCE_MS = 120;
const RECENT_LIMIT = 12;
const DRAG_THRESHOLD = 5;
const PRESET_COLORS = ["ink", "#b3e000", "#ffab3c", "#698cf9", "#ff4d4d"];

const api = acquireDrawdyApi();
const byId = <T extends HTMLElement>(id: string) =>
    document.getElementById(id) as T;
const all = <T extends HTMLElement>(selector: string) =>
    Array.from(document.querySelectorAll<T>(selector));

const stylingEl = byId<HTMLStyleElement>("drawdy-styling");
const mainEl = byId<HTMLElement>("main");
const resultsEl = byId<HTMLDivElement>("results");
const statusEl = byId<HTMLDivElement>("status");
const countEl = byId<HTMLDivElement>("count");
const moreEl = byId<HTMLButtonElement>("more");
const recentEl = byId<HTMLDivElement>("recent");
const recentWrap = byId<HTMLDivElement>("recent-wrap");
const searchEl = byId<HTMLInputElement>("search");
const chipsEl = byId<HTMLDivElement>("chips");
const customSwatch = byId<HTMLLabelElement>("custom-swatch");
const customInput = byId<HTMLInputElement>("custom-color");
const labelInput = byId<HTMLInputElement>("label");
const sizeButtons = all<HTMLButtonElement>("[data-size]");
const styleButtons = all<HTMLButtonElement>("[data-style]");
const colorButtons = all<HTMLButtonElement>("[data-color]");

const entries = ICONS.map(searchEntry);
const byName = new Map(entries.map((entry) => [entry.icon.name, entry]));
const pools = new Map<string, SearchEntry[]>([[ALL, entries]]);
for (const group of CATEGORIES) {
    pools.set(
        group.id,
        group.names.flatMap((name) => byName.get(name) ?? [])
    );
}

let category = ALL;
let query = "";
let limit = PAGE_SIZE;
let shown: CatalogIcon[] = [];
let recent: IconRef[] = [];
let options: PlaceOptions = {
    size: 64,
    style: "plain",
    color: "ink",
    label: false,
};
let searchTimer: ReturnType<typeof setTimeout> | null = null;
let chipsTimer: ReturnType<typeof setTimeout> | null = null;

const observer = new IntersectionObserver(
    (seen) => {
        for (const entry of seen) {
            if (!entry.isIntersecting) continue;
            observer.unobserve(entry.target);
            fillTile(entry.target as Tile);
        }
    },
    { root: mainEl, rootMargin: "160px" }
);

function post(message: WebviewToDriver): void {
    api.postMessage(message);
}

function refFor(icon: CatalogIcon | IconRef): IconRef {
    return {
        prefix: PREFIX,
        name: icon.name,
        title: icon.title,
    };
}

// The preview cuts Tile and Token glyphs out in the panel's background, as
// placing does with the board's.
function paintSvg(container: HTMLElement, svg: string): void {
    const computed = getComputedStyle(document.body).backgroundColor;
    const paper =
        computed === "" ||
        computed === "transparent" ||
        computed === "rgba(0, 0, 0, 0)"
            ? "#ffffff"
            : computed;
    container.innerHTML = decorateSvg(
        svg,
        paint(options.style, options.color, "currentColor", paper)
    );
    const node = container.querySelector("svg");
    node?.removeAttribute("width");
    node?.removeAttribute("height");
}

function showSkeleton(tile: Tile): void {
    tile.innerHTML = "";
    tile.dataset.state = "loading";
    const skeleton = document.createElement("div");
    skeleton.className = SKELETON;
    tile.appendChild(skeleton);
}

function markFailed(tile: Tile): void {
    tile.innerHTML = "";
    tile.dataset.state = "failed";
    const broken = document.createElement("div");
    broken.className = BROKEN;
    tile.appendChild(broken);
}

function fillTile(tile: Tile): void {
    const icon = tile.iconRef;
    if (!icon) return;
    loadSvg(icon).then(
        (svg) => {
            if (!tile.isConnected) return;
            paintSvg(tile, svg);
            tile.dataset.state = "ready";
        },
        () => {
            if (!tile.isConnected) return;
            markFailed(tile);
            updateFailures();
        }
    );
}

function useIcon(icon: IconRef): void {
    const ref = { prefix: icon.prefix, name: icon.name, title: icon.title };
    recent = [ref, ...recent.filter((entry) => entry.name !== ref.name)].slice(
        0,
        RECENT_LIMIT
    );
    renderRecent();
    persist();
}

function persist(): void {
    post({ type: "persist", recent, options });
}

function send(icon: IconRef, point: { x: number; y: number } | null): void {
    loadSvg(icon).then(
        (svg) => {
            const pick = { ...icon, svg };
            post(
                point
                    ? { type: "drop-icon", icon: pick, x: point.x, y: point.y }
                    : { type: "insert-icon", icon: pick }
            );
            useIcon(icon);
        },
        () => {}
    );
}

function makeGhost(icon: IconRef): HTMLDivElement {
    const ghost = document.createElement("div");
    ghost.className = GHOST;
    const cached = cachedSvg(icon);
    if (cached !== undefined) paintSvg(ghost, cached);
    document.body.appendChild(ghost);
    return ghost;
}

function moveGhost(ghost: HTMLDivElement, x: number, y: number): void {
    ghost.style.setProperty("--gx", `${x - 17}px`);
    ghost.style.setProperty("--gy", `${y - 17}px`);
}

function makeTile(icon: IconRef, eager: boolean): Tile {
    const tile = document.createElement("button") as Tile;
    tile.type = "button";
    tile.className = TILE;
    tile.title = icon.title;
    tile.setAttribute("aria-label", icon.title);
    tile.dataset.icon = keyOf(icon);
    tile.iconRef = icon;

    const cached = cachedSvg(icon);
    if (cached !== undefined) {
        paintSvg(tile, cached);
        tile.dataset.state = "ready";
    } else if (hasFailed(icon)) {
        markFailed(tile);
    } else {
        showSkeleton(tile);
        if (eager) fillTile(tile);
        else observer.observe(tile);
    }

    let startX = 0;
    let startY = 0;
    let pressing = false;
    let dragging = false;
    let ghost: HTMLDivElement | null = null;

    tile.addEventListener("pointerdown", (event) => {
        pressing = true;
        dragging = false;
        startX = event.clientX;
        startY = event.clientY;
        tile.setPointerCapture(event.pointerId);
    });

    tile.addEventListener("pointermove", (event) => {
        if (!pressing) return;
        if (!dragging) {
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
            dragging = true;
            tile.dataset.dragging = "true";
            ghost = makeGhost(icon);
        }
        if (ghost) moveGhost(ghost, event.clientX, event.clientY);
    });

    const endDrag = (event: PointerEvent) => {
        if (tile.hasPointerCapture(event.pointerId)) {
            tile.releasePointerCapture(event.pointerId);
        }
        delete tile.dataset.dragging;
        ghost?.remove();
        ghost = null;
    };

    tile.addEventListener("pointerup", (event) => {
        const wasDragging = dragging;
        endDrag(event);
        if (!pressing) return;
        pressing = false;
        dragging = false;
        send(icon, wasDragging ? { x: event.clientX, y: event.clientY } : null);
    });

    tile.addEventListener("pointercancel", (event) => {
        endDrag(event);
        pressing = false;
        dragging = false;
    });

    // Pointer events cover mouse and touch; this keeps the keyboard working.
    tile.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        send(icon, null);
    });

    return tile;
}

function setStatus(text: string, onRetry: (() => void) | null): void {
    statusEl.replaceChildren();
    statusEl.hidden = false;
    const line = document.createElement("div");
    line.textContent = text;
    statusEl.appendChild(line);
    if (!onRetry) return;
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = RETRY;
    retry.textContent = "Retry";
    retry.addEventListener("click", onRetry);
    statusEl.appendChild(retry);
}

function updateFailures(): void {
    if (shown.length === 0) return;
    if (resultsEl.querySelector('[data-state="failed"]')) {
        setStatus("Some icons didn't load.", retryFailed);
    } else {
        statusEl.hidden = true;
    }
}

function retryFailed(): void {
    forgetFailures();
    statusEl.hidden = true;
    for (const tile of resultsEl.querySelectorAll<Tile>(
        '[data-state="failed"]'
    )) {
        showSkeleton(tile);
        observer.observe(tile);
    }
}

function renderOptions(): void {
    for (const button of sizeButtons) {
        button.setAttribute(
            "aria-pressed",
            String(Number(button.dataset.size) === options.size)
        );
    }
    for (const button of styleButtons) {
        button.setAttribute(
            "aria-pressed",
            String(button.dataset.style === options.style)
        );
    }
    for (const button of colorButtons) {
        button.setAttribute(
            "aria-pressed",
            String(button.dataset.color === options.color)
        );
    }
    const custom = !PRESET_COLORS.includes(options.color);
    customSwatch.setAttribute("aria-pressed", String(custom));
    customSwatch.dataset.custom = String(custom);
    if (custom) {
        customSwatch.style.setProperty("--swatch", options.color);
        customInput.value = options.color;
    }
    labelInput.checked = options.label;
}

function renderChips(): void {
    if (chipsEl.childElementCount === 0) {
        for (const group of [{ id: ALL, title: "All" }, ...CATEGORIES]) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = CHIP;
            chip.textContent = group.title;
            chip.dataset.category = group.id;
            chip.addEventListener("click", () => {
                if (category === group.id) return;
                category = group.id;
                limit = PAGE_SIZE;
                mainEl.scrollTop = 0;
                renderChips();
                renderResults();
            });
            chipsEl.appendChild(chip);
        }
    }
    for (const chip of chipsEl.querySelectorAll<HTMLButtonElement>("button")) {
        chip.setAttribute(
            "aria-pressed",
            String(chip.dataset.category === category)
        );
    }
}

function renderRecent(): void {
    recentEl.replaceChildren();
    recentWrap.hidden = recent.length === 0;
    for (const icon of recent)
        recentEl.appendChild(makeTile(refFor(icon), true));
}

function appendTiles(from: number, to: number): void {
    for (let i = from; i < to; i++) {
        resultsEl.appendChild(makeTile(refFor(shown[i]), false));
    }
}

function renderCount(): void {
    const visible = Math.min(limit, shown.length);
    const more = shown.length > visible;
    countEl.hidden = !more;
    moreEl.hidden = !more;
    if (more) countEl.textContent = `showing ${visible} of ${shown.length}`;
}

function renderResults(): void {
    observer.disconnect();
    resultsEl.replaceChildren();
    const pool = pools.get(category) ?? entries;
    const terms = searchTerms(query);
    shown = (terms.length === 0 ? pool : rank(pool, terms)).map(
        (entry) => entry.icon
    );
    if (shown.length === 0) {
        countEl.hidden = true;
        moreEl.hidden = true;
        setStatus("No icons match that search.", null);
        return;
    }
    statusEl.hidden = true;
    appendTiles(0, Math.min(limit, shown.length));
    renderCount();
    updateFailures();
}

function applyQuery(): void {
    query = searchEl.value;
    limit = PAGE_SIZE;
    mainEl.scrollTop = 0;
    renderResults();
}

function setOption<K extends keyof PlaceOptions>(
    key: K,
    value: PlaceOptions[K]
): void {
    options = { ...options, [key]: value };
    renderOptions();
    if (key === "style" || key === "color") {
        renderRecent();
        renderResults();
    }
    persist();
}

for (const button of sizeButtons) {
    button.addEventListener("click", () =>
        setOption("size", Number(button.dataset.size) as IconSize)
    );
}
for (const button of styleButtons) {
    button.addEventListener("click", () =>
        setOption("style", button.dataset.style as Style)
    );
}
for (const button of colorButtons) {
    button.addEventListener("click", () =>
        setOption("color", button.dataset.color!)
    );
}
customInput.addEventListener("input", () =>
    setOption("color", customInput.value.toLowerCase())
);
labelInput.addEventListener("change", () =>
    setOption("label", labelInput.checked)
);

moreEl.addEventListener("click", () => {
    const from = Math.min(limit, shown.length);
    limit += PAGE_SIZE;
    appendTiles(from, Math.min(limit, shown.length));
    renderCount();
    updateFailures();
});

searchEl.addEventListener("input", () => {
    if (searchTimer !== null) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchTimer = null;
        applyQuery();
    }, SEARCH_DEBOUNCE_MS);
});

searchEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.isComposing) return;
    event.preventDefault();
    if (searchTimer !== null) {
        clearTimeout(searchTimer);
        searchTimer = null;
        applyQuery();
    }
    if (shown.length > 0) send(refFor(shown[0]), null);
});

document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
    }
    const active = document.activeElement;
    if (
        active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
    ) {
        return;
    }
    event.preventDefault();
    searchEl.focus();
});

chipsEl.addEventListener("scroll", () => {
    chipsEl.dataset.scrolling = "true";
    if (chipsTimer !== null) clearTimeout(chipsTimer);
    chipsTimer = setTimeout(() => {
        chipsEl.dataset.scrolling = "false";
        chipsTimer = null;
    }, 800);
});

chipsEl.addEventListener(
    "wheel",
    (event) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        if (chipsEl.scrollWidth <= chipsEl.clientWidth) return;
        event.preventDefault();
        chipsEl.scrollLeft += event.deltaY;
    },
    { passive: false }
);

api.onMessage((raw) => {
    if (typeof raw !== "object" || raw === null) return;
    const message = raw as DriverToWebview;
    if (message.type === "theme") {
        stylingEl.textContent = `:root{${message.cssVars}}`;
        if (options.style !== "plain") {
            renderRecent();
            renderResults();
        }
        return;
    }
    if (message.type !== "init") return;
    recent = Array.isArray(message.recent) ? message.recent : [];
    options = message.options;
    limit = PAGE_SIZE;
    renderOptions();
    renderRecent();
    renderResults();
});

renderChips();
renderOptions();
renderResults();
post({ type: "ready" });
