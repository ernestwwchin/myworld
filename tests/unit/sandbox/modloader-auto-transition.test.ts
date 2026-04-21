import { test, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { ModLoader } from '../../../src/modloader.ts';
import { PLAYER_STATS } from '../../../src/config.ts';

beforeEach(() => {
  PLAYER_STATS.inventory = [];
  PLAYER_STATS.gold = 0;
  ModLoader._modData = null;
  ModLoader._runState = null;
  ModLoader._activeMap = null;
});

function baseWorldConfig() {
  return {
    worlds: {
      townStage: 'town_hub',
      worlds: {
        w1: {
          bossStage: 'gw_b5f',
          fallbackNextStage: 'gw_b2f',
          stageSequence: ['gw_b1f', 'gw_b2f', 'gw_b3f', 'gw_b4f', 'gw_b5f'],
        },
      },
    },
  };
}

test('nextStage:auto depth-band selection is deterministic for the same run seed', () => {
  ModLoader._modData = baseWorldConfig();
  ModLoader._modData.worlds.worlds.w1.depthBands = [
    { from: 2, to: 2, stages: ['gw_b2f', 'gw_b3f', 'gw_b4f'] },
  ];

  ModLoader._activeMap = 'gw_b1f';
  ModLoader._runState = {
    worldId: 'w1',
    runId: 'run_fixed',
    seed: 424242,
    history: ['town_hub', 'gw_b1f'],
    plannedStages: ['gw_b1f', 'gw_b2f', 'gw_b3f', 'gw_b4f', 'gw_b5f'],
  };

  const first = ModLoader.resolveNextStage('auto', null);
  const second = ModLoader.resolveNextStage('auto', null);
  const third = ModLoader.resolveNextStage('auto', null);

  assert.equal(first, second);
  assert.equal(second, third);
  assert.ok(['gw_b2f', 'gw_b3f', 'gw_b4f'].includes(first));
});

test('nextStage:auto resolves descriptor objects in depth bands', () => {
  ModLoader._modData = baseWorldConfig();
  ModLoader._modData.worlds.worlds.w1.depthBands = [
    {
      from: 2,
      to: 2,
      stages: [
        { stage: 'gw_b2f' },
        { stageIndex: 2, weight: 2 },
      ],
    },
  ];

  ModLoader._activeMap = 'gw_b1f';
  ModLoader._runState = {
    worldId: 'w1',
    runId: 'run_descriptor',
    seed: 777,
    history: ['town_hub', 'gw_b1f'],
  };

  const next = ModLoader.resolveNextStage('auto', null);
  assert.ok(['gw_b2f', 'gw_b3f'].includes(next));
});

test('nextStage:auto depth-band token descriptors resolve boss and town targets', () => {
  ModLoader._modData = baseWorldConfig();
  ModLoader._modData.worlds.worlds.w1.depthBands = [
    { from: 2, to: 2, stages: [{ token: 'boss' }] },
    { from: 3, to: 3, stages: [{ token: 'town' }] },
  ];

  ModLoader._activeMap = 'gw_b1f';
  ModLoader._runState = {
    worldId: 'w1',
    runId: 'run_tokens',
    seed: 99,
    history: ['town_hub', 'gw_b1f'],
  };

  assert.equal(ModLoader.resolveNextStage('auto', null), 'gw_b5f');

  ModLoader._runState.history.push('gw_b5f');
  ModLoader._activeMap = 'gw_b5f';
  assert.equal(ModLoader.resolveNextStage('auto', null), 'town_hub');
});

test('nextStage:auto descriptor stageOffset advances relative to current stage', () => {
  ModLoader._modData = baseWorldConfig();
  ModLoader._modData.worlds.worlds.w1.depthBands = [
    { from: 2, to: 2, stages: [{ stageOffset: 1 }] },
  ];

  ModLoader._activeMap = 'gw_b1f';
  ModLoader._runState = {
    worldId: 'w1',
    runId: 'run_offset',
    seed: 5,
    history: ['town_hub', 'gw_b1f'],
  };

  assert.equal(ModLoader.resolveNextStage('auto', null), 'gw_b2f');
});

test('nextStage:auto descriptor with out-of-range stageIndex falls back to fallbackNextStage', () => {
  ModLoader._modData = baseWorldConfig();
  ModLoader._modData.worlds.worlds.w1.depthBands = [
    { from: 2, to: 2, stages: [{ stageIndex: 99 }] },
  ];

  ModLoader._activeMap = 'gw_b1f';
  ModLoader._runState = {
    worldId: 'w1',
    runId: 'run_oob',
    seed: 7,
    history: ['town_hub', 'gw_b1f'],
  };

  assert.equal(ModLoader.resolveNextStage('auto', null), 'gw_b2f');
});

test('nextStage:auto descriptor with NaN stageIndex/stageOffset is ignored, falls back to fallback', () => {
  ModLoader._modData = baseWorldConfig();
  ModLoader._modData.worlds.worlds.w1.depthBands = [
    { from: 2, to: 2, stages: [{ stageIndex: 'not-a-number' }, { stageOffset: 'nope' }] },
  ];

  ModLoader._activeMap = 'gw_b1f';
  ModLoader._runState = {
    worldId: 'w1',
    runId: 'run_nan',
    seed: 11,
    history: ['town_hub', 'gw_b1f'],
  };

  assert.equal(ModLoader.resolveNextStage('auto', null), 'gw_b2f');
});

test('nextStage:auto descriptor stageId wins over stageIndex/stageOffset/token', () => {
  ModLoader._modData = baseWorldConfig();
  ModLoader._modData.worlds.worlds.w1.depthBands = [
    {
      from: 2,
      to: 2,
      stages: [{ stageId: 'gw_b3f', stageIndex: 0, stageOffset: 99, token: 'boss' }],
    },
  ];

  ModLoader._activeMap = 'gw_b1f';
  ModLoader._runState = {
    worldId: 'w1',
    runId: 'run_priority',
    seed: 13,
    history: ['town_hub', 'gw_b1f'],
  };

  assert.equal(ModLoader.resolveNextStage('auto', null), 'gw_b3f');
});

test('nextStage:auto excludes the active map from descriptor candidates', () => {
  ModLoader._modData = baseWorldConfig();
  ModLoader._modData.worlds.worlds.w1.depthBands = [
    {
      from: 2,
      to: 2,
      stages: [{ stage: 'gw_b1f' }, { stage: 'gw_b3f' }],
    },
  ];

  ModLoader._activeMap = 'gw_b1f';
  ModLoader._runState = {
    worldId: 'w1',
    runId: 'run_self_excl',
    seed: 17,
    history: ['town_hub', 'gw_b1f'],
  };

  assert.equal(ModLoader.resolveNextStage('auto', null), 'gw_b3f');
});

test('nextStage:auto with no depth bands falls through to stage sequence next entry', () => {
  ModLoader._modData = baseWorldConfig();

  ModLoader._activeMap = 'gw_b2f';
  ModLoader._runState = {
    worldId: 'w1',
    runId: 'run_seq',
    seed: 23,
    history: ['town_hub', 'gw_b1f', 'gw_b2f'],
  };

  assert.equal(ModLoader.resolveNextStage('auto', null), 'gw_b3f');
});

test('nextStage:auto with empty descriptor object returns null candidate, falls back', () => {
  ModLoader._modData = baseWorldConfig();
  ModLoader._modData.worlds.worlds.w1.depthBands = [
    { from: 2, to: 2, stages: [{}] },
  ];

  ModLoader._activeMap = 'gw_b1f';
  ModLoader._runState = {
    worldId: 'w1',
    runId: 'run_empty_desc',
    seed: 29,
    history: ['town_hub', 'gw_b1f'],
  };

  // No resolvable candidate from band → falls through to stageSequence (next after gw_b1f).
  assert.equal(ModLoader.resolveNextStage('auto', null), 'gw_b2f');
});

test('nextStage:auto descriptor weight=0 is clamped to 1 and still yields a stage', () => {
  ModLoader._modData = baseWorldConfig();
  ModLoader._modData.worlds.worlds.w1.depthBands = [
    { from: 2, to: 2, stages: [{ stage: 'gw_b3f', weight: 0 }] },
  ];

  ModLoader._activeMap = 'gw_b1f';
  ModLoader._runState = {
    worldId: 'w1',
    runId: 'run_zero_weight',
    seed: 31,
    history: ['town_hub', 'gw_b1f'],
  };

  assert.equal(ModLoader.resolveNextStage('auto', null), 'gw_b3f');
});

test('nextStage:boss returns configured boss stage; nextStage:town returns hub', () => {
  ModLoader._modData = baseWorldConfig();
  ModLoader._activeMap = 'gw_b4f';
  ModLoader._runState = {
    worldId: 'w1',
    runId: 'run_tokens_top',
    seed: 41,
    history: ['town_hub', 'gw_b1f', 'gw_b2f', 'gw_b3f', 'gw_b4f'],
  };

  assert.equal(ModLoader.resolveNextStage('boss', null), 'gw_b5f');
  assert.equal(ModLoader.resolveNextStage('town', null), 'town_hub');
});

test('resolveNextStage returns the literal id for a non-token string', () => {
  ModLoader._modData = baseWorldConfig();
  ModLoader._activeMap = 'gw_b1f';
  ModLoader._runState = {
    worldId: 'w1',
    runId: 'run_literal',
    seed: 43,
    history: ['town_hub', 'gw_b1f'],
  };

  assert.equal(ModLoader.resolveNextStage('gw_b3f', null), 'gw_b3f');
});

test('resolveNextStage returns null for empty/whitespace tokens', () => {
  ModLoader._modData = baseWorldConfig();
  assert.equal(ModLoader.resolveNextStage(null, null), null);
  assert.equal(ModLoader.resolveNextStage('', null), null);
  assert.equal(ModLoader.resolveNextStage('   ', null), null);
});

test('nextStage:auto returns null when no world, no bands, no sequence, no fallback', () => {
  ModLoader._modData = { worlds: { worlds: { w1: {} } } };
  ModLoader._activeMap = 'unknown_stage';
  ModLoader._runState = {
    worldId: 'w1',
    runId: 'run_no_rules',
    seed: 47,
    history: ['unknown_stage'],
  };

  assert.equal(ModLoader.resolveNextStage('auto', null), null);
});
