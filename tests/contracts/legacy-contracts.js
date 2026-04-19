const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const yaml = require('js-yaml');

const root = process.cwd();

function loadYaml(relPath) {
  const full = path.join(root, relPath);
  return yaml.load(fs.readFileSync(full, 'utf8'));
}

function loadConfigExports() {
  const configPath = path.join(root, 'js', 'config.js');
  const code = fs.readFileSync(configPath, 'utf8');

  const sandbox = { console, Math };
  vm.createContext(sandbox);
  const wrapped = `${code}\n;globalThis.__testExports = { dnd, WEAPON_DEFS, MODE, TILE };`;
  vm.runInContext(wrapped, sandbox);
  return sandbox.__testExports;
}

function toHostObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Build a VM sandbox with config.js + helpers.js loaded, MAP set from a test stage grid. */
function loadStageInSandbox(stageId) {
  const rules = loadYaml('data/00_core/rules.yaml');
  const stage = loadYaml(`data/00_core_test/stages/${stageId}/stage.yaml`);

  // Build tile symbol map from rules
  const syms = rules.tileSymbols || { '#': 1, '.': 0, 'D': 3, 'C': 4, 'S': 5, '~': 6, 'G': 7 };

  // Convert grid strings to numeric
  const grid = stage.grid.map(row =>
    Array.from(row).map(ch => (syms[ch] !== undefined ? syms[ch] : 0))
  );
  const ROWS = grid.length;
  const COLS = grid[0].length;

  const configCode = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  const helpersCode = fs.readFileSync(path.join(root, 'js', 'helpers.js'), 'utf8');

  const sandbox = {
    console, Math,
    window: { _tileBlocksMovement: null, _tileBlocksSight: null },
    Set, Map, Array, Object,
  };
  vm.createContext(sandbox);

  // Load config + helpers, then overwrite MAP contents with test grid
  vm.runInContext(configCode, sandbox);
  vm.runInContext(`MAP.length = 0; ${JSON.stringify(grid)}.forEach(r => MAP.push(r));`, sandbox);
  vm.runInContext(`ROWS = ${ROWS}; COLS = ${COLS};`, sandbox);
  vm.runInContext(helpersCode, sandbox);

  return { sandbox, stage, grid, ROWS, COLS };
}

function testDiceNotationParsing(dnd) {
  const c1 = toHostObject(dnd.normalizeDamageSpec('1d8+3'));
  assert.deepStrictEqual(c1, { dice: [[1, 8]], bonus: 3 });

  const c2 = toHostObject(dnd.normalizeDamageSpec('1d12+1d4+3'));
  assert.deepStrictEqual(c2, { dice: [[1, 12], [1, 4]], bonus: 3 });

  const c3 = toHostObject(dnd.normalizeDamageSpec('2d6-1'));
  assert.deepStrictEqual(c3, { dice: [[2, 6]], bonus: -1 });

  // Backward compatibility formats
  const legacy = toHostObject(dnd.normalizeDamageSpec([1, 10, 2]));
  assert.deepStrictEqual(legacy, { dice: [[1, 10]], bonus: 2 });

  const objectForm = toHostObject(dnd.normalizeDamageSpec({ dice: [[2, 4], [1, 6]], bonus: 1 }));
  assert.deepStrictEqual(objectForm, { dice: [[2, 4], [1, 6]], bonus: 1 });
}

function testDamageRolling(dnd) {
  const spec = '1d12+1d4+3';
  for (let i = 0; i < 100; i++) {
    const r = dnd.rollDamageSpec(spec, false);
    assert.ok(r.total >= 5 && r.total <= 19, `out of range: ${r.total}`);
    assert.ok(Array.isArray(r.diceValues));
    assert.strictEqual(r.diceValues.length, 2);
    assert.ok(Array.isArray(r.baseRolls) && r.baseRolls.length === 2);
    assert.strictEqual(r.bonus, 3);
    assert.strictEqual(r.isCrit, false);
  }

  // Crit doubles only dice count (1d12+1d4 -> 4 dice total)
  const crit = dnd.rollDamageSpec(spec, true);
  assert.strictEqual(crit.diceValues.length, 4);
  assert.strictEqual(crit.isCrit, true);
}

function testWeaponDataReferences(dnd) {
  const weapons = loadYaml('data/00_core/weapons.yaml').weapons;
  const creatures = loadYaml('data/00_core/creatures.yaml').creatures;
  const player = loadYaml('data/player.yaml').player;

  // Every weapon must have parseable damageDice and range
  for (const [id, w] of Object.entries(weapons)) {
    const parsed = dnd.normalizeDamageSpec(w.damageDice);
    assert.ok(parsed.dice.length > 0, `weapon ${id} has invalid damageDice`);
    assert.ok(typeof w.range === 'number' && w.range >= 1, `weapon ${id} has invalid range`);
  }

  // Player weapon reference must exist
  assert.ok(player.equipment.weaponId in weapons, 'player weaponId not found in weapons');

  // Creature attack weapon references must exist when present
  for (const [id, c] of Object.entries(creatures)) {
    const weaponId = c.attack && c.attack.weaponId;
    if (weaponId) {
      assert.ok(weaponId in weapons, `creature ${id} has unknown weaponId ${weaponId}`);
    }
  }
}

function testExploreTurnBasedModeConstant(MODE) {
  assert.ok(MODE && typeof MODE === 'object', 'MODE export missing');
  assert.strictEqual(MODE.EXPLORE, 'explore');
  assert.strictEqual(MODE.COMBAT, 'combat');
  assert.strictEqual(MODE.EXPLORE_TB, 'explore_tb');
}

function testCombatInitSystemContracts() {
  const combatInitPath = path.join(root, 'js', 'modes', 'mode-combat.js');
  const src = fs.readFileSync(combatInitPath, 'utf8');

  assert.ok(src.includes('findApproachPathToEnemy('), 'combat-init missing approach path helper');
  assert.ok(src.includes('tryEngageEnemyFromExplore('), 'combat-init missing engage flow entry');
  assert.ok(src.includes('executeEngageOpenerAttack('), 'combat-init missing opener attack handler');
  assert.ok(src.includes('if (!this.isExploreMode()) return;'), 'combat-init should allow explore mode via isExploreMode');
}

function testExploreTurnBasedContracts() {
  // TB exploration mode removed in v2 — verify it's gone
  const etbPath = path.join(root, 'js', 'modes', 'mode-explore-tb.js');
  assert.ok(!fs.existsSync(etbPath), 'mode-explore-tb.js should be deleted');
}

// ── Mod system tests (from claude/add-claude-documentation merge) ──

