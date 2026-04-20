import { test } from 'vitest';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readText } from '../_shared/io.js';

function toHost(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadModLoader() {
  const src = readText('js/modloader.js');
  const sandbox = {
    console,
    Math,
    JSON,
    Date,
    PLAYER_STATS: {
      inventory: [{ id: 'potion_heal', qty: 2 }],
      gold: 17,
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${src}\nthis.__ModLoader = ModLoader;`, sandbox);
  return sandbox.__ModLoader;
}

test('run state scaffold includes run metadata fields', () => {
  const mod = loadModLoader();
  mod._modData = {
    worlds: {
      townStage: 'town_hub',
      worlds: {
        w1: { stageSequence: ['s1', 's2'] },
      },
    },
  };

  mod._runState = { worldId: 'w1' };
  mod._initRunState('town_hub');

  assert.equal(mod._runState.runId, null);
  assert.equal(mod._runState.seed, null);
  assert.deepEqual(toHost(mod._runState.acceptedQuests), []);
  assert.deepEqual(toHost(mod._runState.carried), { items: [{ id: 'potion_heal', qty: 2 }] });
  assert.equal(mod._runState.runGold, 17);
});

test('startRun populates runId/seed/quests and uses resolved target stage', () => {
  const mod = loadModLoader();
  mod._activeMap = 'town_hub';
  mod._modData = {
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
  mod.transitionToStage = (stageId) => { transitionedTo = stageId; };
  mod._initRunState('town_hub');
  mod.startRun('w1', null, { seed: 9001, acceptedQuests: ['hunt_cull_1'] });

  assert.equal(transitionedTo, 'gw_b1f');
  assert.equal(mod._runState.worldId, 'w1');
  assert.ok(typeof mod._runState.runId === 'string' && mod._runState.runId.startsWith('run_'));
  assert.equal(mod._runState.seed, 9001);
  assert.deepEqual(toHost(mod._runState.acceptedQuests), ['hunt_cull_1']);
  assert.deepEqual(toHost(mod._runState.carried), { items: [{ id: 'potion_heal', qty: 2 }] });
  assert.equal(mod._runState.runGold, 17);
});
