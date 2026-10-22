import type {
    DrawdyElementSchema,
    DriverCommandIssuer,
    DriverManifest,
    DriverModule,
    ModuleStyling,
} from "@drawdy/driver-protocol";
import { ACTION_BUTTON_SVG } from "./action-button";
import { labelSpot, nextInsertSpot, type InsertRun } from "./layout";
import type {
    DriverToWebview,
    IconPick,
    IconRef,
    IconSize,
    PersistedState,
    PlaceOptions,
    Style,
    WebviewToDriver,
} from "./shared/messages";
import { paint } from "./paint";
import { PREFIXES } from "./sources";
import { finalizeIconSvg, toSvgDataUrl } from "./svg";
import { WEBVIEW_HTML } from "./webview-html";

const STATE_KEY = "recent";
const RECENT_LIMIT = 12;
const SIZES: readonly IconSize[] = [32, 64, 128, 256];
const STYLES: readonly Style[] = ["plain", "tile", "token"];
const CUSTOM_COLOR = /^#[0-9a-fA-F]{6}$/;
const ICON_NAME = /^[a-z0-9-]+$/;
const DEFAULT_OPTIONS: PlaceOptions = {
    size: 64,
    style: "plain",
    color: "ink",
    label: false,
};

let requestId = 0;

let driver: {
    manifest: DriverManifest;
    issueCommand: DriverCommandIssuer;
    generateId: () => string;
    styling: ModuleStyling;
    actionButtonId: string;
    webviewId: string;
    webviewHtml: string | null;
    state: PersistedState;
    insertRun: InsertRun | null;
} | null = null;

const nextRequestId = (): string => String(requestId++);

function stylingCssVars(styling: ModuleStyling): string {
    const { tokens, ...flat } = styling as ModuleStyling & {
        tokens?: Record<string, string>;
    };
    const vars = Object.entries(flat).map(([key, value]) =>
        key === "theme"
            ? `color-scheme: ${value};`
            : `--drawdy-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${value};`
    );
    for (const [name, value] of Object.entries(tokens ?? {}))
        vars.push(`${name}: ${value};`);
    return vars.join("");
}

function post(message: DriverToWebview): void {
    if (!driver) return;
    void driver.issueCommand({
        type: "command:webview:post-message",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: { webviewDomId: driver.webviewId, message },
    });
}

function isIconRef(value: unknown): value is IconRef {
    if (typeof value !== "object" || value === null) return false;
    const ref = value as Record<string, unknown>;
    return (
        typeof ref.prefix === "string" &&
        PREFIXES.includes(ref.prefix) &&
        typeof ref.name === "string" &&
        ICON_NAME.test(ref.name) &&
        typeof ref.title === "string"
    );
}

function toRef(icon: IconRef): IconRef {
    return { prefix: icon.prefix, name: icon.name, title: icon.title };
}

function oneOf<T>(list: readonly T[], value: unknown, fallback: T): T {
    return list.includes(value as T) ? (value as T) : fallback;
}

function readOptions(raw: unknown): PlaceOptions {
    const got =
        typeof raw === "object" && raw !== null
            ? (raw as Record<string, unknown>)
            : {};
    return {
        size: oneOf(SIZES, got.size, DEFAULT_OPTIONS.size),
        style: oneOf(STYLES, got.style, DEFAULT_OPTIONS.style),
        color:
            typeof got.color === "string" && CUSTOM_COLOR.test(got.color)
                ? got.color
                : DEFAULT_OPTIONS.color,
        label:
            typeof got.label === "boolean" ? got.label : DEFAULT_OPTIONS.label,
    };
}

export function readState(
    got: Record<string, unknown> | undefined
): PersistedState {
    if (!got) return { recent: [], options: readOptions(null) };
    const raw = Array.isArray(got.recent) ? got.recent : [];
    const recent: IconRef[] = [];
    for (const entry of raw) {
        if (!isIconRef(entry)) continue;
        recent.push(toRef(entry));
        if (recent.length >= RECENT_LIMIT) break;
    }
    return { recent, options: readOptions(got.options) };
}

async function loadState(): Promise<PersistedState> {
    if (!driver) return readState(undefined);
    const res = await driver.issueCommand({
        type: "command:kv-storage:get",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: { key: STATE_KEY },
    });
    if (res.res.error !== undefined) return readState(undefined);
    return readState(res.res.value.got);
}

async function saveState(state: PersistedState): Promise<void> {
    if (!driver) return;
    await driver.issueCommand({
        type: "command:kv-storage:set",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: {
            key: STATE_KEY,
            payload: { recent: state.recent, options: state.options },
        },
    });
}

export const activate: DriverModule["activate"] = async ({
    manifest,
    issueCommand,
    styling,
    generateId,
}) => {
    driver = {
        manifest,
        issueCommand,
        generateId,
        styling,
        actionButtonId: `${manifest.driverId}:action-button`,
        webviewId: `${manifest.driverId}:webview`,
        webviewHtml: null,
        state: readState(undefined),
        insertRun: null,
    };

    const created = await issueCommand({
        type: "command:dom:create-action-button",
        driverId: manifest.driverId,
        requestId: nextRequestId(),
        req: { domElementId: driver.actionButtonId, svg: ACTION_BUTTON_SVG },
    });
    if (!created.res.value?.created) return;

    await issueCommand({
        type: "subscription:dom:theme-changed",
        driverId: manifest.driverId,
        requestId: nextRequestId(),
    });
    await issueCommand({
        type: "subscription:dom:element-clicked",
        driverId: manifest.driverId,
        requestId: nextRequestId(),
        req: { domElementId: driver.actionButtonId },
    });
    await issueCommand({
        type: "subscription:webview:message",
        driverId: manifest.driverId,
        requestId: nextRequestId(),
        req: { webviewDomId: driver.webviewId },
    });

    const restored = await loadState();
    if (!driver) return;
    driver.state = restored;
};

