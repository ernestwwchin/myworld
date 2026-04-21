# Graph Report - .  (2026-04-21)

## Corpus Check
- Large corpus: 583 files · ~233,164 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 800 nodes · 1538 edges · 74 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 381 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]

## God Nodes (most connected - your core abstractions)
1. `runLegacyContracts()` - 52 edges
2. `GameScene` - 45 edges
3. `loadYaml()` - 29 edges
4. `selectAction()` - 23 edges
5. `playerAttackEnemy()` - 21 edges
6. `GameUIController` - 16 edges
7. `executeEngageOpenerAttack()` - 16 edges
8. `processStatusEffectsForActor()` - 15 edges
9. `InteractableEntity` - 14 edges
10. `DoorEntity` - 14 edges

## Surprising Connections (you probably didn't know these)
- `testMapScenarios()` --calls--> `bfs()`  [INFERRED]
  tests/contracts/dnd-and-map-contracts.js → js/helpers.js
- `testMapScenarios()` --calls--> `hasLOS()`  [INFERRED]
  tests/contracts/dnd-and-map-contracts.js → js/helpers.js
- `testMapScenarios()` --calls--> `inFOV()`  [INFERRED]
  tests/contracts/dnd-and-map-contracts.js → js/helpers.js
- `generateAnims()` --calls--> `exists()`  [INFERRED]
  js/sprites.js → tests/unit/_shared/io.js
- `getTileTex()` --calls--> `getManifest()`  [EXTRACTED]
  js/sprites.js → src/sprites.ts

## Hyperedges (group relationships)
- **** — mod_system, yaml_data_format, modloader, meta_yaml, stage_yaml, events_yaml, dialogs_yaml [EXTRACTED]
- **** — mode_combat, initiative_system, turn_flow, combat_ai, damage_system, status_effect_system [EXTRACTED]
- **** — run_state, stage_progression, next_stage_resolution, deterministic_planner, depth_bands, seed_persistence [EXTRACTED]
- **** — inventory_system, carried_inventory, stash_storage, extraction_rules, shop_system [EXTRACTED]
- **** — test_contracts, test_unit_pure, test_unit_sandbox, test_e2e, ci_cd_pipeline [EXTRACTED]
- **** — fog_system, light_system, sight_system [INFERRED]
- **** — class_fighter, class_rogue, class_wizard, class_cleric, class_ranger, class_barbarian [EXTRACTED]
- **** — race_human, race_elf, race_dwarf, race_halfling, race_half_orc, race_tiefling [EXTRACTED]
- **** — mod_tier_1_data, mod_tier_2_tuning, mod_tier_3_hooks, mod_tier_4_script [EXTRACTED]
- **** — index_html, side_panel, hotbar, combat_log, dice_overlay, resource_pips [EXTRACTED]
- **** — mapgen, bsp_algorithm, cellular_automata, rng_system [EXTRACTED]
- **** — mulberry32_prng, rng_logic_stream, rng_vfx_stream, rng_map_stream [EXTRACTED]
- **** — seed_driven_storylines, bsp_map_generator, cellular_automata_generator, encounter_placement, floor_biomes [EXTRACTED]
- **** — core_game_loop, town_hub, dungeon_floors, extraction_rules, death_rules [EXTRACTED]
- **** — bg3_combat_system, engage_opener, initiative_system, flee_mechanic, dnd_5e_rules [EXTRACTED]
- **** — adr_yaml_data, adr_seeded_rng, adr_bsp_map_gen, adr_no_bundler [EXTRACTED]
- **** — fog_of_war, sight_system, light_system [INFERRED]
- **** — macro_floor_system, three_act_structure, floor_biomes, rest_point_system [EXTRACTED]
- **** — universal_race_class_system, faction_system, dnd_5e_rules [EXTRACTED]
- **** — prison_rescue_scenario, black_market_scenario, monster_nest_scenario, cursed_shrine_scenario, apex_predator_scenario, monster_house_scenario, wandering_colossus_scenario [EXTRACTED]
- **** — fog_of_war_system, sight_system, light_system [EXTRACTED]
- **** — event_runner, dialog_runner, flags_system [EXTRACTED]
- **** — combat_system, movement_system, ability_system, ai_behavior_system [EXTRACTED]
- **** — contract_tests, unit_pure_tests, unit_sandbox_tests, e2e_tests [EXTRACTED]
- **** — tiny16_asset_pack, denzi_asset_pack, dcss_asset_pack, cobralad_portraits, procedural_sprites [EXTRACTED]
- **** — infrastructure_opentofu, github_actions_cicd, oidc_github_aws, aws_s3_hosting [EXTRACTED]
- **** — ai_state_idle, ai_state_patrol, ai_state_alert, ai_state_combat, ai_state_search, ai_state_return [EXTRACTED]
- **** — hotbar_ui, initiative_bar_ui, side_panel_ui, enemy_popup_ui, combat_log_ui [EXTRACTED]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.0
Nodes (97): Ability System, ADR: BSP for Map Generation, ADR: Mulberry32 Seeded PRNG, Alerting Rules, Apex Predator Scenario, Mixin Module Pattern, Asset Credits & Licensing, BG3-Style Combat System (+89 more)

