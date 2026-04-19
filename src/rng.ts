export type RngFn = () => number;

export interface RngStreams {
  logic: RngFn;
  vfx: RngFn;
  map: RngFn;
}

function mulberry32(seed: number): RngFn {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hasWindow = typeof window !== 'undefined';

const raw = hasWindow
  ? new URLSearchParams(window.location.search).get('seed')
  : null;

const base = raw !== null
  ? (parseInt(raw, 10) >>> 0)
  : (Math.floor(Math.random() * 0xffffffff) >>> 0);

export const GAME_SEED: number = base;

export const rng: RngStreams = {
  logic: mulberry32(base),
  vfx: mulberry32(base ^ 0xdeadbeef),
  map: mulberry32(base ^ 0xc0ffee),
};

if (hasWindow) {
  Math.random = rng.logic;
  (window as unknown as { GAME_SEED: number; rng: RngStreams }).GAME_SEED = GAME_SEED;
  (window as unknown as { GAME_SEED: number; rng: RngStreams }).rng = rng;
  console.log(
    `[RNG] seed=${base}${raw !== null ? ' (from URL)' : ' (random)'} — replay: ?seed=${base}`,
  );
}