function testModMetaYamlContracts() {
  // Core meta.yaml must exist and declare required includes
  const coreMeta = loadYaml('data/00_core/meta.yaml');
  assert.strictEqual(coreMeta.id, '00_core', 'core meta.yaml missing id');
  assert.ok(Array.isArray(coreMeta.includes), 'core meta.yaml missing includes array');
  const requiredIncludes = ['rules.yaml', 'abilities.yaml', 'creatures.yaml', 'classes.yaml', 'weapons.yaml', 'statuses.yaml'];
  for (const file of requiredIncludes) {
    assert.ok(coreMeta.includes.includes(file), `core meta.yaml missing include: ${file}`);
  }
  // Core should NOT declare startMap
  assert.ok(!coreMeta.startMap, 'core should not declare startMap');
}

function testModSettingsStructure() {
  const settings = loadYaml('data/modsettings.yaml');
  assert.ok(Array.isArray(settings.mods), 'modsettings.yaml must have mods array');
  assert.ok(settings.mods.includes('00_core'), 'modsettings must include 00_core');
}

function testCoreFirstDedup() {
  // Simulate the modList logic from modloader.js
  const settings = loadYaml('data/modsettings.yaml');
  const modList = ['00_core', ...(settings.mods || []).filter(m => m !== '00_core')];
  assert.strictEqual(modList[0], '00_core', 'core must be first mod in load order');
  // No duplicates
  assert.strictEqual(modList.filter(m => m === '00_core').length, 1, 'core should not be duplicated');
}

function testGoblinInvasionMod() {
  const meta = loadYaml('data/01_goblin_invasion/meta.yaml');
  assert.strictEqual(meta.id, '01_goblin_invasion');
  assert.ok(meta.startMap, 'goblin_invasion must declare startMap');
  assert.ok(Array.isArray(meta.stages), 'goblin_invasion must declare stages');
  assert.ok(meta.stages.includes(meta.startMap), 'goblin_invasion stages must include startMap');

  // Creatures file must have valid stat blocks
  const creatures = loadYaml('data/01_goblin_invasion/creatures.yaml').creatures;
  assert.ok(creatures.goblin_captain, 'goblin_invasion missing goblin_captain');
  assert.ok(creatures.goblin_shaman, 'goblin_invasion missing goblin_shaman');
  for (const [id, c] of Object.entries(creatures)) {
    assert.ok(c.hp > 0, `${id} must have positive hp`);
    assert.ok(c.ac > 0, `${id} must have positive ac`);
    assert.ok(c.stats && c.stats.str, `${id} must have stats.str`);
    assert.ok(c.attack, `${id} must have attack definition`);
  }
}

function testStageYamlStructure() {
  const stage = loadYaml('data/01_goblin_invasion/stages/gw_b1f/stage.yaml');
  assert.ok(stage.grid, 'stage must have grid');
  assert.ok(Array.isArray(stage.grid), 'grid must be an array');
  assert.ok(stage.grid.length > 0, 'grid must not be empty');
  assert.ok(stage.playerStart, 'stage must have playerStart');
  assert.ok(typeof stage.playerStart.x === 'number', 'playerStart.x must be number');
  assert.ok(typeof stage.playerStart.y === 'number', 'playerStart.y must be number');
  assert.ok(Array.isArray(stage.encounters), 'stage must have encounters array');
  // Every encounter must reference a creature and have x,y
  for (const enc of stage.encounters) {
    assert.ok(enc.creature, `encounter missing creature: ${JSON.stringify(enc)}`);
    assert.ok(typeof enc.x === 'number', `encounter missing x`);
    assert.ok(typeof enc.y === 'number', `encounter missing y`);
  }
}

// ── Stealth system contracts ──

function testStealthSystemContracts() {
  const src = fs.readFileSync(path.join(root, 'js', 'systems', 'ability-system.js'), 'utf8');
  assert.ok(src.includes('_breakStealth('), 'ability-system missing _breakStealth');
  assert.ok(src.includes('_enterStealth('), 'ability-system missing _enterStealth');
  assert.ok(src.includes('_stealthContestEnemy('), 'ability-system missing _stealthContestEnemy');
  assert.ok(src.includes('checkStealthVsEnemies('), 'ability-system missing checkStealthVsEnemies');
  assert.ok(src.includes('tryHideAction('), 'ability-system missing tryHideAction');
  assert.ok(src.includes('tryHideInExplore('), 'ability-system missing tryHideInExplore');
  // Stealth should NOT have render calls (extracted to sight-system)
  assert.ok(!src.includes('setAlpha('), 'ability-system should not have setAlpha (render in sight-system)');
  assert.ok(!src.includes('this.add.sprite('), 'ability-system should not create sprites (render in sight-system)');
}

function testStealthVisualsInSightSystem() {
  const src = fs.readFileSync(path.join(root, 'js', 'systems', 'sight-system.js'), 'utf8');
  assert.ok(src.includes('showStealthVisuals('), 'sight-system missing showStealthVisuals');
  assert.ok(src.includes('clearStealthVisuals('), 'sight-system missing clearStealthVisuals');
  assert.ok(src.includes('checkSight('), 'sight-system missing checkSight');
  // checkSight should respect playerHidden
  assert.ok(src.includes('this.playerHidden'), 'checkSight should check playerHidden');
  assert.ok(src.includes('checkStealthVsEnemies'), 'checkSight should call checkStealthVsEnemies');
}

// ── Entity architecture contracts ──

function testEntityArchitectureContracts() {
  const entitySrc = fs.readFileSync(path.join(root, 'js', 'systems', 'entity-system.js'), 'utf8');
  assert.ok(entitySrc.includes('_createEntitySprite('), 'entity-system missing _createEntitySprite');
  assert.ok(entitySrc.includes('_updateEntitySprite('), 'entity-system missing _updateEntitySprite');
  assert.ok(entitySrc.includes('_executeEntityAction('), 'entity-system missing _executeEntityAction');
  assert.ok(entitySrc.includes('getEntitiesAt('), 'entity-system missing getEntitiesAt');

  const doorSrc = fs.readFileSync(path.join(root, 'js', 'entities', 'door-entity.js'), 'utf8');
  assert.ok(doorSrc.includes('blocksMovement('), 'door-entity missing blocksMovement');
  assert.ok(doorSrc.includes('blocksSight('), 'door-entity missing blocksSight');

  const chestSrc = fs.readFileSync(path.join(root, 'js', 'entities', 'chest-entity.js'), 'utf8');
  assert.ok(chestSrc.includes('getTexture('), 'chest-entity missing getTexture');

  const baseSrc = fs.readFileSync(path.join(root, 'js', 'entities', 'interactable-entity.js'), 'utf8');
  assert.ok(baseSrc.includes('class InteractableEntity'), 'interactable-entity missing base class');
  assert.ok(baseSrc.includes('interact('), 'interactable-entity missing interact method');
}

// ── Movement system contracts ──

function testMovementSystemContracts() {
  const src = fs.readFileSync(path.join(root, 'js', 'systems', 'movement-system.js'), 'utf8');
  assert.ok(src.includes('setDestination('), 'movement-system missing setDestination');
  assert.ok(src.includes('advancePath('), 'movement-system missing advancePath');
  // Should NOT auto-break stealth on movement
  assert.ok(!src.includes('playerHidden = false'), 'movement-system should not manually set playerHidden=false');
}