### Community 1 - "Community 1"
Cohesion: 0.0
Nodes (62): advanceEnemyTurn(), animEnemyMove(), doEnemyAttack(), doEnemyTurn(), _finishEnemyTurn(), clearAtkRange(), clearFleeZone(), clearMoveRange() (+54 more)

### Community 2 - "Community 2"
Cohesion: 0.0
Nodes (52): abilities.yaml, action-buttons.js (UI), ADR: YAML for All Game Data, AI Action System, BG3 UI Design Reference, Chest Entity, Combat Log, Combat Log UI (+44 more)

### Community 3 - "Community 3"
Cohesion: 0.0
Nodes (71): runCoreContracts(), runDndAndMapContracts(), testCoreTestAllStagesStructure(), testCoreTestMeta(), testDamageRolling(), testDiceNotationParsing(), testExploreTurnBasedModeConstant(), testMapScenarios() (+63 more)

### Community 4 - "Community 4"
Cohesion: 0.0
Nodes (48): getChestEntity(), initChestGlows(), refreshChestTile(), refreshChestTiles(), _removeChestGlow(), tryOpenChest(), getDoorEntity(), getDoorState() (+40 more)

### Community 5 - "Community 5"
Cohesion: 0.0
Nodes (42): 5e Monsters Reference (CR 0-2), The Ancient Temple, BSP Room+Corridor Algorithm, Carried Inventory, Cellular Automata Generator, Core Game Loop, Goblin Creature, Orc Creature (+34 more)

### Community 6 - "Community 6"
Cohesion: 0.0
Nodes (41): 5e Classes Reference, 5e Items & Consumables Reference, Action Surge Ability, ADR: No Bundler (Vanilla JS), AWS S3 + CloudFront Deploy, AWS S3 + CloudFront Hosting, Baldur's Gate 3 (Inspiration), Baldur's Gate 3 Inspiration (+33 more)

