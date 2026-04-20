import vm from 'node:vm';
import { readText } from './io.js';

export function loadConfigExportsInVm() {
  const configCode = readText('js/config.js');
  const sandbox = { console, Math };
  vm.createContext(sandbox);
  vm.runInContext(`${configCode}\n;globalThis.__exports = { MODE, TILE, dnd, WEAPON_DEFS };`, sandbox);
  return sandbox.__exports;
}

export function toHostObject(value) {
  return JSON.parse(JSON.stringify(value));
}
