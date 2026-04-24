# W1 Full Implementation Plan

Source: `docs/ideas/raw/mod-system-brainstorm.md` (4000+ lines)
Scope: Everything needed for a complete Act 1 — town → 5 dungeon floors → boss → victory → town return.

## Status Legend
- [x] Done (in codebase or on `feat/w1-mod-system` branch)
- [~] Partial (exists but incomplete)
- [ ] Not started

---

## Phase 0: Engine Primitives (DONE — `feat/w1-mod-system`)

Standalone modules with unit tests, not yet wired into game.

- [x] #1 AbilityRunner — eval+call with `with(this){}`, 17 action + 16 check + 2 roll methods
- [x] #2 BoostRunner — stat modifier runner (ac, str, advantage, resistance, etc.)
- [x] #3 recalcBoosts(actor) — iterate statuses + equipment, cache `actor.derived`
- [x] #4 useAbility() pipeline — condition → onCast → roll → onHit/onMiss
- [x] #5 StatusEngine — source tracking, stackId/stackPriority, onReapply modes
- [x] #6 Combat ability defs — Attack/Dash/Disengage/Hide/Flee/Dodge/Help as data
- [x] #7 Damage pipeline — 10 types, immunity/resistance/vulnerability multipliers
- [x] #8 Resource system — action + bonusAction + movement + reaction
- [x] #9 AI profiles — basic/ranged/support with trigger-based ability selection
- [x] #10 Creature extends: — deep-merge inheritance resolver

---

## Phase 1: Wire Engine Into Game (DONE)

### 1A. Status engine wiring
- [x] Wire `StatusEngine.applyStatus()` via `applyStatusToActor()` mixin
- [x] Wire `StatusEngine.removeStatusBySource()` via `removeStatusesBySource()` mixin
- [x] Wire `recalcBoosts()` on apply/remove — cache `actor.derived`
- [x] Side panel header + character tab refresh on boost change (Phase 1E)

### 1B. Damage pipeline wiring
- [x] Inline resistance/vulnerability/immunity check in `playerAttackEnemy()`
- [x] Read `actor.derived.resistances/immunities/vulnerabilities` from creature YAML
- [x] Float text shows "(resisted)", "(vulnerable!)", "IMMUNE" labels
- [x] `buildBaseDerived()` initializes derived from creature YAML on spawn
- [ ] Float text color by damage type (deferred to UI overhaul)

### 1C. Typed damage in combat
- [x] Player attacks route through resistance check inline
- [x] Enemy attacks route through damage pipeline
- [ ] Wire `useAbility()` into `selectAction()` for full pipeline (deferred)
- [ ] Resource check / bonusAction wiring (deferred)

### 1D. AI profile wiring
- [x] Wire `decideAction()` into `combat-ai.ts` enemy turn
- [x] Read creature `ai.profile` field from YAML
- [x] Pass creature `abilities[]` to AI decision
- [x] Helper methods: `_buildAIState`, `_buildAITargets`, `_buildAIAllies`

### 1E. Creature resolver wiring
- [x] Call `resolveAllCreatures()` in ModLoader during mod load
- [x] Resolved before `applyCreatures()` — extends: chains resolved

### 1F. Event hook wiring (9 trigger points wired)
- [x] `on_combat_start` — fire on enterCombat()
- [x] `on_combat_end` — fire on exitCombat()
- [x] `on_turn_start` — fire for player and enemy turns
- [x] `on_turn_end` — fire on endPlayerTurn()
- [x] `on_hit` — fire in player and enemy attack paths
- [x] `on_miss` — fire in player attack miss path
- [x] `on_kill` — fire on enemy defeat
- [x] `on_damage_dealt` — fire after player deals damage
- [x] `on_damage_taken` — fire after enemy hits player
- [x] `on_status_applied` / `on_status_removed` — wired in StatusEffectSystemMixin
- [x] `on_skill_check` — fired from door/chest skill check interact paths
- [x] Round counter: `combatRound` initialised to 1 on combat start, incremented per round

---

## Phase 2: Encounter System Rework (DONE)

### 2A. Squad-based encounters
- [x] New YAML schema: `squad:` with `creatures[]`, `count`, `placement`
- [x] Squad placement algorithm — match hint → pick room → cluster within 2 tiles
- [x] Room occupation tracking — avoid stacking squads
- [x] Backward compat: flat `creature:` format still works
- [x] Auto-assign `group: squad_N` for room-based combat join

### 2B. Room-aware placement
- [x] BSP generator already returns `rooms[]` with bounds
- [x] Room classification: dead_end, hub, normal (by connection count)
- [x] Placement priority: room_near_stairs > room_center > room_dead_end > corridor
- [x] Minimum 6-tile distance from playerStart enforced

### 2C. Creature naming (BG3-style)
- [x] Explicit `name:` in encounter YAML wins
- [x] Auto-suffix for duplicates: "Goblin A", "Goblin B"
- [x] No suffix for unique types in combat
- [x] Wired into enterCombat() on combat group assembly