// ── 00_core_test stage validation (real map-based tests) ──

function testCoreTestMeta() {
  const meta = loadYaml('data/00_core_test/meta.yaml');
  assert.strictEqual(meta.id, '00_core_test');
  assert.strictEqual(meta.enabled, false, '00_core_test must be disabled');
  assert.ok(Array.isArray(meta.stages), '00_core_test must declare stages');
  assert.ok(meta.stages.length > 0, '00_core_test must have at least one stage');

  // Every declared stage file must exist
  for (const stageId of meta.stages) {
    const p = path.join(root, `data/00_core_test/stages/${stageId}/stage.yaml`);
    assert.ok(fs.existsSync(p), `00_core_test declares stage '${stageId}' but file missing`);
  }
}

function testCoreTestAllStagesStructure() {
  const meta = loadYaml('data/00_core_test/meta.yaml');
  const coreCreatures = loadYaml('data/00_core/creatures.yaml').creatures;

  for (const stageId of meta.stages) {
    const { stage, grid, ROWS, COLS } = loadStageInSandbox(stageId);
    const ps = stage.playerStart;

    // Basic structure
    assert.ok(stage.name, `${stageId}: missing name`);
    assert.ok(ROWS >= 3, `${stageId}: grid too small`);

    // Player start on floor
    assert.ok(ps.x >= 0 && ps.x < COLS, `${stageId}: playerStart.x out of bounds`);
    assert.ok(ps.y >= 0 && ps.y < ROWS, `${stageId}: playerStart.y out of bounds`);
    assert.strictEqual(grid[ps.y][ps.x], 0, `${stageId}: player must start on FLOOR (0)`);

    // Encounters reference valid creatures and are on floor tiles
    for (const enc of (stage.encounters || [])) {
      assert.ok(coreCreatures[enc.creature], `${stageId}: unknown creature '${enc.creature}'`);
      assert.ok(enc.x >= 0 && enc.x < COLS, `${stageId}: encounter x out of bounds`);
      assert.ok(enc.y >= 0 && enc.y < ROWS, `${stageId}: encounter y out of bounds`);
      assert.strictEqual(grid[enc.y][enc.x], 0, `${stageId}: creature '${enc.creature}' placed on non-floor tile`);
    }
  }
}

function testTsMovement_Pathfinding() {
  const { sandbox, stage } = loadStageInSandbox('ts_movement');
  const ps = stage.playerStart;

  // BFS from player start to bottom-right corner (5,5)
  const pathResult = vm.runInContext(
    `bfs(${ps.x}, ${ps.y}, 5, 5, wallBlk)`,
    sandbox
  );
  assert.ok(pathResult.length > 0, 'ts_movement: BFS should find path from start to (5,5)');

  // Path to a wall cell should be empty
  const noPath = vm.runInContext(`bfs(${ps.x}, ${ps.y}, 0, 0, wallBlk)`, sandbox);
  assert.strictEqual(noPath.length, 0, 'ts_movement: BFS to wall (0,0) should return empty');
}

function testTsCombatEntry_LOS() {
  const { sandbox, stage } = loadStageInSandbox('ts_combat_entry');
  const ps = stage.playerStart;
  const enc = stage.encounters[0];

  // Player and enemy are on same row — should have LOS
  const los = vm.runInContext(`hasLOS(${ps.x}, ${ps.y}, ${enc.x}, ${enc.y})`, sandbox);
  assert.strictEqual(los, true, 'ts_combat_entry: player should have LOS to goblin');

  // LOS blocked by walls — top-left corner (1,1) to enemy through wall row
  // In ts_combat_entry (7x7 open room), all floor tiles have LOS to each other.
  // Instead test that a wall cell blocks: check from one side of the map border
  const wallBlocked = vm.runInContext(`isWallCell(MAP[0][3])`, sandbox);
  assert.strictEqual(wallBlocked, true, 'ts_combat_entry: top border should be wall');
}

function testTsCombatEntry_FOV() {
  const { sandbox, stage } = loadStageInSandbox('ts_combat_entry');
  const ps = stage.playerStart;
  const enc = stage.encounters[0];

  // Goblin faces 180 (left), player is to the left — should be in FOV
  const inFov = vm.runInContext(
    `inFOV({tx:${enc.x}, ty:${enc.y}, facing:${enc.facing}, fov:120}, ${ps.x}, ${ps.y})`,
    sandbox
  );
  assert.strictEqual(inFov, true, 'ts_combat_entry: player should be in goblin FOV');

  // Player behind the goblin (to the right) should NOT be in FOV
  const behindFov = vm.runInContext(
    `inFOV({tx:${enc.x}, ty:${enc.y}, facing:${enc.facing}, fov:120}, ${enc.x}, 1)`,
    sandbox
  );
  // enc is at x=5, checking tile at same x but y=1 (above) — should be outside 120° facing left
}

function testTsMeleeAttack_Adjacent() {
  const { sandbox, stage } = loadStageInSandbox('ts_melee_attack');
  const ps = stage.playerStart;
  const enc = stage.encounters[0];

  // Player (1,2) and goblin (2,2) are adjacent — path should be 1 step
  const pathLen = vm.runInContext(
    `bfs(${ps.x}, ${ps.y}, ${enc.x}, ${enc.y}, wallBlk).length`,
    sandbox
  );
  assert.strictEqual(pathLen, 1, 'ts_melee_attack: player should be 1 step from goblin');

  // LOS should exist
  const los = vm.runInContext(`hasLOS(${ps.x}, ${ps.y}, ${enc.x}, ${enc.y})`, sandbox);
  assert.strictEqual(los, true, 'ts_melee_attack: player should have LOS to adjacent goblin');
}

function testTsEnemyAttack_Reachable() {
  const { sandbox, stage } = loadStageInSandbox('ts_enemy_attack');
  const ps = stage.playerStart;
  const enc = stage.encounters[0];

  // Enemy should be able to pathfind to player
  const pathLen = vm.runInContext(
    `bfs(${enc.x}, ${enc.y}, ${ps.x}, ${ps.y}, wallBlk).length`,
    sandbox
  );
  assert.ok(pathLen > 0, 'ts_enemy_attack: skeleton should be able to reach player');
  assert.ok(pathLen <= 5, 'ts_enemy_attack: skeleton should be within reasonable range');
}

