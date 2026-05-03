# Graph Report - /home/wonwong/git/wonwong/myworld  (2026-04-23)

## Corpus Check
- 102 files · ~286,559 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 599 nodes · 780 edges · 83 communities detected
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]

## God Nodes (most connected - your core abstractions)
1. `GameScene` - 44 edges
2. `AbilityRunner` - 42 edges
3. `BoostRunner` - 25 edges
4. `GameUIController` - 15 edges
5. `InteractableEntity` - 13 edges
6. `DoorEntity` - 13 edges
7. `ChestEntity` - 12 edges
8. `loadYaml()` - 12 edges
9. `StatusEngine` - 11 edges
10. `runDndAndMapContracts()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `bfs()` --calls--> `testMapScenarios()`  [INFERRED]
  src/helpers.ts → /home/wonwong/git/wonwong/myworld/tests/contracts/dnd-and-map-contracts.ts
- `inFOV()` --calls--> `testMapScenarios()`  [INFERRED]
  src/helpers.ts → /home/wonwong/git/wonwong/myworld/tests/contracts/dnd-and-map-contracts.ts
- `generateAnims()` --calls--> `exists()`  [INFERRED]
  src/sprites.ts → /home/wonwong/git/wonwong/myworld/tests/unit/_shared/io.ts
- `hasLOS()` --calls--> `testMapScenarios()`  [INFERRED]
  src/helpers.ts → /home/wonwong/git/wonwong/myworld/tests/contracts/dnd-and-map-contracts.ts
- `loadStageInSandbox()` --calls--> `testMapScenarios()`  [INFERRED]
  /home/wonwong/git/wonwong/myworld/tests/contracts/helpers.ts → /home/wonwong/git/wonwong/myworld/tests/contracts/dnd-and-map-contracts.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (12): GameScene, withHotbar(), exists(), loadCoreTestMeta(), repoPath(), generateAnims(), generateSprites(), getCharFrame() (+4 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (3): AbilityRunner, isActor(), useAbility()

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (11): damageColor(), Contract Tests, deepMerge(), resolveAllCreatures(), resolveCreature(), loadYaml(), runSchemaContracts(), Testing Architecture (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (4): BoostRunner, compileBoost(), emptyDerived(), recalcBoosts()

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (6): GameUIController, toggleEnemySight(), toggleStats(), DoorEntity, onOpen(), withSidePanel()

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (33): Mixin Module Pattern, Asset Credits & Licensing, Bugs Tracker (docs/BUGS.md), Fresh Meat (Butcher's Chamber), Canvas Upscale Fog Smoothing, CobraLad Portraits, Cursed Shrine (Wave Survival), DCSS Tile Pack (+25 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (12): killAllEnemies(), moveToTile(), waitExplore(), waitIdle(), getPlayerState(), openChest(), runAndCaptureLoot(), runSeed() (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (25): runCoreContracts(), runDndAndMapContracts(), testCoreTestAllStagesStructure(), testCoreTestMeta(), testDamageRolling(), testDiceNotationParsing(), testExploreTurnBasedModeConstant(), testWeaponDataReferences() (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (27): 5e Classes Reference, 5e Items & Consumables Reference, Action Surge Ability, Baldur's Gate 3 (Inspiration), Baldur's Gate 3 Inspiration, BG3 UI Design Reference, Barbarian Class, Cleric Class (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (15): testMapScenarios(), bfs(), _buildRoomTopology(), _getRoomTopology(), hasLOS(), inFOV(), isWallCell(), lineTiles() (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (17): Alerting Rules, Apex Predator Scenario, BG3-Style Combat System, Underground Black Market Scenario, Combat Entry (BG3-style), Combat Mode, Combat System, D20 Attack Roll System (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (2): ChestEntity, onOpen()

### Community 12 - "Community 12"
Cohesion: 0.21
Nodes (1): StatusEngine

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (15): The Ancient Temple, Core Game Loop, Death Rules, Dungeon Floors, Floor Biomes & Map Themes, Forward-Only Design Philosophy, The Goblin Cave, Macro-Floor System (+7 more)

### Community 14 - "Community 14"
Cohesion: 0.2
Nodes (1): InteractableEntity

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (8): checkTrigger(), decideAction(), decideBasic(), decideRanged(), decideSupport(), distance(), nearestEnemy(), selectAbility()

### Community 16 - "Community 16"
Cohesion: 0.31
Nodes (11): AI Action System, AI Behavior System, AI State: ALERT, AI State: COMBAT, AI State: IDLE, AI State Machine, AI State: PATROL, AI State: RETURN (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.44
Nodes (9): bsp(), carveCorridor(), caStep(), cellularAutomata(), fallback(), keepLargestRegion(), mapRng(), randomType() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (2): canAfford(), spendResource()

### Community 19 - "Community 19"
Cohesion: 0.27
Nodes (10): AWS S3 + CloudFront Hosting, E2E Tests (Playwright), GitHub Actions CI/CD, Infrastructure (OpenTofu), Nonprod Environment, OIDC GitHub→AWS Auth, Playwright, Prod Environment (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.28
Nodes (1): FloorItemEntity

### Community 21 - "Community 21"
Cohesion: 0.29
Nodes (7): 5e Races Reference, Dwarf (Hill Dwarf) Race, Elf (High Elf) Race, Half-Orc Race, Halfling (Lightfoot) Race, Human Race, Tiefling Race

### Community 22 - "Community 22"
Cohesion: 0.5
Nodes (2): pathTileCost(), tileDist()

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (5): 5e Feats Reference, Alert Feat, Great Weapon Master Feat, Sentinel Feat, Tough Feat

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (2): getFlags(), w()

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (3): 5e Armor & Shields Reference, AC Calculation System, Equipment Slots (Future)

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (3): Monster House Scenario, Shiren the Wanderer (Inspiration), Trapped Corridor Scenario

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (2): 5e Spells Reference, Spellcasting System (Planned)

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (2): Etrian Odyssey (Inspiration), Wandering Colossus (FOE)

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (2): 0x72 Dungeon Atlas, Tileset & Sprite Sourcing

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (1): 5e Weapons Reference

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (1): 5e Conditions & Status Effects Reference

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (1): 5e Monsters Reference (CR 0-2)

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (1): Ideas Folder (docs/ideas/)

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (1): Prison Rescue Scenario

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (1): Monster Nest Scenario

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (1): Multi-Floor Escort Scenario

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (1): ADR: YAML for All Game Data

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (1): ADR: Mulberry32 Seeded PRNG

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (1): ADR: BSP for Map Generation

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (1): ADR: No Bundler (Vanilla JS)

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (1): Code Conventions

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (1): Roadmap (Phase 2-4)

## Knowledge Gaps
- **Thin community `Community 28`** (2 nodes): `manualChunks()`, `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `mulberry32()`, `rng.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `syncUIOverlay()`, `autoplay-entry.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `syncUIOverlay()`, `main.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `handler()`, `cf-function-pr-routing.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `5e Spells Reference`, `Spellcasting System (Planned)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `Etrian Odyssey (Inspiration)`, `Wandering Colossus (FOE)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `0x72 Dungeon Atlas`, `Tileset & Sprite Sourcing`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `check_browser.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `autoplay.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `demoplay.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `combat-ai.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `mode-explore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `entities.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `actors.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `templates.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `combat-log.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `side-panel.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `action-buttons.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `hotbar.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `common.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `chest-handler.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `camera-system.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `ability-system.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `event-runner.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `flags.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `input-system.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `entity-system.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `floor-item-handler.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `status-effect-system.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `fog-system.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `light-system.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `movement-system.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `inventory-system.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `door-handler.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `sight-system.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `leveling-system.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `damage-system.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `dialog-runner.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `playwright.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `5e Weapons Reference`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `5e Conditions & Status Effects Reference`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `5e Monsters Reference (CR 0-2)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `Ideas Folder (docs/ideas/)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `Prison Rescue Scenario`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `Monster Nest Scenario`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `Multi-Floor Escort Scenario`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `ADR: YAML for All Game Data`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `ADR: Mulberry32 Seeded PRNG`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `ADR: BSP for Map Generation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `ADR: No Bundler (Vanilla JS)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `Code Conventions`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `Roadmap (Phase 2-4)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameScene` connect `Community 0` to `Community 1`, `Community 11`, `Community 5`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **Why does `AbilityRunner` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._