### 2D. Encounter tables by floor
- [x] B1F: 2× patrol, 1× camp, 1× wolf den
- [x] B2F: 2× patrol, 1× barracks, 1× spider nest, 1× captain guard (named)
- [x] B3F: 1× heavy patrol, 1× shaman circle, 1× spider den, 1× elite guard (named), 1× ambush (hidden)
- [x] B4F: 2× heavy patrol, 1× war camp, 1× spider lair, 1× chief guard (named), 1× trapper ambush (hidden)
- [~] B5F: hand-crafted boss layout (unchanged from before)
- [x] Hidden creature state: `hidden: true` on squad creatures

### 2E. Difficulty budget
- [x] Formula: `level × 100 × 4` medium budget logged after applyCreatures(); warns if deadly
- [x] `_encounterXP` / `_difficultyBudget` stored on mapDef for tooling
- [x] Creature XP values declared in creatures.yaml

---

## Phase 3: Run Loop Completion (MOSTLY DONE)

### 3A. Boss victory
- [x] Wire `shouldResolveBossVictory()` into `exitCombat()` — check if bossStage
- [x] Call `resolveRunOutcome('victory')` after boss defeated with 2s delay
- [x] "BOSS DEFEATED!" banner shown

### 3B. Player death
- [x] `handlePlayerDefeat()` wired on GameScene → `resolveRunOutcome('death')`
- [x] Gold loss (30%), item loss per world config (existing resolveRunOutcome)

### 3C. Run loop polish
- [x] Dynamic floor counter in HUD (reads from _MAP_META.floor)
- [x] Run summary panel on town return (victory/death/extraction stats)
- [ ] Objective hint if quest active — deferred to quest system
- [ ] Win/loss transition screens — deferred to UI overhaul

### 3D. Mid-run pacing
- [x] Camp/refuge floor — `gw_camp` between B3F/B4F: campfire short rest, supply crate, extraction

---

## Phase 4: YAML Content — Data-Driven Core

### 4A. Abilities YAML
- [x] `00_core/abilities.yaml` — all W1 abilities in YAML format
- [x] Attack, Dash, Disengage, Hide, Flee, Dodge, Help (common)
- [x] Ability `actionCost:` field (action / bonusAction / free)
- [x] Rogue: Cunning Action variants, Sneak Attack
- [x] Fighter: Second Wind, Action Surge
- [x] ModLoader: load abilities.yaml, merge into ABILITY_DEFS registry
- [ ] Ability `extends:` inheritance (reuse creature resolver pattern — deferred)

### 4B. Statuses YAML
- [x] `00_core/statuses.yaml` — all W1 statuses with `boosts:` pipe strings
- [x] burning, poisoned, bleeding, stunned, blessed, haste, slow, restrained, hidden, dodging, fleeing
- [x] Status `stackId`/`stackPriority` for mutual exclusion groups
- [x] ModLoader: load statuses.yaml, merge into STATUS_DEFS registry
- [ ] Status `saveToRemove:` for save-to-shake-off — partially via onTrigger (deferred)

### 4C. Creatures YAML update
- [x] `extends:` on goblin variants (goblin_archer/warrior/captain/etc extend goblin)
- [x] `ai: { profile, preferredRange }` on all creatures
- [x] `resistances:`, `immunities:`, `vulnerabilities:` arrays on all creatures
- [x] `onHit:` effects — spider/cave_spider bite → save vs poisoned
- [ ] `abilities:` list with trigger conditions per creature (deferred to useAbility wiring)

### 4D. Items YAML update
- [x] `onUse:` effects: heal, removeStatus, applyStatus, modifyStat, useAbility
- [x] Scrolls: shield, misty step, fireball, lightning bolt
- [x] Potions: heal, greater heal, str, invis, fly, fire resist, antidote
- [x] ModLoader: load items.yaml, merge into ITEM_DEFS registry
- [ ] Weapon `weapon_abilities:[]` — granted on equip (deferred)
- [ ] Throwable items (deferred)

---

## Phase 5: Town Services (MOSTLY DONE)

### 5A. Stash UI
- [x] Stash view panel (full-screen mobile-first overlay)
- [x] Deposit all / withdraw all buttons
- [x] Individual item move between carried/stash
- [x] Wired into interactable entity stash actions

### 5B. Shop system
- [x] Default shop stock (potions, antidote, torch, rope)
- [x] Shop browse panel — full-screen, gold display, buy buttons
- [x] Buy item: deduct gold, add to inventory
- [x] Sold-out graying for unavailable items
- [ ] `shop.yaml` in mod data — deferred
- [ ] Restock on extract/new run — deferred

### 5C. Quest board MVP
- [x] Quest data in YAML — `quests.yaml` per mod, loaded into QUEST_DEFS
- [x] Quest board interactable — `showQuestBoardPanel()` with accept buttons

---

## Phase 6: Map & Terrain

