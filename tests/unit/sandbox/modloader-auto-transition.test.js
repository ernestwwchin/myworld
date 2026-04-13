const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readText } = require('../_shared/io');

function loadModLoader() {
  const src = readText('js/modloader.js');
  const sandbox = {
    console,
    Math,
    JSON,
    Date,
    PLAYER_STATS: {
      inventory: [],
      gold: 0,
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${src}\nthis.__ModLoader = ModLoader;`, sandbox);
  return sandbox.__ModLoader;
}

function baseWorldConfig() {
  return {
    worlds: {
      townStage: 'town_hub',
      worlds: {
        w1: {
          bossStage: 'gw_b5f',
          fallbackNextStage: 'gw_b2f',
          stageSequence: ['gw_cave_b1f', 'gw_b2f', 'gw_b3f', 'gw_b4f', 'gw_b5f'],
        },
      },
    },
  };
}

test('nextStage:auto depth-band selection is deterministic for the same run seed', () => {
  const mod = loadModLoader();
  mod._modData = baseWorldConfig();
  mod._modData.worlds.worlds.w1.depthBands = [
    { from: 2, to: 2, stages: ['gw_b2f', 'gw_b3f', 'gw_b4f'] },
  ];

  mod._activeMap = 'gw_cave_b1f';
  mod._runState = {
    worldId: 'w1',
    runId: 'run_fixed',
    seed: 424242,
    history: ['town_hub', 'gw_cave_b1f'],
    plannedStages: ['gw_cave_b1f', 'gw_b2f', 'gw_b3f', 'gw_b4f', 'gw_b5f'],
  };

  const first = mod.resolveNextStage('auto');
  const second = mod.resolveNextStage('auto');
  const third = mod.resolveNextStage('auto');

  assert.equal(first, second);
  assert.equal(second, third);
  assert.ok(['gw_b2f', 'gw_b3f', 'gw_b4f'].includes(first));
});

test('nextStage:auto resolves descriptor objects in depth bands', () => {
  const mod = loadModLoader();
  mod._modData = baseWorldConfig();
  mod._modData.worlds.worlds.w1.depthBands = [
    {
      from: 2,
      to: 2,
      stages: [
        { stage: 'gw_b2f' },
        { stageIndex: 2, weight: 2 },
      ],
    },
  ];

  mod._activeMap = 'gw_cave_b1f';
  mod._runState = {
    worldId: 'w1',
    runId: 'run_descriptor',
    seed: 777,
    history: ['town_hub', 'gw_cave_b1f'],
  };

  const next = mod.resolveNextStage('auto');
  assert.ok(['gw_b2f', 'gw_b3f'].includes(next));
});

test('nextStage:auto depth-band token descriptors resolve boss and town targets', () => {
  const mod = loadModLoader();
  mod._modData = baseWorldConfig();
  mod._modData.worlds.worlds.w1.depthBands = [
    { from: 2, to: 2, stages: [{ token: 'boss' }] },
    { from: 3, to: 3, stages: [{ token: 'town' }] },
  ];

  mod._activeMap = 'gw_cave_b1f';
  mod._runState = {
    worldId: 'w1',
    runId: 'run_tokens',
    seed: 99,
    history: ['town_hub', 'gw_cave_b1f'],
  };

  assert.equal(mod.resolveNextStage('auto'), 'gw_b5f');

  mod._runState.history.push('gw_b5f');
  mod._activeMap = 'gw_b5f';
  assert.equal(mod.resolveNextStage('auto'), 'town_hub');
});
