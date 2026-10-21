export type IconifyIcon = {
    body: string;
    width?: number;
    height?: number;
    left?: number;
    top?: number;
};

export type IconifyData = {
    prefix?: string;
    width?: number;
    height?: number;
    icons?: Record<string, IconifyIcon>;
    aliases?: Record<string, Record<string, unknown>>;
    not_found?: string[];
};

export type IconifyBatch = {
    url: string;
    names: string[];
};

export function iconifyBatchUrls(
    host: string,
    prefix: string,
    names: string[]
): IconifyBatch[] {
    const maxLength = 480;
    const base = `${host}/${prefix}.json?icons=`;
    const batches: IconifyBatch[] = [];
    let current: string[] = [];
    let length = base.length;
    for (const name of names) {
        const added = current.length === 0 ? name.length : name.length + 1;
        if (current.length > 0 && length + added > maxLength) {
            batches.push({ url: base + current.join(","), names: current });
            current = [];
            length = base.length;
        }
        length += current.length === 0 ? name.length : name.length + 1;
        current.push(name);
    }
    if (current.length > 0) {
        batches.push({ url: base + current.join(","), names: current });
    }
    return batches;
}

export function iconifySvg(data: IconifyData, name: string): string | null {
    if (typeof data !== "object" || data === null) return null;
    const own = Object.prototype.hasOwnProperty;
    const icons = data.icons ?? {};
    let icon = own.call(icons, name) ? icons[name] : undefined;
    if (icon === undefined) {
        const aliases = data.aliases ?? {};
        const alias = own.call(aliases, name) ? aliases[name] : undefined;
        if (alias === undefined || typeof alias.parent !== "string") {
            return null;
        }
        if (Object.keys(alias).some((key) => key !== "parent")) return null;
        icon = own.call(icons, alias.parent) ? icons[alias.parent] : undefined;
    }
    if (icon === undefined || typeof icon.body !== "string") return null;
    const width = icon.width ?? data.width ?? 16;
    const height = icon.height ?? data.height ?? 16;
    const left = icon.left ?? 0;
    const top = icon.top ?? 0;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}">${icon.body}</svg>`;
}
