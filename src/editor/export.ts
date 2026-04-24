import { LOGIC, OBJECTS } from './data';
import * as state from './state';
import type { StampExport } from './types';

export function exportStampJSON(): void {
  const name = (document.getElementById('edName') as HTMLInputElement | null)?.value || state.stampName || 'Untitled';

  // ASCII grid
  let ascii = '';
  for (let r = 0; r < state.gridH; r++) {
    let row = '';
    for (let c = 0; c < state.gridW; c++) {
      const cell = state.cells[r][c];
      if (cell.object) row += OBJECTS[cell.object].ascii;
      else row += LOGIC[cell.logic].label;
    }
    ascii += (r > 0 ? '\n' : '') + row;
  }

  // BSP numeric grid
  const bspGrid: number[][] = [];
  for (let r = 0; r < state.gridH; r++) {
    bspGrid[r] = [];
    for (let c = 0; c < state.gridW; c++) {
      const cell = state.cells[r][c];
      let val = LOGIC[cell.logic].bsp;
      if (cell.object && OBJECTS[cell.object].bspOverride != null) {
        val = OBJECTS[cell.object].bspOverride!;
      }
      bspGrid[r][c] = val;
    }
  }

  // Connectable edges
  const connectable = { north: [] as number[], south: [] as number[], west: [] as number[], east: [] as number[] };
  for (let c = 2; c < state.gridW - 2; c++) {
    if (!LOGIC[state.cells[2][c].logic].blocked) connectable.north.push(c);
    if (!LOGIC[state.cells[state.gridH - 3][c].logic].blocked) connectable.south.push(c);
  }
  for (let r = 2; r < state.gridH - 2; r++) {
    if (!LOGIC[state.cells[r][2].logic].blocked) connectable.west.push(r);
    if (!LOGIC[state.cells[r][state.gridW - 3].logic].blocked) connectable.east.push(r);
  }

  // Collect objects
  const spawns: { x: number; y: number }[] = [];
  let stairsPos: { x: number; y: number } | null = null;
  const objects: { type: string; x: number; y: number }[] = [];
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      const obj = state.cells[r][c].object;
      if (!obj) continue;
      if (obj === 'enemy_spawn') spawns.push({ x: c, y: r });
      else if (obj === 'stairs') stairsPos = { x: c, y: r };
      else objects.push({ type: obj, x: c, y: r });
    }
  }

  // Visual layers
  const visualLayers: Record<string, Record<string, string>> = {};
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      const v = state.cells[r][c].visuals;
      const entry: Record<string, string> = {};
      if (v.ground) entry.ground = v.ground;
      if (v.structure) entry.structure = v.structure;
      if (v.decoration) entry.decoration = v.decoration;
      if (Object.keys(entry).length > 0) {
        visualLayers[`${r},${c}`] = entry;
      }
    }
  }

  const exportData: StampExport = {
    name,
    w: state.gridW,
    h: state.gridH,
    grid: ascii,
    bspGrid,
    connectable,
    spawns: spawns.length > 0 ? spawns : undefined,
    stairs: stairsPos ?? undefined,
    objects: objects.length > 0 ? objects : undefined,
    visualLayers: Object.keys(visualLayers).length > 0 ? visualLayers : undefined,
  };

  const json = JSON.stringify(exportData, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    const el = document.getElementById('edStatus');
    if (el) { el.textContent = '✓ Copied to clipboard!'; setTimeout(() => { el.textContent = ''; }, 3000); }
  }).catch(() => {
    prompt('Stamp JSON:', json);
  });
  console.log('Stamp export:', exportData);
}