export const onEvent: DriverModule["onEvent"] = async (e) => {
    if (!driver) return;
    switch (e.type) {
        case "subscription:dom:theme-changed": {
            driver.styling = e.body.styling;
            post({ type: "theme", cssVars: stylingCssVars(driver.styling) });
            return;
        }
        case "subscription:dom:element-clicked": {
            if (e.body.domElementId !== driver.actionButtonId) return;
            if (driver.webviewHtml === null) {
                driver.webviewHtml = WEBVIEW_HTML.replace(
                    "/*__DRAWDY_STYLING__*/",
                    stylingCssVars(driver.styling)
                );
            }
            await driver.issueCommand({
                type: "command:webview:create",
                driverId: driver.manifest.driverId,
                requestId: nextRequestId(),
                req: {
                    webviewDomId: driver.webviewId,
                    htmlContent: driver.webviewHtml,
                    keepStateWhenClosed: true,
                },
            });
            return;
        }
        case "subscription:webview:message": {
            if (e.body.webviewDomId !== driver.webviewId) return;
            const message = e.body.message;
            if (typeof message !== "object" || message === null) return;
            await handleWebviewMessage(message as WebviewToDriver);
            return;
        }
        default: {
            return;
        }
    }
};

async function handleWebviewMessage(message: WebviewToDriver): Promise<void> {
    if (!driver) return;
    switch (message.type) {
        case "ready": {
            post({
                type: "init",
                recent: driver.state.recent,
                options: driver.state.options,
            });
            return;
        }
        case "drop-icon": {
            await placeIcon(message.icon, message.x, message.y);
            return;
        }
        case "insert-icon": {
            await insertInView(message.icon);
            return;
        }
        case "persist": {
            driver.state = readState({
                recent: message.recent,
                options: message.options,
            });
            await saveState(driver.state);
            return;
        }
        default: {
            return;
        }
    }
}

async function addIcon(
    icon: IconPick,
    centreX: number,
    centreY: number
): Promise<void> {
    if (!driver || !isIconRef(icon)) return;
    const { options } = driver.state;
    const colors = paint(
        options.style,
        options.color,
        driver.styling.foreground,
        driver.styling.background
    );
    const finished = finalizeIconSvg(icon.svg, {
        size: options.size,
        recolor: colors.recolor,
        backdrop: colors.backdrop,
    });
    if (finished === null) return;

    const meta = {
        [driver.manifest.driverId]: { prefix: icon.prefix, name: icon.name },
    };
    const top = centreY - finished.height / 2;
    const groupId = options.label ? driver.generateId() : undefined;
    const elements: DrawdyElementSchema[] = [
        {
            type: "image",
            drawdyElementId: driver.generateId(),
            groupId,
            url: toSvgDataUrl(finished.svg),
            x: centreX - finished.width / 2,
            y: top,
            width: finished.width,
            height: finished.height,
            meta,
        },
    ];
    if (options.label) {
        const spot = labelSpot(
            icon.title,
            options.size,
            centreX,
            top + finished.height
        );
        elements.push({
            type: "text",
            drawdyElementId: driver.generateId(),
            groupId,
            text: icon.title,
            x: spot.x,
            y: spot.y,
            width: spot.width,
            fontSize: spot.fontSize,
            textAlign: "center",
            color: colors.label,
            meta,
        });
    }

    await driver.issueCommand({
        type: "command:scene:add-drawdy-elements",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: { elements },
    });
}

async function placeIcon(
    icon: IconPick,
    iframeX: number,
    iframeY: number
): Promise<void> {
    if (!driver) return;
    const rectRes = await driver.issueCommand({
        type: "command:dom:element-rect",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: { elementId: driver.webviewId },
    });
    if (!driver || rectRes.res.error !== undefined) return;
    const rect = rectRes.res.value;

    const insidePalette =
        iframeX >= 0 &&
        iframeY >= 0 &&
        iframeX <= rect.width &&
        iframeY <= rect.height;
    if (insidePalette) return;

    const canvasRes = await driver.issueCommand({
        type: "command:camera:screen-to-canvas",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: { x: rect.x + iframeX, y: rect.y + iframeY },
    });
    if (!driver || canvasRes.res.error !== undefined) return;
    const { x, y } = canvasRes.res.value;
    await addIcon(icon, x, y);
}

async function insertInView(icon: IconPick): Promise<void> {
    if (!driver) return;
    const res = await driver.issueCommand({
        type: "command:camera:get-viewport-rect",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
    });
    if (!driver || res.res.error !== undefined) return;
    const { options } = driver.state;
    const spot = nextInsertSpot(
        driver.insertRun,
        res.res.value.rect,
        options.size,
        options.label
    );
    driver.insertRun = spot.run;
    await addIcon(icon, spot.x, spot.y);
}