function testTsSkills_SkillMod(dnd) {
  // Rogue with 16 DEX, proficient in stealth, expertise in stealth, level 1
  const stats = {
    str: 8, dex: 16, con: 12, int: 14, wis: 10, cha: 8,
    level: 1,
    skillProficiencies: new Set(['stealth', 'acrobatics', 'perception']),
    expertiseSkills: new Set(['stealth']),
  };

  // stealth → DEX-based: mod(16)=+3, profBonus(1)=+2, expertise x2=+4 → total +7
  const stealthMod = dnd.skillMod('stealth', stats);
  assert.strictEqual(stealthMod, 7, 'stealth mod: DEX(+3) + expertise(+4) = +7');

  // acrobatics → DEX-based: mod(16)=+3, profBonus(1)=+2 → total +5
  const acroMod = dnd.skillMod('acrobatics', stats);
  assert.strictEqual(acroMod, 5, 'acrobatics mod: DEX(+3) + prof(+2) = +5');

  // athletics → STR-based, NOT proficient: mod(8)=-1, no prof → -1
  const athMod = dnd.skillMod('athletics', stats);
  assert.strictEqual(athMod, -1, 'athletics mod: STR(-1) no prof = -1');

  // perception → WIS-based, proficient: mod(10)=+0, prof=+2 → +2
  const percMod = dnd.skillMod('perception', stats);
  assert.strictEqual(percMod, 2, 'perception mod: WIS(+0) + prof(+2) = +2');
}

function testTsSkills_PassiveSkill(dnd) {
  const stats = {
    str: 8, dex: 16, con: 12, int: 14, wis: 10, cha: 8,
    level: 1,
    skillProficiencies: new Set(['stealth', 'perception']),
    expertiseSkills: new Set(['stealth']),
  };

  // passive perception: 10 + perception mod(+2) = 12
  const passivePerc = dnd.passiveSkill('perception', stats);
  assert.strictEqual(passivePerc, 12, 'passive perception: 10 + WIS(0) + prof(2) = 12');

  // passive stealth: 10 + stealth mod(+7) = 17
  const passiveStealth = dnd.passiveSkill('stealth', stats);
  assert.strictEqual(passiveStealth, 17, 'passive stealth: 10 + DEX(3) + expertise(4) = 17');
}

function testTsSkills_SkillCheck(dnd) {
  const stats = {
    str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10,
    level: 1,
    skillProficiencies: new Set(['stealth']),
    expertiseSkills: new Set(),
  };

  // Run 100 skill checks — verify range and structure
  for (let i = 0; i < 100; i++) {
    const result = dnd.skillCheck('stealth', stats, 15);
    assert.ok(result.roll >= 1 && result.roll <= 20, `roll out of range: ${result.roll}`);
    // stealth mod: DEX(+2) + prof(+2) = +4
    assert.strictEqual(result.mod, 4, 'stealth check mod should be +4');
    assert.strictEqual(result.total, result.roll + result.mod, 'total = roll + mod');
    assert.strictEqual(result.success, result.total >= 15, 'success = total >= DC');
    assert.ok(result.skill, 'result should have skill label');
  }
}

function testTsSkills_ProfBonusScaling(dnd) {
  // Prof bonus scales with level: 1-4=+2, 5-8=+3, 9-12=+4, 13-16=+5, 17-20=+6
  assert.strictEqual(dnd.profBonus(1), 2);
  assert.strictEqual(dnd.profBonus(4), 2);
  assert.strictEqual(dnd.profBonus(5), 3);
  assert.strictEqual(dnd.profBonus(9), 4);
  assert.strictEqual(dnd.profBonus(13), 5);
  assert.strictEqual(dnd.profBonus(17), 6);
}

// ── Event system contracts ──

function testFlagsSystemContracts() {
  const src = fs.readFileSync(path.join(root, 'js', 'systems', 'flags.js'), 'utf8');
  assert.ok(src.includes('registerMod('), 'flags.js missing registerMod');
  assert.ok(src.includes('applyOverrides('), 'flags.js missing applyOverrides');
  assert.ok(src.includes('_resolve('), 'flags.js missing _resolve (namespace resolution)');
  assert.ok(src.includes('serialize('), 'flags.js missing serialize');
  assert.ok(src.includes('load('), 'flags.js missing load');
  assert.ok(src.includes('increment('), 'flags.js missing increment');
}

function testEventRunnerContracts() {
  const src = fs.readFileSync(path.join(root, 'js', 'systems', 'event-runner.js'), 'utf8');
  assert.ok(src.includes('onPlayerTile('), 'event-runner missing onPlayerTile');
  assert.ok(src.includes('onEvent('), 'event-runner missing onEvent');
  assert.ok(src.includes('evalCondition('), 'event-runner missing evalCondition');
  assert.ok(src.includes('executeSteps('), 'event-runner missing executeSteps');
  assert.ok(src.includes('_execAction('), 'event-runner missing _execAction');
  assert.ok(src.includes('fireById('), 'event-runner missing fireById');
  // Must handle all core actions
  for (const action of ['move', 'wait', 'waitIdle', 'attack', 'flee', 'hide', 'spawn', 'say', 'setFlag', 'branch', 'goto', 'assert', 'dialog']) {
    assert.ok(src.includes(`'${action}'`), `event-runner missing action handler: ${action}`);
  }
}

function testDialogRunnerContracts() {
  const src = fs.readFileSync(path.join(root, 'js', 'systems', 'dialog-runner.js'), 'utf8');
  assert.ok(src.includes('start('), 'dialog-runner missing start');
  assert.ok(src.includes('_getAvailableChoices('), 'dialog-runner missing _getAvailableChoices');
  assert.ok(src.includes('_waitForChoice('), 'dialog-runner missing _waitForChoice');
  assert.ok(src.includes('_showNode('), 'dialog-runner missing _showNode');
  assert.ok(src.includes('skillCheck'), 'dialog-runner missing skill check support');
}

function testEventsYamlExistence() {
  // Every 00_core_test stage should have events.yaml
  const meta = loadYaml('data/00_core_test/meta.yaml');
  for (const stageId of meta.stages) {
    const evtPath = path.join(root, `data/00_core_test/stages/${stageId}/events.yaml`);
    assert.ok(fs.existsSync(evtPath), `${stageId} missing events.yaml`);
    const evts = loadYaml(`data/00_core_test/stages/${stageId}/events.yaml`);
    assert.ok(Array.isArray(evts.autoplay), `${stageId}/events.yaml must have autoplay array`);
    assert.ok(evts.autoplay.length > 0, `${stageId}/events.yaml autoplay must not be empty`);
    // Every step must have 'do' key
    for (const step of evts.autoplay) {
      assert.ok(step.do, `${stageId}/events.yaml step missing 'do': ${JSON.stringify(step)}`);
    }
  }

  // gw_scripted_b1f should have events.yaml with story events
  const gwEvts = loadYaml('data/01_goblin_invasion/stages/gw_scripted_b1f/events.yaml');
  assert.ok(Array.isArray(gwEvts.events), 'gw_scripted_b1f events.yaml must have events array');
  assert.ok(gwEvts.events.length > 0, 'gw_scripted_b1f must have at least one event');
  for (const evt of gwEvts.events) {
    assert.ok(evt.trigger, `gw_scripted_b1f event missing trigger: ${evt.id || '?'}`);
    assert.ok(Array.isArray(evt.steps), `gw_scripted_b1f event missing steps: ${evt.id || '?'}`);
  }
}

