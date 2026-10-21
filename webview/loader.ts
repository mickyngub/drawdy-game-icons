import { iconifyBatchUrls, iconifySvg, type IconifyData } from "../src/iconify";
import type { IconRef } from "../src/shared/messages";
import { ICONIFY_HOST } from "../src/sources";
import { cleanSvg } from "../src/svg";

const BATCH_DELAY_MS = 30;
const MAX_BATCHES_IN_FLIGHT = 2;

type Waiter = {
    name: string;
    resolve: (svg: string) => void;
    reject: (error: unknown) => void;
};

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
const failed = new Set<string>();
let queue = new Map<string, Waiter[]>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;
const jobs: (() => Promise<unknown>)[] = [];
let active = 0;

export const keyOf = (icon: IconRef): string => `${icon.prefix}:${icon.name}`;

export const cachedSvg = (icon: IconRef): string | undefined =>
    cache.get(keyOf(icon));

export const hasFailed = (icon: IconRef): boolean => failed.has(keyOf(icon));

export function forgetFailures(): void {
    failed.clear();
}

async function request<T>(url: string, read: (r: Response) => Promise<T>) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return read(response);
}

function pump(): void {
    while (active < MAX_BATCHES_IN_FLIGHT && jobs.length > 0) {
        const job = jobs.shift()!;
        active++;
        const done = () => {
            active--;
            pump();
        };
        job().then(done, done);
    }
}

function queueJob(job: () => Promise<unknown>): void {
    jobs.push(job);
    pump();
}

function loadBatch(prefix: string, url: string, waiters: Waiter[]) {
    return request(url, (r) => r.json() as Promise<IconifyData>).then(
        (data) => {
            for (const waiter of waiters) {
                const svg = iconifySvg(data, waiter.name);
                if (svg !== null) {
                    waiter.resolve(svg);
                    continue;
                }
                queueJob(() =>
                    request(
                        `${ICONIFY_HOST}/${prefix}/${waiter.name}.svg`,
                        (r) => r.text()
                    ).then(waiter.resolve, waiter.reject)
                );
            }
        },
        (error: unknown) => {
            for (const waiter of waiters) waiter.reject(error);
        }
    );
}

function flush(): void {
    batchTimer = null;
    const queued = queue;
    queue = new Map();
    queued.forEach((waiters, prefix) => {
        let offset = 0;
        const names = waiters.map((waiter) => waiter.name);
        for (const batch of iconifyBatchUrls(ICONIFY_HOST, prefix, names)) {
            const slice = waiters.slice(offset, offset + batch.names.length);
            offset += batch.names.length;
            queueJob(() => loadBatch(prefix, batch.url, slice));
        }
    });
}

function enqueue(icon: IconRef): Promise<string> {
    return new Promise((resolve, reject) => {
        let waiters = queue.get(icon.prefix);
        if (!waiters) {
            waiters = [];
            queue.set(icon.prefix, waiters);
        }
        waiters.push({ name: icon.name, resolve, reject });
        if (batchTimer !== null) clearTimeout(batchTimer);
        batchTimer = setTimeout(flush, BATCH_DELAY_MS);
    });
}

export function loadSvg(icon: IconRef): Promise<string> {
    const key = keyOf(icon);
    const cached = cache.get(key);
    if (cached !== undefined) return Promise.resolve(cached);
    const inflight = pending.get(key);
    if (inflight) return inflight;
    if (failed.has(key)) return Promise.reject(new Error("failed earlier"));
    const promise = enqueue(icon).then(
        (text) => {
            const clean = cleanSvg(text);
            cache.set(key, clean);
            pending.delete(key);
            return clean;
        },
        (error: unknown) => {
            pending.delete(key);
            failed.add(key);
            throw error;
        }
    );
    pending.set(key, promise);
    return promise;
}
