// @flow

// noinspection JSUnusedGlobalSymbols
export function replaceLn(text: string): Promise<void> {
  const CLEAR = '\r\x1B[2K\x1B[?7l';
  return print(CLEAR + text);
}

export function printLn(text: string = ''): Promise<void> {
  return print(text + '\n');
}

function print(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    process.stdout.write(text, (err: any) => {
      err ? reject(err) : resolve();
    });
  });
}

export function formatBytes(n: number): string {
  const {floor, pow, max, abs, log} = Math;
  let i = floor(log(max(abs(n), 1)) / log(1000));
  return i === 0
    ? formatNumber(n, 0) + ' B'
    : formatNumber(n / pow(1000, i), 2) + ' ' + ' KMGTPEZY'[i] + 'B';
}

function roundDown(number: number, precision: number): number {
  let factor = Math.pow(10, precision);
  return Math.floor(number * factor) / factor;
}

export function formatNumber(
  n: number,
  decimals: number = 0,
  integers: number = 1,
): string {
  n = roundDown(n, decimals);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    minimumIntegerDigits: integers,
  });
}

export function padString(str: string, len: number): string {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

// noinspection JSUnusedGlobalSymbols
export function waitIO(): Promise<void> {
  return new Promise(resolve => {
    setImmediate(resolve);
  });
}

// noinspection JSUnusedGlobalSymbols
export function delay(delayMs: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, delayMs);
  });
}

export async function trackProgress(
  func: () => Promise<void>,
  loop: () => Promise<void>,
  delayMs: number,
): Promise<void> {
  let running = false;
  let id = setInterval(async () => {
    if (!running) {
      running = true;
      await loop();
      running = false;
    }
  }, delayMs);
  await func();
  clearInterval(id);
  await loop();
}

let nextCid = 1;
export function newCid(): number {
  return nextCid++;
}

// noinspection JSUnusedGlobalSymbols
export function groupBy<Tk, Tv>(
  items: Iterable<Tv>,
  fn: (arg1: Tv) => Tk,
): Map<Tk, Tv[]> {
  let map = new Map<Tk, Tv[]>();
  for (let item of items) {
    let key = fn(item);
    let arr = map.get(key);
    if (arr === undefined) {
      map.set(key, [item]);
    } else {
      arr.push(item);
    }
  }
  return map;
}

/** Shuffle an array in place */
export function shuffle<T>(a: T[]): void {
  let n = a.length;
  // Iterate through all but the last index
  for (let i = 0; i < n - 1; i++) {
    // Pick a random index from i to the end of the array
    let j = i + Math.floor(Math.random() * (n - i));
    // Swap this element with the random one
    let a_i = a[i];
    a[i] = a[j];
    a[j] = a_i;
  }
}

/** Promise.all but without building an array of return values */
export async function waitAll(
  promises: Iterable<Promise<void>>,
): Promise<void> {
  for (let promise of promises) {
    await promise;
  }
}

export interface PendingPromise<T> {
  readonly resolve: (v: T)=> void;
  readonly reject: (err? : any) => void;
}

/**
 * This class is to cap the number of asynchronous jobs entering some code
 * block or using some resource. Construct it with the maximum number of
 * concurrent jobs as a parameter, and use <tt>await counter.inc();</tt> to
 * occupy a slot and <tt>counter.dec();</tt> to return it.
 */
export class AsyncCap {
  count: number = 0;
  queue: PendingPromise<void>[] = [];
  max: number;
  constructor(max: number) {
    this.max = max;
  }
  // noinspection JSUnusedGlobalSymbols
  inc(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({resolve, reject});
      this.run();
    });
  }
  // noinspection JSUnusedGlobalSymbols
  dec(): void {
    this.count--;
    this.run();
  }
  run(): void {
    while (this.queue.length > 0 && this.count < this.max) {
      this.count++;
      this.queue.shift().resolve();
    }
  }
}

// noinspection JSUnusedGlobalSymbols
export function partition<T>(
  items: Iterable<T>,
  func: (arg: T) => boolean,
): [T[], T[]] {
  let t = [];
  let f = [];
  for (let item of items) {
    (func(item) ? t : f).push(item);
  }
  return [t, f];
}

export function sum<T>(items: Iterable<T>, func: (arg: T) => number): number {
  let ret = 0;
  for (let item of items) {
    ret += func(item);
  }
  return ret;
}