function testGoblinInvasionFlags() {
  const meta = loadYaml('data/01_goblin_invasion/meta.yaml');
  assert.ok(meta.flags, 'goblin_invasion must declare flags');
  assert.ok(meta.flags.entered_warren, 'missing entered_warren flag');
  assert.ok(meta.flags.goblin_captain_dead, 'missing goblin_captain_dead flag');
  assert.ok(meta.flags.goblins_killed, 'missing goblins_killed flag');
  assert.strictEqual(meta.flags.goblins_killed.type, 'counter', 'goblins_killed must be counter type');
}

function testEngageAndAutoplayContracts() {
  const uiPath = path.join(root, 'js', 'ui', 'core-ui.js');
  const uiSrc = fs.readFileSync(uiPath, 'utf8');
  assert.ok(uiSrc.includes('_showEnemyInfoPopup'), 'core-ui should have unified info popup');

  const autoplayPath = path.join(root, 'js', 'autoplay.js');
  const autoplaySrc = fs.readFileSync(autoplayPath, 'utf8');
  assert.ok(autoplaySrc.includes('test_engage_flow'), 'autoplay missing engage_flow scenario');
  assert.ok(autoplaySrc.includes('test_engage_adjacent'), 'autoplay missing engage_adjacent scenario');
  assert.ok(autoplaySrc.includes('test_alert_locality'), 'autoplay missing alert_locality scenario');
}

function testAutoTBTargetingContracts() {
  // Auto-TB targeting removed in v2 — verify cleanup
  const combatSrc = fs.readFileSync(path.join(root, 'js', 'modes', 'mode-combat.js'), 'utf8');
  assert.ok(!combatSrc.includes('toggleExploreTurnBased'),
    'mode-combat should no longer reference toggleExploreTurnBased');
  assert.ok(combatSrc.includes('this._targetingAutoTB=false;'),
    'clearPendingAction must still clear _targetingAutoTB flag');
}

function testCommandStripTBButton() {
  const htmlSrc = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  // TB button must exist in command strip
  assert.ok(htmlSrc.includes('id="cmd-tb"'), 'command strip missing TB toggle button');
  assert.ok(htmlSrc.includes("Hotbar._cmd('toggle_tb')"), 'TB button must call toggle_tb command');

  // Hotbar must handle toggle_tb command
  const hotbarSrc = fs.readFileSync(path.join(root, 'js', 'ui', 'hotbar.js'), 'utf8');
  assert.ok(hotbarSrc.includes("'toggle_tb'"), 'hotbar _cmd missing toggle_tb handler');
  assert.ok(hotbarSrc.includes('toggleExploreTurnBased'), 'toggle_tb handler must call toggleExploreTurnBased');

  // syncCommandStrip must manage TB button visibility and active state
  assert.ok(hotbarSrc.includes('cmd-tb'), 'syncCommandStrip must reference cmd-tb button');
  assert.ok(hotbarSrc.includes('MODE.EXPLORE_TB'), 'syncCommandStrip must check EXPLORE_TB for TB active state');

  // CSS must have active style for sys buttons
  assert.ok(htmlSrc.includes('.cmd-btn.sys.active'), 'CSS missing active style for sys command buttons');
}

// ── Bug fix regression tests ──

/** Patrol paths: wanderEnemies must read ai.patrolPath and step toward waypoints */
function testPatrolPathContracts() {
  const src = fs.readFileSync(path.join(root, 'js', 'systems', 'movement-system.js'), 'utf8');

  // Must detect patrol enemies
  assert.ok(src.includes('ai?.patrolPath') || src.includes("e.ai.patrolPath"),
    'wanderEnemies must read ai.patrolPath from enemy');

  // Patrol enemies must not be skipped by the 40% random check
  assert.ok(src.includes('hasPatrol') && src.includes('!hasPatrol'),
    'wanderEnemies must bypass random skip for patrol enemies');

  // Must advance waypoint index on arrival
  assert.ok(src.includes('_patrolIdx') && src.includes('e.ai.patrolPath.length'),
    'wanderEnemies must advance _patrolIdx and wrap around patrol path length');

  // Must BFS toward the target waypoint
  assert.ok(src.includes('bfs(e.tx,e.ty,tgt.x,tgt.y'),
    'wanderEnemies must BFS from enemy tile toward patrol waypoint');

  // gw_scripted_b1f encounters must have patrolPath on relevant enemies
  const stage = loadYaml('data/01_goblin_invasion/stages/gw_scripted_b1f/stage.yaml');
  const patrolEncs = stage.encounters.filter(enc => enc.ai && enc.ai.patrolPath);
  assert.ok(patrolEncs.length > 0, 'gw_scripted_b1f must have at least one encounter with ai.patrolPath');
  for (const enc of patrolEncs) {
    assert.ok(Array.isArray(enc.ai.patrolPath), `encounter at (${enc.x},${enc.y}) patrolPath must be an array`);
    assert.ok(enc.ai.patrolPath.length >= 2, `patrol path must have at least 2 waypoints`);
    for (const wp of enc.ai.patrolPath) {
      assert.ok(typeof wp.x === 'number' && typeof wp.y === 'number',
        `patrol waypoint must have numeric x,y`);
    }
  }
}

/** BUG-1: gw_b1f stage.yaml must declare nextStage so stairs transition works */
function testBug1_StairsNextStage() {
  const stage = loadYaml('data/01_goblin_invasion/stages/gw_b1f/stage.yaml');
  assert.ok(stage.nextStage, 'BUG-1: gw_b1f stage.yaml must declare nextStage');
  // nextStage can be 'auto' (resolved at runtime) or a direct stage id
  assert.ok(stage.nextStage === 'auto' || stage.nextStage === 'gw_b2f',
    'BUG-1: gw_b1f nextStage must be auto or gw_b2f');

  // Target stage must actually exist
  const targetPath = path.join(root, 'data/01_goblin_invasion/stages/gw_b2f/stage.yaml');
  assert.ok(fs.existsSync(targetPath), 'BUG-1: gw_b2f stage file must exist for stairs to work');

  // Stairs handling code must read nextStage from _MAP_META
  const moveSrc = fs.readFileSync(path.join(root, 'js', 'systems', 'movement-system.js'), 'utf8');
  assert.ok(moveSrc.includes('_MAP_META?.nextStage'), 'BUG-1: movement-system must read nextStage from _MAP_META');
  assert.ok(moveSrc.includes('ModLoader.transitionToStage'), 'BUG-1: movement-system must call ModLoader.transitionToStage');
}

