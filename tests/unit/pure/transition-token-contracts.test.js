const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = process.cwd();

test('Town hub portal remains a single-action enter interaction', () => {
  const src = fs.readFileSync(path.join(root, 'data', '01_goblin_invasion', 'stages', 'town_hub', 'stage.yaml'), 'utf8');

  assert.ok(src.includes('Enter Goblin Warren'), 'Town hub should expose the Goblin Warren entry action');
  assert.ok(!src.includes('Inspect Portal'), 'Town portal should be single-action so a click enters the dungeon directly');
});

test('ModLoader supports nextStage token resolution for auto/boss/town', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'modloader.js'), 'utf8');

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
});

test('stairs transition resolves nextStage token before transitionToStage', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'systems', 'movement-system.js'), 'utf8');

  assert.ok(src.includes('nextStageToken'), 'movement-system should read nextStage token from map metadata');
  assert.ok(src.includes('ModLoader.resolveNextStage('), 'movement-system should resolve transition token via ModLoader');
  assert.ok(src.includes('ModLoader.transitionToStage(nextStage,this)'), 'movement-system should transition using resolved stage id');
});

test('InteractableEntity supports dialog-prefixed actions for mod-configured NPC dialogs', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'entities', 'interactable-entity.js'), 'utf8');

  assert.ok(src.includes("a.startsWith('dialog:')"), 'InteractableEntity should detect dialog-prefixed actions');
  assert.ok(src.includes('DialogRunner.start('), 'InteractableEntity should open dialogs via DialogRunner.start');
  assert.ok(src.includes("resolveRunOutcome(scene, 'extract')"), 'Interactable travel-to-town should resolve run extraction');
});

test('Explore mode supports auto-move then interact for distant entity taps', () => {
  const exploreSrc = fs.readFileSync(path.join(root, 'js', 'modes', 'mode-explore.js'), 'utf8');
  const exploreTbPath = path.join(root, 'js', 'modes', 'mode-explore-tb.js');
  const hasExploreTb = fs.existsSync(exploreTbPath);
  const exploreTbSrc = hasExploreTb ? fs.readFileSync(exploreTbPath, 'utf8') : '';
  const entitySrc = fs.readFileSync(path.join(root, 'js', 'systems', 'entity-system.js'), 'utf8');

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
  const gameSrc = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');
  const inputSrc = fs.readFileSync(path.join(root, 'js', 'systems', 'input-system.js'), 'utf8');

  assert.ok(gameSrc.includes('tryEngageEnemyFromExplore('), 'Enemy taps in explore mode should auto-engage');
  assert.ok(inputSrc.includes("addEventListener('contextmenu'"), 'Input system should handle browser contextmenu events');
  assert.ok(inputSrc.includes("target.closest('#gc')"), 'Context menu suppression should apply to game canvas area');
  assert.ok(inputSrc.includes('showCombatEnemyPopup(enemy)'), 'Right-clicking enemy tiles should open combat enemy popup');
});
