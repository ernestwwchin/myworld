import { test, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { ModLoader } from '../../../src/modloader.ts';
import { PLAYER_STATS } from '../../../src/config.ts';

beforeEach(() => {
  ModLoader._modData = null;
  ModLoader._runState = null;
  ModLoader._activeMap = null;
});

test('run state scaffold includes run metadata fields', () => {
  PLAYER_STATS.inventory = [{ id: 'potion_heal', qty: 2 }];
  PLAYER_STATS.gold = 17;

  ModLoader._modData = {
    worlds: {
      townStage: 'town_hub',
      worlds: {
        w1: { stageSequence: ['s1', 's2'] },
      },
    },
  };

  ModLoader._runState = { worldId: 'w1' };
  ModLoader._initRunState('town_hub');

  assert.equal(ModLoader._runState.runId, null);
  assert.equal(ModLoader._runState.seed, null);
  assert.deepEqual(JSON.parse(JSON.stringify(ModLoader._runState.acceptedQuests)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(ModLoader._runState.carried)), { items: [{ id: 'potion_heal', qty: 2 }] });
  assert.equal(ModLoader._runState.runGold, 17);
});

test('startRun populates runId/seed/quests and uses resolved target stage', () => {
  PLAYER_STATS.inventory = [{ id: 'potion_heal', qty: 2 }];
  PLAYER_STATS.gold = 17;

  ModLoader._activeMap = 'town_hub';
  ModLoader._modData = {
    worlds: {
      townStage: 'town_hub',
      worlds: {
        w1: {
          entryStage: 'gw_b1f',
          stageSequence: ['gw_b1f', 'gw_b2f'],
        },
      },
    },
  };

  let transitionedTo = null;
  ModLoader.transitionToStage = (stageId) => { transitionedTo = stageId; };
  ModLoader._initRunState('town_hub');
  ModLoader.startRun('w1', null, { seed: 9001, acceptedQuests: ['hunt_cull_1'] });

  assert.equal(transitionedTo, 'gw_b1f');
  assert.equal(ModLoader._runState.worldId, 'w1');
  assert.ok(typeof ModLoader._runState.runId === 'string' && ModLoader._runState.runId.startsWith('run_'));
  assert.equal(ModLoader._runState.seed, 9001);
  assert.deepEqual(JSON.parse(JSON.stringify(ModLoader._runState.acceptedQuests)), ['hunt_cull_1']);
  assert.deepEqual(JSON.parse(JSON.stringify(ModLoader._runState.carried)), { items: [{ id: 'potion_heal', qty: 2 }] });
  assert.equal(ModLoader._runState.runGold, 17);
});
