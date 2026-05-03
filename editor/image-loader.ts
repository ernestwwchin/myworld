import { TILE_BASE } from './data';

const SHEET_PATH = '/assets/vendor/0x72_dungeon/0x72_DungeonTilesetII_v1.7/0x72_DungeonTilesetII_v1.7.png';
const cache = new Map<string, HTMLImageElement>();
let sheetImg: HTMLImageElement | null = null;
let sheetReady: Promise<HTMLImageElement | null> | null = null;

function ensureSheet(): Promise<HTMLImageElement | null> {
  if (sheetReady) return sheetReady;
  sheetReady = new Promise(res => {
    const img = new Image();
    img.onload = () => { sheetImg = img; res(img); };
    img.onerror = () => res(null);
    img.src = SHEET_PATH;
  });
  return sheetReady;
}

export function loadImg(name: string): Promise<HTMLImageElement | null> {
  if (!name) return Promise.resolve(null);
  const cached = cache.get(name);
  if (cached) return Promise.resolve(cached);

  // Crop reference: _crop:{px},{py} — extract 16×16 from spritesheet
  if (name.startsWith('_crop:')) {
    return ensureSheet().then(sheet => {
      if (!sheet) return null;
      const [px, py] = name.slice(6).split(',').map(Number);
      const cvs = document.createElement('canvas');
      cvs.width = 16;
      cvs.height = 16;
      const ctx = cvs.getContext('2d')!;
      ctx.drawImage(sheet, px, py, 16, 16, 0, 0, 16, 16);
      const img = new Image();
      img.src = cvs.toDataURL();
      cache.set(name, img);
      return img;
    });
  }

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
