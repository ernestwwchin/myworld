const fs = require('fs');
const path = require('path');
const vm = require('vm');
const yaml = require('js-yaml');

const root = process.cwd();

function loadYaml(relPath) {
  const full = path.join(root, relPath);
  return yaml.load(fs.readFileSync(full, 'utf8'));
}

function loadConfigExports() {
  const configPath = path.join(root, 'js', 'config.js');
  const code = fs.readFileSync(configPath, 'utf8');
  const sandbox = { console, Math };
  vm.createContext(sandbox);
  const wrapped = `${code}\n;globalThis.__testExports = { dnd, WEAPON_DEFS, MODE, TILE };`;
  vm.runInContext(wrapped, sandbox);
  return sandbox.__testExports;
}

function toHostObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadStageInSandbox(stageId) {
  const rules = loadYaml('data/00_core/rules.yaml');
  const stage = loadYaml(`data/00_core_test/stages/${stageId}/stage.yaml`);
  const syms = rules.tileSymbols || { '#': 1, '.': 0, 'D': 3, 'C': 4, 'S': 5, '~': 6, 'G': 7 };
  const grid = stage.grid.map((row) => Array.from(row).map((ch) => (syms[ch] !== undefined ? syms[ch] : 0)));
  const ROWS = grid.length;
  const COLS = grid[0].length;

  const configCode = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  const helpersCode = fs.readFileSync(path.join(root, 'js', 'helpers.js'), 'utf8');
  const sandbox = {
    console, Math,
    window: { _tileBlocksMovement: null, _tileBlocksSight: null },
    Set, Map, Array, Object,
  };
  vm.createContext(sandbox);
  vm.runInContext(configCode, sandbox);
  vm.runInContext(`MAP.length = 0; ${JSON.stringify(grid)}.forEach(r => MAP.push(r));`, sandbox);
  vm.runInContext(`ROWS = ${ROWS}; COLS = ${COLS};`, sandbox);
  vm.runInContext(helpersCode, sandbox);

  return { sandbox, stage, grid, ROWS, COLS };
}

module.exports = {
  fs,
  path,
  root,
  loadYaml,
  loadConfigExports,
  toHostObject,
  loadStageInSandbox,
};
