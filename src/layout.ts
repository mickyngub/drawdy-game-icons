export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type InsertRun = {
    viewportKey: string;
    x0: number;
    y0: number;
    count: number;
};

export type InsertSpot = {
    run: InsertRun;
    x: number;
    y: number;
};

export type LabelSpot = {
    x: number;
    y: number;
    width: number;
    fontSize: number;
};

const LABEL_EM_PER_CHAR = 0.8;

export function labelFontSize(size: number): number {
    return Math.max(14, Math.round(size * 0.22));
}

export function viewportKey(rect: Rect): string {
    return [rect.x, rect.y, rect.width, rect.height]
        .map((value) => Math.round(value))
        .join(",");
}

export function nextInsertSpot(
    run: InsertRun | null,
    rect: Rect,
    size: number,
    label: boolean
): InsertSpot {
    const key = viewportKey(rect);
    const next: InsertRun =
        run !== null && run.viewportKey === key
            ? { ...run, count: run.count + 1 }
            : {
                  viewportKey: key,
                  x0: rect.x + rect.width / 2,
                  y0: rect.y + rect.height / 2,
                  count: 0,
              };
    const step = size * 1.25;
    const rowStep = step + (label ? labelFontSize(size) * 1.6 : 0);
    const cols = Math.max(
        1,
        Math.floor((rect.x + rect.width - size - next.x0) / step) + 1
    );
    return {
        run: next,
        x: next.x0 + (next.count % cols) * step,
        y: next.y0 + Math.floor(next.count / cols) * rowStep,
    };
}

export function labelSpot(
    title: string,
    size: number,
    centreX: number,
    iconBottom: number
): LabelSpot {
    const fontSize = labelFontSize(size);
    // The board sets labels in its handwriting font, which the extension
    // cannot measure, so the box is wider than any title needs and the board
    // centres the text inside it.
    const width = Math.ceil(
        title.length * fontSize * LABEL_EM_PER_CHAR + fontSize
    );
    return {
        x: centreX - width / 2,
        y: iconBottom + Math.round(fontSize * 0.5),
        width,
        fontSize,
    };
}
