export const FOCUS =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const SECONDARY = `inline-flex h-7.5 cursor-pointer items-center justify-center gap-1 rounded-lg border border-line bg-subtle px-2.5 text-label text-fg-muted transition-colors hover:bg-hover hover:text-fg active:bg-pressed ${FOCUS}`;
export const TILE = `grid aspect-square cursor-grab touch-none place-items-center overflow-hidden rounded-lg bg-subtle p-0 text-fg transition-colors select-none hover:bg-hover active:cursor-grabbing active:bg-pressed data-[dragging=true]:opacity-35 [&_svg]:block [&_svg]:size-[22px] ${FOCUS}`;
export const SKELETON = "size-5 animate-pulse rounded-sm bg-control-subtle";
export const BROKEN =
    "size-5 rounded-sm border border-dashed border-line-strong";
export const GHOST =
    "pointer-events-none fixed top-0 left-0 z-10 grid size-[34px] translate-x-(--gx) translate-y-(--gy) place-items-center rounded-lg bg-elevated text-fg opacity-90 shadow-md ring-1 ring-line-strong [&_svg]:block [&_svg]:size-5";
export const CHIP = `h-7 shrink-0 cursor-pointer rounded-full border border-line px-3 text-label whitespace-nowrap text-fg-muted transition-colors hover:bg-hover hover:text-fg aria-pressed:border-transparent aria-pressed:bg-accent-subtle aria-pressed:text-accent-text ${FOCUS}`;
export const RETRY = `mt-2 ${SECONDARY}`;
