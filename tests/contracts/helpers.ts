import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const root = process.cwd();

function resolvePath(relPath: string): string {
  // data/ was moved to public/data/ during TS migration
  if (relPath.startsWith('data/')) return path.join(root, 'public', relPath);
  return path.join(root, relPath);
}

export function loadYaml(relPath: string): unknown {
  return yaml.load(fs.readFileSync(resolvePath(relPath), 'utf8'));
}

export function toHostObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function loadStageInSandbox(stageId: string) {
  const { MAP, mapState, TILE } = await import('../../src/config.ts');

  const rules = loadYaml('data/00_core/rules.yaml');
  const stage = loadYaml(`data/00_core_test/stages/${stageId}/stage.yaml`);
  const syms = rules.tileSymbols || { '#': 1, '.': 0, 'D': 3, 'C': 4, 'S': 5, '~': 6, 'G': 7 };
  const grid = stage.grid.map((row) => Array.from(row).map((ch) => (syms[ch] !== undefined ? syms[ch] : 0)));
  const ROWS = grid.length;
  const COLS = grid[0].length;

  // Mutate the shared MAP/mapState so wallBlk/bfs/hasLOS use this stage's grid
  MAP.length = 0;
  grid.forEach(r => MAP.push(r));
  mapState.rows = ROWS;
  mapState.cols = COLS;

  return { stage, grid, ROWS, COLS, TILE };
}

export { fs, path, root };
