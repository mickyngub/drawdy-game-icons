import type { Backdrop } from "./paint";

export type Look = {
    // Paint values (lower-case) mapped to the colour that replaces them.
    recolor: Record<string, string>;
    backdrop?: Backdrop;
};

export type SvgOptions = Look & { size: number };

type ViewBox = { x: number; y: number; width: number; height: number };

export type FinishedSvg = {
    svg: string;
    width: number;
    height: number;
};

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const PIXEL_LONG_SIDE = 512;
const DEFAULT_VIEW_BOX = "0 0 24 24";
const COMMENT = /<!--[\s\S]*?-->/g;
const SCRIPT = /<script[\s\S]*?<\/script>/gi;
const XML_DECLARATION = /<\?xml[\s\S]*?\?>/gi;
const DOCTYPE = /<!DOCTYPE[^>]*>/gi;
const EVENT_HANDLER = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi;
const ROOT_TAG = /<svg\b([^>]*)>/i;
const ATTRIBUTE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const GLYPH_SCALE = 0.72;
const TILE_RADIUS = 0.18;
const PAINT = /\b(fill|stroke|stop-color|color)=(["'])([^"']*)\2/gi;

function parseAttributes(raw: string): Map<string, string> {
    const attributes = new Map<string, string>();
    ATTRIBUTE.lastIndex = 0;
    let match = ATTRIBUTE.exec(raw);
    while (match !== null) {
        attributes.set(match[1], match[2] ?? match[3] ?? "");
        match = ATTRIBUTE.exec(raw);
    }
    return attributes;
}

function serializeAttributes(attributes: Map<string, string>): string {
    let out = "";
    for (const [key, value] of attributes) {
        out += ` ${key}="${value.replace(/"/g, "&quot;")}"`;
    }
    return out;
}

function parseViewBox(raw: string | undefined): ViewBox | null {
    if (raw === undefined) return null;
    const parts = raw
        .trim()
        .split(/[\s,]+/)
        .map(Number);
    if (parts.length !== 4 || !parts.every(Number.isFinite)) return null;
    const [x, y, width, height] = parts;
    return width > 0 && height > 0 ? { x, y, width, height } : null;
}

const round = (value: number): number => Math.round(value * 100) / 100;

export function cleanSvg(text: string): string {
    return text
        .replace(COMMENT, "")
        .replace(SCRIPT, "")
        .replace(XML_DECLARATION, "")
        .replace(DOCTYPE, "")
        .replace(EVENT_HANDLER, "")
        .trim();
}

export function recolorSvg(
    svg: string,
    recolor: Record<string, string>
): string {
    return svg.replace(
        PAINT,
        (whole, name: string, quote: string, value: string) => {
            const next = recolor[value.trim().toLowerCase()];
            return next === undefined
                ? whole
                : `${name}=${quote}${next}${quote}`;
        }
    );
}

function backdropShape(box: ViewBox, backdrop: Backdrop): string {
    const fill = backdrop.color.replace(/"/g, "");
    const side = Math.min(box.width, box.height);
    if (backdrop.shape === "token") {
        return `<circle cx="${round(box.x + box.width / 2)}" cy="${round(box.y + box.height / 2)}" r="${round(side / 2)}" fill="${fill}"/>`;
    }
    return `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${round(side * TILE_RADIUS)}" fill="${fill}"/>`;
}

// Recolours an SVG and, for Tile and Token, puts the glyph on a shape in the
// backdrop colour, shrunk about its centre so it clears the edge.
export function decorateSvg(svg: string, look: Look): string {
    const painted = recolorSvg(svg, look.recolor);
    if (look.backdrop === undefined) return painted;
    const root = ROOT_TAG.exec(painted);
    const close = painted.lastIndexOf("</svg>");
    if (root === null || close < root.index) return painted;
    const box = parseViewBox(parseAttributes(root[1] ?? "").get("viewBox")) ?? {
        x: 0,
        y: 0,
        width: 24,
        height: 24,
    };
    const shift = 1 - GLYPH_SCALE;
    const tx = round((box.x + box.width / 2) * shift);
    const ty = round((box.y + box.height / 2) * shift);
    const open = root.index + root[0].length;
    return (
        painted.slice(0, open) +
        backdropShape(box, look.backdrop) +
        `<g transform="translate(${tx} ${ty}) scale(${GLYPH_SCALE})">` +
        painted.slice(open, close) +
        "</g>" +
        painted.slice(close)
    );
}

export function finalizeIconSvg(
    svgText: string,
    options: SvgOptions
): FinishedSvg | null {
    if (typeof svgText !== "string" || svgText.length === 0) return null;
    const cleaned = cleanSvg(svgText);
    const root = ROOT_TAG.exec(cleaned);
    if (root === null) return null;

    const attributes = parseAttributes(root[1] ?? "");
    let box = parseViewBox(attributes.get("viewBox"));
    if (box === null) {
        attributes.set("viewBox", DEFAULT_VIEW_BOX);
        box = { x: 0, y: 0, width: 24, height: 24 };
    }
    const longSide = Math.max(box.width, box.height);

    attributes.set("xmlns", SVG_NAMESPACE);
    attributes.set(
        "width",
        String(round((PIXEL_LONG_SIDE * box.width) / longSide))
    );
    attributes.set(
        "height",
        String(round((PIXEL_LONG_SIDE * box.height) / longSide))
    );

    const body = cleaned.slice(root.index + root[0].length);
    return {
        svg: decorateSvg(
            `<svg${serializeAttributes(attributes)}>${body}`,
            options
        ),
        width: (options.size * box.width) / longSide,
        height: (options.size * box.height) / longSide,
    };
}

export function toSvgDataUrl(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