### Community 7 - "Community 7"
Cohesion: 0.0
Nodes (11): GameScene, exists(), loadCoreTestMeta(), repoPath(), generateAnims(), generateSprites(), getCharFrame(), getManifest() (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.0
Nodes (17): Contract Tests, bsp(), carveCorridor(), caStep(), cellularAutomata(), fallback(), keepLargestRegion(), mapRng() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.0
Nodes (23): _buildRoomTopology(), _getRoomTopology(), hasLOS(), inFOV(), isDoorCell(), isWallCell(), lineTiles(), roomIdAt() (+15 more)

### Community 10 - "Community 10"
Cohesion: 0.0
Nodes (11): confirmASI(), devExec(), devLog(), handleDiceClick(), selectASI(), toggleEnemySight(), toggleStats(), canOpen() (+3 more)

### Community 11 - "Community 11"
Cohesion: 0.0
Nodes (12): killAllEnemies(), moveToTile(), waitExplore(), waitIdle(), getPlayerState(), openChest(), runAndCaptureLoot(), runSeed() (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.0
Nodes (3): canOpen(), ChestEntity, onOpen()

### Community 13 - "Community 13"
Cohesion: 0.0
Nodes (1): InteractableEntity

### Community 14 - "Community 14"
Cohesion: 0.0
Nodes (10): createMockScene(), loadFogSystem(), run(), testComputeVisibleTiles(), testEffectiveEnemySight(), testIsTileVisibleToPlayer(), testSyncEnemySightRings(), testTileLightLevel() (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.0
Nodes (10): AI Behavior System, AI State: ALERT, AI State: COMBAT, AI State: IDLE, AI State Machine, AI State: PATROL, AI State: RETURN, AI State: SEARCH (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.0
Nodes (7): 5e Races Reference, Dwarf (Hill Dwarf) Race, Elf (High Elf) Race, Half-Orc Race, Halfling (Lightfoot) Race, Human Race, Tiefling Race

### Community 17 - "Community 17"
Cohesion: 0.0
Nodes (5): runUiSystemContracts(), testBugRegressions(), testSystemArchitectureContracts(), testUiAndTargetingContracts(), testWorldPositionContracts()

### Community 18 - "Community 18"
Cohesion: 0.0
Nodes (5): 5e Feats Reference, Alert Feat, Great Weapon Master Feat, Sentinel Feat, Tough Feat

### Community 19 - "Community 19"
Cohesion: 0.0
Nodes (4): Autoplay System, Demoplay System, events.yaml (Stage Events), test.html (Autoplay Runner)

### Community 20 - "Community 20"
Cohesion: 0.0
Nodes (3): 5e Armor & Shields Reference, AC Calculation System, Equipment Slots (Future)

### Community 21 - "Community 21"
Cohesion: 0.0
Nodes (3): 5e Weapons Reference, Longsword, Shortsword

### Community 22 - "Community 22"
Cohesion: 0.0
Nodes (3): Monster House Scenario, Shiren the Wanderer (Inspiration), Trapped Corridor Scenario

### Community 23 - "Community 23"
Cohesion: 0.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 0.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 0.0
Nodes (2): 5e Spells Reference, Spellcasting System (Planned)

### Community 26 - "Community 26"
Cohesion: 0.0
Nodes (2): 5e Conditions & Status Effects Reference, Poisoned Condition

### Community 27 - "Community 27"
Cohesion: 0.0
Nodes (2): Etrian Odyssey (Inspiration), Wandering Colossus (FOE)

### Community 28 - "Community 28"
Cohesion: 0.0
Nodes (2): 0x72 Dungeon Atlas, Tileset & Sprite Sourcing

### Community 29 - "Community 29"
Cohesion: 0.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 0.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 0.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 0.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 0.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 0.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 0.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 0.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 0.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 0.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 0.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 0.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 0.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 0.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 0.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 0.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 0.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 0.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 0.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 0.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 0.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 0.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 0.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 0.0
Nodes (0): 

### Community 53 - "Community 53"
Cohesion: 0.0
Nodes (0): 

### Community 54 - "Community 54"
Cohesion: 0.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 0.0
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 0.0
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 0.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 0.0
Nodes (0): 

### Community 59 - "Community 59"
Cohesion: 0.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 0.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 0.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 0.0
Nodes (0): 

### Community 63 - "Community 63"
Cohesion: 0.0
Nodes (0): 

### Community 64 - "Community 64"
Cohesion: 0.0
Nodes (0): 

### Community 65 - "Community 65"
Cohesion: 0.0
Nodes (0): 

### Community 66 - "Community 66"
Cohesion: 0.0
Nodes (0): 

### Community 67 - "Community 67"
Cohesion: 0.0
Nodes (0): 

### Community 68 - "Community 68"
Cohesion: 0.0
Nodes (0): 

### Community 69 - "Community 69"
Cohesion: 0.0
Nodes (1): dialogs.yaml (Conversation Trees)

### Community 70 - "Community 70"
Cohesion: 0.0
Nodes (1): rules.yaml

### Community 71 - "Community 71"
Cohesion: 0.0
Nodes (1): Ideas Folder (docs/ideas/)

### Community 72 - "Community 72"
Cohesion: 0.0
Nodes (1): Multi-Floor Escort Scenario

### Community 73 - "Community 73"
Cohesion: 0.0
Nodes (1): Roadmap (Phase 2-4)

## Knowledge Gaps
- **Thin community `Community 23`** (2 nodes): `mulberry32()`, `rng.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `handler()`, `cf-function-pr-routing.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `5e Spells Reference`, `Spellcasting System (Planned)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `5e Conditions & Status Effects Reference`, `Poisoned Condition`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `Etrian Odyssey (Inspiration)`, `Wandering Colossus (FOE)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `0x72 Dungeon Atlas`, `Tileset & Sprite Sourcing`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `server.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `check_browser.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `entities.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `actors.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `combat-log.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `side-panel.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `common.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `flags.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `combat-join-and-debug.spec.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `floor-transition-crash.spec.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `playwright.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `generated-map-persistence.spec.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `movement.spec.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `inventory.spec.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `highlights.spec.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `run-progression-smoke.spec.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `fog.spec.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `town-portal.spec.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `combat-turns.spec.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `combat.spec.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `mapgen.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `autoplay.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `modloader.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `demoplay.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `templates.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `hotbar.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `side-panel.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `combat-log.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `action-buttons.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `common.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `sight-system.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `input-system.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `fog-system.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `light-system.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `flags.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `dialog-runner.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `event-runner.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `camera-system.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `ability-system.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `dialogs.yaml (Conversation Trees)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `rules.yaml`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `Ideas Folder (docs/ideas/)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `Multi-Floor Escort Scenario`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `Roadmap (Phase 2-4)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.