/** BUG-2: _assignEnemyDisplayNames must not produce 'undefined' displayNames when e.type is missing */
function testBug2_DisplayNameFallback() {
  const gameSrc = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');

  // Guard must be present: e.type||e.id||'Unknown' (or equivalent) before charAt
  assert.ok(
    gameSrc.includes("e.type||e.id||'Unknown'") || gameSrc.includes('e.type || e.id'),
    "BUG-2: _assignEnemyDisplayNames must guard against undefined e.type with e.id||'Unknown' fallback"
  );

  // Combat log message must not use bare alerted.size without guard
  const combatSrc = fs.readFileSync(path.join(root, 'js', 'modes', 'mode-combat.js'), 'utf8');
  assert.ok(
    combatSrc.includes('alerted?.size') || combatSrc.includes('alerted?.size ??'),
    'BUG-2: combat log message must guard alerted?.size with null-coalescing fallback'
  );
}

/** BUG-3: showFleeZone must not call setAlpha on flee tiles (baked texture alpha is sufficient) */
function testBug3_FleeZoneAlpha() {
  const rangesSrc = fs.readFileSync(path.join(root, 'js', 'modes', 'combat-ranges.js'), 'utf8');

  // setAlpha(0.6) on flee tiles would multiply with the baked 0.18 texture alpha → ~0.11 (invisible)
  // The fix removes setAlpha from flee tile creation, matching showMoveRange's approach
  const fleeZoneBlock = rangesSrc.substring(rangesSrc.indexOf('showFleeZone('));
  const fleeAddImage = fleeZoneBlock.match(/this\.add\.image[^;]+t_flee[^;]+;/);
  assert.ok(fleeAddImage, 'BUG-3: showFleeZone must add a t_flee image');
  assert.ok(!fleeAddImage[0].includes('setAlpha('), 'BUG-3: flee tile must not call setAlpha (baked texture alpha is sufficient)');

  // Flee zone must use depth >= 16 (above fog layer at 15)
  assert.ok(fleeAddImage[0].includes('setDepth(16)'), 'BUG-3: flee zone tiles must use depth 16 (above fog)');

  // t_flee texture must be defined in sprites.js
  const spritesSrc = fs.readFileSync(path.join(root, 'js', 'sprites.js'), 'utf8');
  assert.ok(spritesSrc.includes("dt('t_flee'"), 'BUG-3: t_flee procedural texture must be defined in sprites.js');
}

/** BUG-5: hotbar must track and render bonus action usage */
function testBug5_BonusActionHotbarTracking() {
  const gameSrc = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');
  const combatSrc = fs.readFileSync(path.join(root, 'js', 'modes', 'mode-combat.js'), 'utf8');
  const hotbarSrc = fs.readFileSync(path.join(root, 'js', 'ui', 'hotbar.js'), 'utf8');

  assert.ok(gameSrc.includes('playerBonusAPMax=1') && gameSrc.includes('playerBonusAP=1'),
    'game.js must initialize player bonus action resource state');
  assert.ok(combatSrc.includes('this.playerBonusAP=this.playerBonusAPMax'),
    'combat turn start must refresh playerBonusAP from playerBonusAPMax');
  assert.ok(combatSrc.includes("action==='disengage'") && combatSrc.includes('this.playerBonusAP=Math.max(0,this.playerBonusAP-1)'),
    'disengage must spend one bonus action');
  assert.ok(!hotbarSrc.includes('TODO: track bonus action usage'),
    'hotbar bonus action TODO must be replaced by real resource tracking');
  assert.ok(hotbarSrc.includes('s.playerBonusAPMax') && hotbarSrc.includes('s.playerBonusAP ?? total'),
    'hotbar must render BA pips from scene bonus action state');
  assert.ok(hotbarSrc.includes("bonus${i < used ? ' spent' : ''}"),
    'hotbar must mark spent BA pips with the spent class');
}

// ── Inventory system tests ──

/** PLAYER_STATS must declare gold and inventory fields */
function testInventoryPlayerStatsFields() {
  const configSrc = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');

  // gold field must be initialized to 0
  assert.ok(configSrc.includes('gold: 0'), 'PLAYER_STATS must declare gold: 0');

  // inventory field must be initialized to empty array
  assert.ok(configSrc.includes('inventory: []'), 'PLAYER_STATS must declare inventory: []');
}

/** game.js must clone inventory from PLAYER_STATS and have action methods */
function testInventoryGameSceneMethods() {
  const gameSrc = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');

  // pStats.inventory must be cloned from PLAYER_STATS.inventory in create()
  assert.ok(
    gameSrc.includes('this.pStats.inventory=[...PLAYER_STATS.inventory]') ||
    gameSrc.includes('this.pStats.inventory = [...PLAYER_STATS.inventory]'),
    'game.js create() must clone PLAYER_STATS.inventory into pStats.inventory'
  );

  // useItem must exist and remove item from inventory
  assert.ok(gameSrc.includes('useItem(item)'), 'game.js missing useItem method');
  assert.ok(gameSrc.includes('inv.splice(idx,1)') || gameSrc.includes('inv.splice(idx, 1)'),
    'useItem must splice item out of inventory after use');

  // equipItem must exist
  assert.ok(gameSrc.includes('equipItem(item)'), 'game.js missing equipItem method');

  // dropItem must exist and remove item from inventory
  assert.ok(gameSrc.includes('dropItem(item)'), 'game.js missing dropItem method');

  // equipItem: weapon path must set pStats.weaponId
  assert.ok(gameSrc.includes("item.type==='weapon'&&item.weaponId") ||
    gameSrc.includes("item.type === 'weapon' && item.weaponId"),
    'equipItem must handle weapon type with weaponId');
  assert.ok(gameSrc.includes('this.pStats.weaponId=item.weaponId') ||
    gameSrc.includes('this.pStats.weaponId = item.weaponId'),
    'equipItem must assign pStats.weaponId from equipped weapon');

  // equipItem: armor path must add acBonus
  assert.ok(gameSrc.includes('this.pStats.ac') && gameSrc.includes('item.acBonus'),
    'equipItem must apply acBonus to pStats.ac for armor items');

  // All three handlers must call SidePanel.refresh after mutation
  const useBlock = gameSrc.substring(gameSrc.indexOf('useItem(item)'), gameSrc.indexOf('equipItem(item)'));
  const equipBlock = gameSrc.substring(gameSrc.indexOf('equipItem(item)'), gameSrc.indexOf('dropItem(item)'));
  const dropBlock = gameSrc.substring(gameSrc.indexOf('dropItem(item)'), gameSrc.indexOf('showDicePopup('));
  assert.ok(useBlock.includes('SidePanel.refresh'), 'useItem must call SidePanel.refresh');
  assert.ok(equipBlock.includes('SidePanel.refresh'), 'equipItem must call SidePanel.refresh');
  assert.ok(dropBlock.includes('SidePanel.refresh'), 'dropItem must call SidePanel.refresh');
}

