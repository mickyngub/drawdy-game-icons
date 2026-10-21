import type { Style } from "./shared/messages";

export type Backdrop = {
    shape: "tile" | "token";
    color: string;
};

export type Paint = {
    recolor: Record<string, string>;
    label: string;
    backdrop?: Backdrop;
};

// Plain draws the glyph in the chosen colour. Tile and Token fill the shape
// with it and cut the glyph out in the board's background colour, so the
// icon reads on light and dark boards alike.
export function paint(
    style: Style,
    color: string,
    ink: string,
    paper: string
): Paint {
    const chosen = color === "ink" ? ink : color;
    if (style === "plain") {
        return { recolor: { currentcolor: chosen }, label: chosen };
    }
    return {
        recolor: { currentcolor: paper },
        label: ink,
        backdrop: { shape: style, color: chosen },
    };
}
