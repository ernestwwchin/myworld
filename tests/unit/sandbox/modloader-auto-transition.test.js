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

test('nextStage:auto descriptor stageOffset advances relative to current stage', () => {
  const mod = loadModLoader();
  mod._modData = baseWorldConfig();
  mod._modData.worlds.worlds.w1.depthBands = [
    { from: 2, to: 2, stages: [{ stageOffset: 1 }] },
  ];

  mod._activeMap = 'gw_cave_b1f';
  mod._runState = {
    worldId: 'w1',
    runId: 'run_offset',
    seed: 5,
    history: ['town_hub', 'gw_cave_b1f'],
  };

  assert.equal(mod.resolveNextStage('auto'), 'gw_b2f');
});

test('nextStage:auto descriptor with out-of-range stageIndex falls back to fallbackNextStage', () => {
  const mod = loadModLoader();
  mod._modData = baseWorldConfig();
  mod._modData.worlds.worlds.w1.depthBands = [
    { from: 2, to: 2, stages: [{ stageIndex: 99 }] },
  ];

  mod._activeMap = 'gw_cave_b1f';
  mod._runState = {
    worldId: 'w1',
    runId: 'run_oob',
    seed: 7,
    history: ['town_hub', 'gw_cave_b1f'],
  };

  assert.equal(mod.resolveNextStage('auto'), 'gw_b2f');
});

test('nextStage:auto descriptor with NaN stageIndex/stageOffset is ignored, falls back to fallback', () => {
  const mod = loadModLoader();
  mod._modData = baseWorldConfig();
  mod._modData.worlds.worlds.w1.depthBands = [
    { from: 2, to: 2, stages: [{ stageIndex: 'not-a-number' }, { stageOffset: 'nope' }] },
  ];

  mod._activeMap = 'gw_cave_b1f';
  mod._runState = {
    worldId: 'w1',
    runId: 'run_nan',
    seed: 11,
    history: ['town_hub', 'gw_cave_b1f'],
  };

  assert.equal(mod.resolveNextStage('auto'), 'gw_b2f');
});

test('nextStage:auto descriptor stageId wins over stageIndex/stageOffset/token', () => {
  const mod = loadModLoader();
  mod._modData = baseWorldConfig();
  mod._modData.worlds.worlds.w1.depthBands = [
    {
      from: 2,
      to: 2,
      stages: [{ stageId: 'gw_b3f', stageIndex: 0, stageOffset: 99, token: 'boss' }],
    },
  ];

  mod._activeMap = 'gw_cave_b1f';
  mod._runState = {
    worldId: 'w1',
    runId: 'run_priority',
    seed: 13,
    history: ['town_hub', 'gw_cave_b1f'],
  };

  assert.equal(mod.resolveNextStage('auto'), 'gw_b3f');
});

test('nextStage:auto excludes the active map from descriptor candidates', () => {
  const mod = loadModLoader();
  mod._modData = baseWorldConfig();
  mod._modData.worlds.worlds.w1.depthBands = [
    {
      from: 2,
      to: 2,
      stages: [{ stage: 'gw_cave_b1f' }, { stage: 'gw_b3f' }],
    },
  ];

  mod._activeMap = 'gw_cave_b1f';
  mod._runState = {
    worldId: 'w1',
    runId: 'run_self_excl',
    seed: 17,
    history: ['town_hub', 'gw_cave_b1f'],
  };

  assert.equal(mod.resolveNextStage('auto'), 'gw_b3f');
});

test('nextStage:auto with no depth bands falls through to stage sequence next entry', () => {
  const mod = loadModLoader();
  mod._modData = baseWorldConfig();

  mod._activeMap = 'gw_b2f';
  mod._runState = {
    worldId: 'w1',
    runId: 'run_seq',
    seed: 23,
    history: ['town_hub', 'gw_cave_b1f', 'gw_b2f'],
  };

  assert.equal(mod.resolveNextStage('auto'), 'gw_b3f');
});

test('nextStage:auto with empty descriptor object returns null candidate, falls back', () => {
  const mod = loadModLoader();
  mod._modData = baseWorldConfig();
  mod._modData.worlds.worlds.w1.depthBands = [
    { from: 2, to: 2, stages: [{}] },
  ];

  mod._activeMap = 'gw_cave_b1f';
  mod._runState = {
    worldId: 'w1',
    runId: 'run_empty_desc',
    seed: 29,
    history: ['town_hub', 'gw_cave_b1f'],
  };

  // No resolvable candidate from band → falls through to stageSequence (next after gw_cave_b1f).
  assert.equal(mod.resolveNextStage('auto'), 'gw_b2f');
});

test('nextStage:auto descriptor weight=0 is clamped to 1 and still yields a stage', () => {
  const mod = loadModLoader();
  mod._modData = baseWorldConfig();
  mod._modData.worlds.worlds.w1.depthBands = [
    { from: 2, to: 2, stages: [{ stage: 'gw_b3f', weight: 0 }] },
  ];

  mod._activeMap = 'gw_cave_b1f';
  mod._runState = {
    worldId: 'w1',
    runId: 'run_zero_weight',
    seed: 31,
    history: ['town_hub', 'gw_cave_b1f'],
  };

  assert.equal(mod.resolveNextStage('auto'), 'gw_b3f');
});

test('nextStage:boss returns configured boss stage; nextStage:town returns hub', () => {
  const mod = loadModLoader();
  mod._modData = baseWorldConfig();
  mod._activeMap = 'gw_b4f';
  mod._runState = {
    worldId: 'w1',
    runId: 'run_tokens_top',
    seed: 41,
    history: ['town_hub', 'gw_cave_b1f', 'gw_b2f', 'gw_b3f', 'gw_b4f'],
  };

  assert.equal(mod.resolveNextStage('boss'), 'gw_b5f');
  assert.equal(mod.resolveNextStage('town'), 'town_hub');
});

test('resolveNextStage returns the literal id for a non-token string', () => {
  const mod = loadModLoader();
  mod._modData = baseWorldConfig();
  mod._activeMap = 'gw_cave_b1f';
  mod._runState = {
    worldId: 'w1',
    runId: 'run_literal',
    seed: 43,
    history: ['town_hub', 'gw_cave_b1f'],
  };

  assert.equal(mod.resolveNextStage('gw_b3f'), 'gw_b3f');
});

test('resolveNextStage returns null for empty/whitespace tokens', () => {
  const mod = loadModLoader();
  mod._modData = baseWorldConfig();
  assert.equal(mod.resolveNextStage(null), null);
  assert.equal(mod.resolveNextStage(''), null);
  assert.equal(mod.resolveNextStage('   '), null);
});

test('nextStage:auto returns null when no world, no bands, no sequence, no fallback', () => {
  const mod = loadModLoader();
  mod._modData = { worlds: { worlds: { w1: {} } } };
  mod._activeMap = 'unknown_stage';
  mod._runState = {
    worldId: 'w1',
    runId: 'run_no_rules',
    seed: 47,
    history: ['unknown_stage'],
  };

  assert.equal(mod.resolveNextStage('auto'), null);
});
