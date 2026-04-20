import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';

const root = process.cwd();

function loadYaml(relPath) {
  const resolved = relPath.startsWith('data/') ? path.join(root, 'public', relPath) : path.join(root, relPath);
  return yaml.load(fs.readFileSync(resolved, 'utf8'));
}

const EncounterSchema = z.object({
  creature: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  facing: z.number().int().optional(),
  group: z.union([z.string().min(1), z.null()]).optional(),
});

const StageSchema = z.object({
  name: z.string().min(1),
  floor: z.string().min(1),
  globalLight: z.string().min(1),
  grid: z.array(z.string().min(1)).min(3),
  playerStart: z.object({ x: z.number().int().nonnegative(), y: z.number().int().nonnegative() }),
  encounters: z.array(EncounterSchema),
  nextStage: z.union([z.string().min(1), z.null()]).optional(),
});

const EventsSchema = z.object({
  autoplay: z.array(z.object({ do: z.string().min(1) })).min(1),
  events: z.array(z.any()).optional(),
});

export function runSchemaContracts(assert) {
  const meta = loadYaml('data/00_core_test/meta.yaml');
  const declared = new Set(meta.stages || []);

  assert.ok(Array.isArray(meta.stages) && meta.stages.length > 0, '00_core_test meta.stages must be non-empty array');

  for (const stageId of declared) {
    const stageRel = `data/00_core_test/stages/${stageId}/stage.yaml`;
    const eventsRel = `data/00_core_test/stages/${stageId}/events.yaml`;

    const stage = loadYaml(stageRel);
    const events = loadYaml(eventsRel);

    const stageResult = StageSchema.safeParse(stage);
    assert.ok(stageResult.success, `${stageId} stage.yaml schema invalid: ${stageResult.success ? '' : stageResult.error.issues.map(i => i.message).join('; ')}`);

    const eventsResult = EventsSchema.safeParse(events);
    assert.ok(eventsResult.success, `${stageId} events.yaml schema invalid: ${eventsResult.success ? '' : eventsResult.error.issues.map(i => i.message).join('; ')}`);

    if (stage.nextStage) {
      assert.ok(declared.has(stage.nextStage), `${stageId} nextStage '${stage.nextStage}' is not declared in 00_core_test meta`);
    }
  }
}