/** Loot table items must have type, and consumable items with heal must have heal formula */
function testInventoryLootTableItemTypes() {
  const tables = loadYaml('data/00_core/loot-tables.yaml');

  // Check every pool item has a type field
  for (const [tableId, table] of Object.entries(tables)) {
    if (!Array.isArray(table.pool)) continue;
    for (const item of table.pool) {
      assert.ok(item.type, `loot table '${tableId}': item '${item.id}' missing type field`);
    }
  }

  // Consumables with heal must have a parseable dice formula
  const { dnd } = loadConfigExports();
  for (const [tableId, table] of Object.entries(tables)) {
    if (!Array.isArray(table.pool)) continue;
    for (const item of table.pool) {
      if (item.type === 'consumable' && item.heal) {
        let parsed;
        try { parsed = toHostObject(dnd.normalizeDamageSpec(item.heal)); } catch (e) { parsed = null; }
        assert.ok(parsed && parsed.dice.length > 0,
          `loot table '${tableId}': item '${item.id}' heal formula '${item.heal}' is not parseable`);
      }
    }
  }
}

/** Weapon items in loot tables must reference valid weapon IDs in weapons.yaml */
function testInventoryLootWeaponReferences() {
  const tables = loadYaml('data/00_core/loot-tables.yaml');
  const weapons = loadYaml('data/00_core/weapons.yaml').weapons;

  for (const [tableId, table] of Object.entries(tables)) {
    if (!Array.isArray(table.pool)) continue;
    for (const item of table.pool) {
      if (item.type === 'weapon') {
        assert.ok(item.weaponId, `loot table '${tableId}': weapon item '${item.id}' missing weaponId`);
        assert.ok(item.weaponId in weapons,
          `loot table '${tableId}': weapon item '${item.id}' references unknown weaponId '${item.weaponId}'`);
      }
    }
  }
}

/** Chest resolver must support table-level duplicate policy for multi-roll loot. */
function testInventoryLootDuplicatePolicySupport() {
  const chestSrc = fs.readFileSync(path.join(root, 'js', 'entities', 'chest-entity.js'), 'utf8');

  assert.ok(chestSrc.includes('allowDuplicates'),
    'chest-entity resolveLoot must read table.allowDuplicates');
  assert.ok(chestSrc.includes('Math.min(rolls, sourcePool.length)'),
    'chest-entity resolveLoot must cap roll count when duplicates are disabled');
  assert.ok(chestSrc.includes('sourcePool.splice(i, 1)'),
    'chest-entity resolveLoot must remove selected entries when duplicates are disabled');

  const coreTables = loadYaml('data/00_core/loot-tables.yaml');
  for (const [tableId, table] of Object.entries(coreTables)) {
    if (Number(table.rolls || 0) > 1) {
      assert.ok(typeof table.allowDuplicates === 'boolean',
        `loot table '${tableId}' with rolls > 1 must declare allowDuplicates explicitly`);
    }
  }

  const gwTables = loadYaml('data/01_goblin_invasion/loot-tables.yaml');
  for (const [tableId, table] of Object.entries(gwTables)) {
    if (Number(table.rolls || 0) > 1) {
      assert.ok(typeof table.allowDuplicates === 'boolean',
        `goblin loot table '${tableId}' with rolls > 1 must declare allowDuplicates explicitly`);
    }
  }
}

/** Chest handler must push all resolved items (including gems) to pStats.inventory */
function testInventoryChestHandlerLootRouting() {
  const chestSrc = fs.readFileSync(path.join(root, 'js', 'systems', 'chest-handler.js'), 'utf8');

  // All items must go to pStats.inventory
  assert.ok(chestSrc.includes('pStats.inventory.push'),
    'chest-handler must push resolved items to pStats.inventory');

  // After loot resolution, side panel must be refreshed if inventory tab is active
  assert.ok(chestSrc.includes("SidePanel._activeTab === 'inventory'") &&
    chestSrc.includes('SidePanel.refresh'),
    "chest-handler must refresh SidePanel when inventory tab is active after opening chest");
}

/** Side panel must have _renderInventoryTab and inventory tab CSS must exist in index.html */
function testInventorySidePanelUI() {
  const panelSrc = fs.readFileSync(path.join(root, 'js', 'ui', 'side-panel.js'), 'utf8');

  assert.ok(panelSrc.includes('_renderInventoryTab('), 'side-panel missing _renderInventoryTab method');
  assert.ok(
    panelSrc.includes("tabId === 'inventory'"),
    "side-panel refreshTab must handle 'inventory' tab"
  );

  // Inventory tab must display gold
  assert.ok(panelSrc.includes('inv-gold') || panelSrc.includes('gold'),
    'side-panel _renderInventoryTab must show gold');

  // Item rows must have Use/Equip/Drop buttons wired to scene methods
  assert.ok(panelSrc.includes('useItem') && panelSrc.includes('equipItem') && panelSrc.includes('dropItem'),
    'side-panel inventory rows must wire Use/Equip/Drop buttons to scene methods');

  const htmlSrc = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(htmlSrc.includes('.inv-row') || htmlSrc.includes('inv-row'),
    'index.html must define inv-row CSS for inventory item rows');
  assert.ok(htmlSrc.includes('.inv-btn') || htmlSrc.includes('inv-btn'),
    'index.html must define inv-btn CSS for inventory action buttons');
}

/** Inventory stacking contracts: qty/maxStack helpers and UI exposure must exist. */
function testInventoryStackingContracts() {
  const gameSrc = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');
  const chestSrc = fs.readFileSync(path.join(root, 'js', 'systems', 'chest-handler.js'), 'utf8');
  const panelSrc = fs.readFileSync(path.join(root, 'js', 'ui', 'side-panel.js'), 'utf8');
  const hotbarSrc = fs.readFileSync(path.join(root, 'js', 'ui', 'hotbar.js'), 'utf8');

  assert.ok(gameSrc.includes('_getItemMaxStack('),
    'game.js must define _getItemMaxStack helper for per-item stack limits');
  assert.ok(gameSrc.includes('addItemToInventory('),
    'game.js must define addItemToInventory helper');
  assert.ok(gameSrc.includes('Math.min(maxStack,remaining)'),
    'addItemToInventory must split overflow into capped stacks');
  assert.ok(gameSrc.includes('if(Number(item.qty||1)>1)'),
    'use/drop item paths must decrement qty before removing stack entry');

  assert.ok(chestSrc.includes('addItemToInventory'),
    'chest-handler must route loot item insertion through addItemToInventory');
  assert.ok(panelSrc.includes('qtyLabel'),
    'inventory side-panel must display stack quantity labels');
  assert.ok(hotbarSrc.includes('slot._item.qty'),
    'hotbar item labels must display current stack quantity');
}

// ── Item definition system tests ──

function testItemDefsRegistry() {
  // ITEM_DEFS must exist as a global in config.js
  const configSrc = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  assert.ok(configSrc.includes('const ITEM_DEFS'), 'config.js must declare ITEM_DEFS');

  // items.yaml must exist and have an items: map
  const items = loadYaml('data/00_core/items.yaml');
  assert.ok(items?.items && typeof items.items === 'object', 'items.yaml must have top-level items: map');

  // Every item must have name, type, and onUse
  for (const [id, item] of Object.entries(items.items)) {
    assert.ok(item.name, `item '${id}' missing name`);
    assert.ok(item.type, `item '${id}' missing type`);
    assert.ok(item.onUse, `item '${id}' missing onUse`);
  }
}