### 6A. BSP room data export
- [ ] BSP generator returns `rooms[]` with `{ x, y, w, h, type, connections }`
- [ ] Room type detection: dead_end (1 connection), hub (3+), corridor
- [ ] Expose rooms to encounter placement system

### 6B. Terrain effects
- [x] Terrain tile types: fire(8), acid(9), ice(10), consecrated(11) — TILE const + rules.yaml symbols
- [x] Per-tile effect on enter: `checkTerrainEffect()` in movement-system, damage+save+status
- [x] TERRAIN_DEFS config map: fire 1d6+burning, acid 1d4+poisoned+save, ice 1d4+restrained+save
- [ ] `spawn_terrain()` functor for abilities (fireball leaves fire) — deferred
- [ ] Terrain duration: turns until terrain fades — deferred
- [ ] Terrain visual: tile overlay / color tint — deferred

### 6C. Tile & sprite rework
- [ ] Tile atlas consolidation (single spritesheet)
- [ ] Per-biome tile themes (warren stone, fungal, bone, deep pit, throne)
- [ ] Door sprites (open/closed/locked states)
- [ ] Chest sprites (open/closed/trapped)
- [ ] Interactable entity sprites (portal, stash, shop, quest board)

---

## Phase 7: Combat UI Polish

### 7A. Ability UI
- [x] Hotbar tabs: common / class / items
- [x] Action button graying when resource insufficient (unavail class, grayscale+dim)
- [x] Tooltip showing ability name, cost, description (300ms hover, type-colored)
- [ ] Ability range indicator on hover (circle overlay) — deferred
- [ ] AOE preview on ability select — deferred

### 7B. Status UI
- [x] Status icon bar below HP bar (emoji + duration + stacks, per-type colors)
- [x] Updates immediately on apply/remove via updateHUD()
- [x] Side panel: effective AC/speed/saves with (+N) boost diffs colored green/red
- [ ] Status icons on enemy portraits — deferred

### 7C. Combat feedback
- [x] Damage number colored by damage type in combat log
- [x] [type] badge inline on hit entries
- [x] Resistance/vulnerable/immune labels with distinct colors
- [ ] Projectile tween animations — deferred
- [ ] Cast/hit sound hooks from YAML — deferred

---

## Phase 8: Advanced Systems (post-core, pre-polish)

### 8A. Aura engine
- [x] Spatial range check per second — `aura: { radius, statusId, target, duration }` on creature YAML
- [x] Auto-apply child status when player enters range
- [x] Auto-remove via removeStatusesBySource() when player exits range
- [x] Aura source tracking via StatusEngine source field
- [x] startAuraTicker()/stopAuraTicker() wired to scene create/shutdown
- [x] Hobgoblin radius-3 slow aura as first showcase
- [ ] Aura cleanup on bearer death — deferred
- [ ] Aura circle rendering (translucent overlay) — deferred

### 8B. Explore abilities
- [x] Lockpick (Sleight of Hand vs lockDc) — DoorEntity + ChestEntity
- [x] Force Open / Break door (Athletics vs breakDc) — DoorEntity
- [x] Check for traps (Perception vs trapDc) — ChestEntity, sets trapDetected flag
- [x] Disarm trap (Sleight of Hand vs trapDc, needs detected) — ChestEntity
- [x] abilities.yaml: lockpick/break_door/check_trap/disarm_trap explore-type entries
- [x] entity-system passes lockDc/breakDc/trapDc from YAML
- [ ] Detect magic, Persuade, Steal — deferred

### 8C. Additional functors
- [ ] `stealthRoll()`, `interactEntity()`, `startDialog()`
- [ ] `revealTrap()`, `triggerTrap()`, `disarmTrap()`
- [ ] `revealMagic()`, `lootFrom()`, `enterCombat()`
- [ ] `skillCheck()` — generic skill roll functor

---

## Deferred (post-W1)

- Concentration system (save on damage, one at a time)
- Reactions / opportunity attacks
- Boss phases (HP threshold transitions)
- Spell slots / cooldowns
- Multiclassing
- Companion/ally system
- Equipment durability
- Multiple worlds (only Goblin Warren for W1)
- WFC generator
- Full NPC economy

---

## Dependency Graph

```
Phase 0 (done)
    ↓
Phase 1 (wiring) ←── unlocks everything
    ↓           ↓
Phase 2      Phase 4
(encounters) (YAML content)
    ↓           ↓
Phase 3 ←───────┘
(run loop completion)
    ↓
Phase 5 (town services)
    ↓
Phase 6 (map/terrain) ── can parallel with Phase 5
    ↓
Phase 7 (UI polish) ── can parallel with Phase 6
    ↓
Phase 8 (advanced systems)
```

**Critical path to playable run:** Phase 1 → Phase 3A (boss victory) → Phase 3B (death) → Phase 2D (encounter tables)

**Minimum viable Act 1:** Phases 1, 2, 3, 4A-4C = town → 5 floors with squads → boss → win → town
