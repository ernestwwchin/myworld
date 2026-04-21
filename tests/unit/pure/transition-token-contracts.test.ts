import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot, loadYaml } from '../_shared/io.ts';

const root = repoRoot;

test('Town hub portal remains a single-action enter interaction', () => {
  const src = fs.readFileSync(path.join(root, 'public', 'data', '01_goblin_invasion', 'stages', 'town_hub', 'stage.yaml'), 'utf8');

  assert.ok(src.includes('Enter Goblin Warren'), 'Town hub should expose the Goblin Warren entry action');
  assert.ok(!src.includes('Inspect Portal'), 'Town portal should be single-action so a click enters the dungeon directly');
});

test('ModLoader supports nextStage token resolution for auto/boss/town', () => {
  const src = fs.readFileSync(path.join(root, 'src', 'modloader.ts'), 'utf8');

  assert.ok(src.includes('resolveNextStage('), 'ModLoader must expose resolveNextStage(nextStageToken, scene)');
  assert.ok(src.includes('startRun('), 'ModLoader must expose startRun(worldId, scene, opts)');
  assert.ok(src.includes("token === 'auto'"), 'resolveNextStage must handle auto token');
  assert.ok(src.includes("token === 'boss'"), 'resolveNextStage must handle boss token');
  assert.ok(src.includes("token === 'town'"), 'resolveNextStage must handle town token');
  assert.ok(src.includes('depthBands'), 'auto transition resolver should check depthBands rules');
  assert.ok(src.includes('resolveRunOutcome('), 'ModLoader should expose resolveRunOutcome(scene, outcome)');
  assert.ok(src.includes('syncPlayerStateFromScene('), 'ModLoader should persist player state before transition/restart');
  assert.ok(src.includes('persistGameState('), 'ModLoader should expose persistGameState(scene) for browser save persistence');
  assert.ok(src.includes('resetPersistentGame('), 'ModLoader should expose resetPersistentGame(reload)');
  assert.ok(src.includes("floorName === 'TOWN' ? 'bright' : 'dark'"), 'Town maps should default to bright global light');
  assert.ok(src.includes('_buildRuntimeExtractionInteractable('), 'ModLoader should be able to inject runtime extraction interactables on non-town floors');
  assert.ok(src.includes('consumeLastRunSummary('), 'ModLoader should expose run summary consume API for town resolution UI');
  assert.ok(src.includes('shouldResolveBossVictory('), 'ModLoader should expose boss-stage victory detection');
  assert.ok(src.includes("mode === 'victory'"), 'ModLoader run resolution should support victory outcomes');
  assert.ok(src.includes("params.get('ignoreSave') === '1'"), 'Map boot flow should support forcing URL map via ignoreSave=1');
  assert.ok(src.includes('persisted?.activeMap && !shouldForceUrlMap'), 'Boot flow should prefer persisted active map on normal refresh');
  assert.ok(src.includes('_generatedMapSeeds'), 'ModLoader should track generated map seeds for deterministic refreshes');
  assert.ok(src.includes('generatedMapSeeds:'), 'Persisted save snapshot should include generated map seeds');
  assert.ok(src.includes('_normalizePlayerStartTile('), 'ModLoader should normalize invalid saved spawn tiles');
  assert.ok(src.includes('scene.playerTile'), 'ModLoader should persist current player tile when saving scene state');
});

test('stairs transition resolves nextStage token before transitionToStage', () => {
  const src = fs.readFileSync(path.join(root, 'src', 'systems', 'movement-system.ts'), 'utf8');

  assert.ok(src.includes('nextStageToken'), 'movement-system should read nextStage token from map metadata');
  assert.ok(src.includes('resolveNextStage('), 'movement-system should resolve transition token via ModLoader');
  assert.ok(src.includes('transitionToStage(') || src.includes('transitionToStage?.'), 'movement-system should transition using resolved stage id');
});

test('InteractableEntity supports dialog-prefixed actions for mod-configured NPC dialogs', () => {
  const src = fs.readFileSync(path.join(root, 'src', 'entities', 'interactable-entity.ts'), 'utf8');

  assert.ok(src.includes("a.startsWith('dialog:')"), 'InteractableEntity should detect dialog-prefixed actions');
  assert.ok(src.includes('DialogRunner.start('), 'InteractableEntity should open dialogs via DialogRunner.start');
  assert.ok(src.includes("resolveRunOutcome(scene, 'extract')") || src.includes("resolveRunOutcome("), 'Interactable travel-to-town should resolve run extraction');
});

test('Explore mode supports auto-move then interact for distant entity taps', () => {
  const exploreSrc = fs.readFileSync(path.join(root, 'src', 'modes', 'mode-explore.ts'), 'utf8');
  const exploreTbPath = path.join(root, 'src', 'modes', 'mode-explore-tb.ts');
  const hasExploreTb = fs.existsSync(exploreTbPath);
  const exploreTbSrc = hasExploreTb ? fs.readFileSync(exploreTbPath, 'utf8') : '';
  const entitySrc = fs.readFileSync(path.join(root, 'src', 'systems', 'entity-system.ts'), 'utf8');

  assert.ok(exploreSrc.includes('autoMove: true'), 'Explore tap interaction should request autoMove for entities');
  if (hasExploreTb) {
    assert.ok(exploreTbSrc.includes('autoMove: true'), 'Explore TB tap interaction should request autoMove for entities');
    assert.ok(exploreTbSrc.includes('onAutoMoveComplete'), 'Explore TB should end turn after deferred interaction completes');
  }
  const supportsLegacyAutoApproach = entitySrc.includes('_findInteractionApproachTile(') && entitySrc.includes("return 'moving'");
  const supportsV2MoveCloserPrompt = entitySrc.includes('Move closer to interact with') && entitySrc.includes("return 'blocked'");
  assert.ok(
    supportsLegacyAutoApproach || supportsV2MoveCloserPrompt,
    'Entity interaction should either auto-approach (legacy) or block with move-closer prompt (v2)'
  );
});

test('Explore enemy clicks auto-engage and browser context menu is suppressed on game area', () => {
  const gameSrc = fs.readFileSync(path.join(root, 'src', 'game.ts'), 'utf8');
  const inputSrc = fs.readFileSync(path.join(root, 'src', 'systems', 'input-system.ts'), 'utf8');

  assert.ok(gameSrc.includes('tryEngageEnemyFromExplore('), 'Enemy taps in explore mode should auto-engage');
  assert.ok(inputSrc.includes("addEventListener('contextmenu'"), 'Input system should handle browser contextmenu events');
  assert.ok(inputSrc.includes("target.closest('#gc')"), 'Context menu suppression should apply to game canvas area');
  assert.ok(inputSrc.includes('showCombatEnemyPopup(enemy)') || inputSrc.includes('showCombatEnemyPopup('), 'Right-clicking enemy tiles should open combat enemy popup');
});