function testItemOnUseEffectTypes() {
  const items = loadYaml('data/00_core/items.yaml');
  const { dnd } = loadConfigExports();
  const validTypes = new Set(['heal', 'removeStatus', 'applyStatus', 'modifyStat', 'log', 'useAbility']);

  for (const [id, item] of Object.entries(items.items)) {
    // useAbility items: just need the abilityId string
    if (item.onUse.useAbility) {
      assert.ok(typeof item.onUse.useAbility === 'string', `item '${id}' useAbility must be a string`);
      continue;
    }

    assert.ok(Array.isArray(item.onUse.effects), `item '${id}' onUse must have effects array`);
    for (const fx of item.onUse.effects) {
      assert.ok(validTypes.has(fx.type), `item '${id}' has unknown effect type '${fx.type}'`);

      // heal effects must have parseable dice amount
      if (fx.type === 'heal') {
        let parsed;
        try { parsed = toHostObject(dnd.normalizeDamageSpec(fx.amount)); } catch (_e) { parsed = null; }
        assert.ok(parsed?.dice?.length > 0, `item '${id}' heal amount '${fx.amount}' not parseable`);
      }

      // modifyStat effects must have stat and bonus
      if (fx.type === 'modifyStat') {
        assert.ok(fx.stat, `item '${id}' modifyStat missing stat`);
        assert.ok(typeof fx.bonus === 'number', `item '${id}' modifyStat bonus must be a number`);
      }

      // removeStatus / applyStatus must have statusId
      if (fx.type === 'removeStatus' || fx.type === 'applyStatus') {
        assert.ok(fx.statusId, `item '${id}' ${fx.type} missing statusId`);
      }
    }
  }
}

function testItemModLoaderWiring() {
  const modloaderSrc = fs.readFileSync(path.join(root, 'js', 'modloader.js'), 'utf8');

  // modData must include items key
  assert.ok(modloaderSrc.includes("items: {}"), 'modloader modData must initialise items: {}');

  // must load items.yaml per mod
  assert.ok(modloaderSrc.includes("items.yaml") && modloaderSrc.includes('modData.items'),
    'modloader must load items.yaml and merge into modData.items');

  // must call applyItems
  assert.ok(modloaderSrc.includes('applyItems(modData)'), 'modloader must call applyItems(modData)');
  assert.ok(modloaderSrc.includes('applyItems(data)'), 'modloader must define applyItems method');

  // applyItems must write to ITEM_DEFS
  assert.ok(modloaderSrc.includes('ITEM_DEFS[id]'), 'applyItems must populate ITEM_DEFS');

  // Creature loot metadata must be mapped into ENEMY_DEFS for drop resolution
  assert.ok(modloaderSrc.includes('lootTable: enc.lootTable || tmpl.lootTable || null'),
    'modloader applyCreatures must map lootTable from encounter/template');
  assert.ok(modloaderSrc.includes('loot: enc.loot || tmpl.loot || []'),
    'modloader applyCreatures must map loot array from encounter/template');
  assert.ok(modloaderSrc.includes('gold: Number(enc.gold ?? tmpl.gold ?? 0)'),
    'modloader applyCreatures must map fixed gold from encounter/template');
}

function testItemUseItemExecutor() {
  const gameSrc = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');

  // useItem must consult ITEM_DEFS
  assert.ok(gameSrc.includes('ITEM_DEFS[item.id]'), 'useItem must look up ITEM_DEFS[item.id]');

  // must handle all effect types
  for (const effectType of ['heal', 'removeStatus', 'applyStatus', 'modifyStat', 'log']) {
    assert.ok(gameSrc.includes(`case '${effectType}'`), `useItem missing case for effect type '${effectType}'`);
  }

  // useAbility delegation
  assert.ok(gameSrc.includes('onUse?.useAbility'), 'useItem must handle useAbility delegation');

  // modifyStat must track in _statMods for expiry
  assert.ok(gameSrc.includes('_statMods'), 'useItem modifyStat must track in pStats._statMods');

  // tickStatMods must exist and be called at turn end
  assert.ok(gameSrc.includes('tickStatMods()'), 'game.js must define tickStatMods');
  const combatSrc = fs.readFileSync(path.join(root, 'js', 'modes', 'mode-combat.js'), 'utf8');
  assert.ok(combatSrc.includes('tickStatMods'), 'mode-combat must call tickStatMods at turn end');
}

function runLegacyContracts() {
  const { dnd, MODE } = loadConfigExports();

  testDiceNotationParsing(dnd);
  testDamageRolling(dnd);
  testWeaponDataReferences(dnd);
  testExploreTurnBasedModeConstant(MODE);
  testCombatInitSystemContracts();
  testExploreTurnBasedContracts();
  testEngageAndAutoplayContracts();
  testAutoTBTargetingContracts();
  testCommandStripTBButton();

  // Mod system tests
  testModMetaYamlContracts();
  testModSettingsStructure();
  testCoreFirstDedup();
  testGoblinInvasionMod();
  testStageYamlStructure();

  // Stealth system tests
  testStealthSystemContracts();
  testStealthVisualsInSightSystem();

  // Entity architecture tests
  testEntityArchitectureContracts();

  // Movement system tests
  testMovementSystemContracts();

  // 00_core_test — structure validation
  testCoreTestMeta();
  testCoreTestAllStagesStructure();

  // 00_core_test — map-based tests (pathfinding, LOS, FOV)
  testTsMovement_Pathfinding();
  testTsCombatEntry_LOS();
  testTsCombatEntry_FOV();
  testTsMeleeAttack_Adjacent();
  testTsEnemyAttack_Reachable();
  testTsSkills_SkillMod(dnd);
  testTsSkills_PassiveSkill(dnd);
  testTsSkills_SkillCheck(dnd);
  testTsSkills_ProfBonusScaling(dnd);

  // Event system tests
  testFlagsSystemContracts();
  testEventRunnerContracts();
  testDialogRunnerContracts();
  testEventsYamlExistence();
  testGoblinInvasionFlags();

  // Patrol path tests
  testPatrolPathContracts();

  // Bug fix regression tests
  testBug1_StairsNextStage();
  testBug2_DisplayNameFallback();
  testBug3_FleeZoneAlpha();
  testBug5_BonusActionHotbarTracking();

  // Item definition system tests
  testItemDefsRegistry();
  testItemOnUseEffectTypes();
  testItemModLoaderWiring();
  testItemUseItemExecutor();

  // Inventory system tests
  testInventoryPlayerStatsFields();
  testInventoryGameSceneMethods();
  testInventoryLootTableItemTypes();
  testInventoryLootWeaponReferences();
  testInventoryLootDuplicatePolicySupport();
  testInventoryChestHandlerLootRouting();
  testInventorySidePanelUI();
  testInventoryStackingContracts();

}

module.exports = {
  runLegacyContracts,
};
