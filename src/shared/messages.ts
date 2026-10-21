export type IconRef = {
    prefix: string;
    name: string;
    title: string;
};

export type IconPick = IconRef & { svg: string };

export type IconSize = 32 | 64 | 128 | 256;

export type Style = "plain" | "tile" | "token";

export type PlaceOptions = {
    size: IconSize;
    style: Style;
    color: string;
    label: boolean;
};

export type PersistedState = {
    recent: IconRef[];
    options: PlaceOptions;
};

export type WebviewToDriver =
    | { type: "ready" }
    | { type: "drop-icon"; icon: IconPick; x: number; y: number }
    | { type: "insert-icon"; icon: IconPick }
    | { type: "persist"; recent: IconRef[]; options: PlaceOptions };

export type DriverToWebview =
    | { type: "init"; recent: IconRef[]; options: PlaceOptions }
    | { type: "theme"; cssVars: string };
