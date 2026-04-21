import { test } from 'vitest';
import assert from 'node:assert/strict';
import { loadYaml, loadCoreTestMeta } from '../_shared/io.ts';

test('combat reset fixture is deterministic and movement lane is open', () => {
  const stage = loadYaml('data/00_core_test/stages/ts_combat_reset/stage.yaml');
  assert.equal(stage.floor, 'TCR');
  assert.deepEqual(stage.playerStart, { x: 1, y: 3 });
  assert.equal(stage.encounters.length, 1);
  assert.deepEqual(stage.encounters[0], { creature: 'skeleton', x: 3, y: 2, facing: 180, group: null });
  assert.equal(stage.grid[3][1], '.');
  assert.equal(stage.grid[3][2], '.');
  assert.equal(stage.grid[3][5], '.');
});

test('floor transition fixtures are registered and correctly linked', () => {
  const meta = loadCoreTestMeta();
  assert.ok(meta.stages.includes('ts_floor_transition_a'));
  assert.ok(meta.stages.includes('ts_floor_transition_b'));

  const stageA = loadYaml('data/00_core_test/stages/ts_floor_transition_a/stage.yaml');
  const stageB = loadYaml('data/00_core_test/stages/ts_floor_transition_b/stage.yaml');

  assert.equal(stageA.nextStage, 'ts_floor_transition_b');
  assert.equal(stageB.nextStage, null);
  assert.ok(stageA.grid.some((row) => row.includes('S')));
  assert.ok(stageB.grid.some((row) => row.includes('S')));
});
