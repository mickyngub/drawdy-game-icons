export const FOCUS =
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";
export const TILE = `flex aspect-square cursor-grab touch-none items-center justify-center overflow-hidden rounded-md border border-border bg-surface p-0 text-foreground transition-[background-color,border-color,scale] duration-75 select-none hover:border-primary hover:bg-surface2 active:scale-94 active:cursor-grabbing data-[dragging=true]:opacity-35 [&_svg]:block [&_svg]:size-[22px] ${FOCUS}`;
export const SKELETON = "size-5 animate-pulse rounded-[5px] bg-border";
export const BROKEN = "size-5 rounded-[5px] border border-dashed border-border";
export const GHOST =
    "pointer-events-none fixed top-0 left-0 z-10 flex size-[34px] translate-x-(--gx) translate-y-(--gy) items-center justify-center rounded-md border border-primary bg-surface text-foreground opacity-90 [&_svg]:block [&_svg]:size-5";
export const CHIP = `flex-none cursor-pointer rounded-full border border-border px-[9px] py-[3px] text-[11px] whitespace-nowrap text-muted-foreground hover:text-foreground aria-pressed:border-transparent aria-pressed:bg-primary aria-pressed:text-primary-foreground ${FOCUS}`;
export const RETRY = `mt-2.5 cursor-pointer rounded-md bg-primary px-3 py-[5px] text-xs text-primary-foreground ${FOCUS}`;
