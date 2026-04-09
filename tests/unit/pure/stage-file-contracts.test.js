const test = require('node:test');
const assert = require('node:assert/strict');
const { repoPath, loadYaml, exists, loadCoreTestMeta } = require('../_shared/io');

test('core test stages must include stage.yaml and events.yaml', () => {
  const meta = loadCoreTestMeta();
  for (const stageId of meta.stages) {
    const stageBase = repoPath('data', '00_core_test', 'stages', stageId);
    assert.ok(exists(`data/00_core_test/stages/${stageId}/stage.yaml`), `${stageId} missing stage.yaml`);
    assert.ok(exists(`data/00_core_test/stages/${stageId}/events.yaml`), `${stageId} missing events.yaml`);
    assert.ok(stageBase.endsWith(stageId), `bad stage path derivation for ${stageId}`);
  }
});

test('nextStage references must resolve to declared stages', () => {
  const meta = loadCoreTestMeta();
  const declared = new Set(meta.stages);
  for (const stageId of meta.stages) {
    const stage = loadYaml(`data/00_core_test/stages/${stageId}/stage.yaml`);
    if (!stage.nextStage) continue;
    assert.ok(declared.has(stage.nextStage), `${stageId} nextStage '${stage.nextStage}' not in meta stages`);
    assert.ok(
      exists(`data/00_core_test/stages/${stage.nextStage}/stage.yaml`),
      `${stageId} nextStage '${stage.nextStage}' missing stage.yaml`
    );
  }
});
