import { TILE_BASE } from './data';

const cache = new Map<string, HTMLImageElement>();

export function loadImg(name: string): Promise<HTMLImageElement | null> {
  if (!name) return Promise.resolve(null);
  const cached = cache.get(name);
  if (cached) return Promise.resolve(cached);
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { cache.set(name, img); res(img); };
    img.onerror = () => res(null);
    img.src = TILE_BASE + name + '.png';
  });
}

export function getCachedImg(name: string): HTMLImageElement | undefined {
  return cache.get(name);
}

export async function preloadAll(names: Iterable<string>): Promise<void> {
  await Promise.all([...names].map(loadImg));
}
