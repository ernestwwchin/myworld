---
tags: [myworld, roadmap]
status: active
---

# MyWorld RPG — Roadmap

## Legend
- [ ] Not started
- [~] Partial / in progress
- [x] Done

---

## Phase 1: Foundation (Done)

### Stage Transition System
- [x] Stairs interaction: step on STAIRS tile → trigger floor transition
- [x] `ModLoader.transitionToStage()`: reload MAP, enemies, entities, events, lights
- [x] GameScene reset: clear sprites, fog, enemies → rebuild from new stage data
- [x] Persist player state across floors (HP, items, flags, level)
- [x] Floor indicator in HUD (e.g., "B2F")
- [x] Deterministic map persistence (seed saved to localStorage immediately)
- [x] Spawn safety (player never lands in wall after transition)
- [x] `nextStage` token resolution (`$auto`, `$boss`, `$town`)

### Town Hub
- [x] Town stage with portal plaza + quest keeper + quartermaster
- [x] Dialog-prefixed NPC action support
- [x] Portal interaction → enter dungeon

### Combat System
- [x] BG3-style turn-based combat with initiative
- [x] Stealth / hidden movement with sight detection
- [x] Room-based combat joining (nearby enemies alert)
- [x] Loot tables with weighted pools
- [x] Floor item drops and pickup
- [x] Combat log with roll details

### Chest & Loot
- [x] ChestEntity with behaviorPresets: standard, locked, trapped
- [x] Loot resolution: fixed items + random rolls from table
- [x] BG3-style chest opening VFX

---

## Phase 2: World-Run Loop (Next)

### Design
- Start from town hub (`startMap: town_hub`)
- Main quest: reach depth 10 and defeat boss
- Side quests: generated contracts (hunt/retrieve/scout/rescue/cull)
- Generated floors follow depth-based difficulty curve
- Camp/refuge floors as pacing relief
- Inventory split: carried run inventory + persistent town stash
- Extraction banks loot; death applies difficulty-based loss

### Sprint Tasks (Ordered)
1. **Run planner skeleton**
   - [x] Create run state (`runId`, `seed`, `worldId`, `depth`, `acceptedQuests`, `carried`, `runGold`)
   - [x] Resolve next stage descriptor from world/depth bands
   - [x] Make `nextStage:auto` deterministic per run seed/context
2. **Random map generator**
   - [ ] New file: `js/systems/map-generator.js`
   - [ ] BSP room + corridor algorithm
   - [ ] Stage YAML `generator:` block replaces `grid:` for random floors
   - [ ] Config: width, height, room count/size ranges, corridor style
   - [ ] Seed support: `seed: ~` (random) or `seed: 42` (reproducible)
   - [ ] Auto-place: playerStart (first room), stairs/exit (last room)
   - [ ] Auto-generate lights per room (dim/bright based on config)
   - [ ] Feature tiles: water pools, grass patches
   - [ ] ModLoader integration: detect `generator:` → run generator → produce grid/encounters/entities
3. **Encounter placement**
   - [ ] Weighted creature pool per floor config
   - [ ] Density levels: low / medium / high (enemies per room)
   - [ ] Boss room: optional boss + guards in deepest room
   - [ ] Group assignment: enemies in same room share a group
   - [ ] Scaling: higher floors → more enemies, tougher creatures
4. **World 1 baseline (10-depth)**
   - [ ] One portal world configured for 10-depth run
   - [ ] Generated hostile stages + one guaranteed refuge + fixed boss stage
   - [ ] Floor 1-4: goblin/skeleton pool, dark lighting
   - [ ] Floor 5: hand-crafted boss stage (goblin captain + guards)
   - [ ] Floor 6-9: undead/demon pool, darker theme
   - [ ] Floor 10: hand-crafted shrine (special dialog, reward, ending)
5. **Inventory split + resolution**
   - [ ] Carried vs stash data model
   - [ ] Extraction banking and death loss rules (easy/normal/hard)
6. **Side-quest board MVP**
   - [ ] Offer 2-3 contracts, accept up to 1-2
   - [ ] Templates: `depth_scout`, `hunt_cull`, `retrieve_item`

### Architecture Decisions
- One-folder-per-authored-stage layout (`stages/<id>/stage.yaml`)
- Registry YAML files for generated progression logic (`worlds.yaml`, `generation-rules.yaml`)
- `nextStage` convention: `<stage_id>` (fixed), `auto` (planner), `boss` (world boss), `town` (hub), omitted (no link)
- `auto` does not infer generator from current stage; next-stage descriptor defines generator type
- Target mod: `data/02_dungeon_campaign/`

### State Flow
```
town_idle → town_prep → run_start → run_active → run_extraction/run_death → town_resolution → town_idle
```

---

## Phase 3: Content & Systems

### Chest Enhancements
- [ ] Trapped chest: Dex saving throw (DC from config) to halve damage
- [ ] Locked chest: Thieves' Tools check (Dex + proficiency vs lockDC)
- [ ] Perception/Investigation check to detect traps before opening
- [ ] Random chest placement in generator
- [ ] Chest behavior distribution: standard 60%, trapped 25%, locked 10%, mimic 5%

### Key Item System
- [ ] Player key inventory (Set/Map of keyIds)
- [ ] Pick up key: from chest loot, enemy drop, or interactable
- [ ] Use key: auto-consume on matching locked chest/door
- [ ] Generator: place locked chest → place matching key in earlier room

### Mimic
- [ ] New creature type + ChestEntity behavior preset
- [ ] On open → transform to mimic → enter combat
- [ ] Mimic gets surprise round

### Map Events (Random Floor Specials)
- [ ] Monster House: room packed with 3-5x enemies, door locks, extra loot
- [ ] Golden Vault: rare golden chest room, higher-tier loot
- [ ] Lost NPC: prisoner/merchant/adventurer, dialog tree, rewards
- [ ] Poison Gas Room: damage per turn, status effect, ventilation switch
- [ ] Future ideas: treasure goblin, healing fountain, collapsed passage, altar, teleport trap

### Equipment & Inventory
- [ ] Equipment slots: weapon, off-hand, armor, helmet, ring, amulet
- [ ] Inventory grid in side panel
- [ ] Stat recalculation on equip change
- [ ] Weight limit system (carry capacity from STR)
- [ ] Shared `tryPickupItem()` for all loot flows

### Player Light Source
- [ ] Torch/lantern with configurable radius
- [ ] Fog visibility scales with light source
- [ ] Stealth tradeoff: light → easier to detect

### Ranged Attacks
- [ ] Support atkRange > 1 (bow, crossbow, thrown)
- [ ] Line-of-sight check
- [ ] Disadvantage at long range / melee range

### AI Improvements
- [ ] Patrol path following
- [ ] Smarter targeting (lowest HP, closest)
- [ ] Enemy flee behavior at low HP
- [ ] Disengage mechanic investigation

---

## Phase 4: Polish & Expansion

### Combat Log
- [ ] Crit display simplification
- [ ] Chest interaction log entries
- [ ] Floor transition log entries
- [ ] NPC dialog in log with 'dialog' category

### Classes & Abilities
- [ ] Wizard, Cleric, Ranger progression
- [ ] Spell slots and casting
- [ ] AoE abilities (fireball, etc.)
- [ ] Healing spells

### Art & VFX
- [ ] DENZI CC0 sprites for items/icons
- [ ] Tiny 16 animated characters
- [ ] DCSS supplemental tiles
- [ ] CobraLad portraits
- [ ] Screen shake on big hits
- [ ] Death animation for enemies
- [ ] Level-up celebration effect
- [ ] Floor theme variations
- [ ] Stealth enter/break animations

### Hunt Quest Expansion
- [ ] `hunt_named` injection into valid depth/theme stage

### Passive System Foundation
- [ ] Define passive schema/triggers/effects
- [ ] Small starter passive set

---

## Testing Priorities
- Contract test for transition keywords (`auto`, `boss`, `town`) ✅
- [x] Triage and fix 23 failing Playwright e2e tests — root cause: broken local Playwright install (BUG-4 resolved 2026-04-18, suite 24/24 green)
- [x] Fix loot gold collection e2e (`combat-attacks.spec.js`, BUG-5 resolved 2026-04-18 — passes with fixed Playwright env)
- [x] Unit tests for run-state scaffold initialization/start-run fields (`tests/unit/sandbox/modloader-run-state.test.js`)
- [x] Unit tests for run planner depth-band deterministic selection and descriptor resolution (`tests/unit/sandbox/modloader-auto-transition.test.js`)
- [x] Unit tests for descriptor-to-stage resolution edge cases (stageOffset, OOB stageIndex, NaN, field priority, self-exclusion, weight=0, fallback chains) — `tests/unit/sandbox/modloader-auto-transition.test.js`
- Unit tests for extraction/death inventory transfer
- [~] E2E: town start → portal → generated stage → auto transition → return town
- E2E: accept side quest → complete → reward on resolution

## Risk Notes
- Avoid overloading null `nextStage` with multiple meanings
- Keep generated progression deterministic per seed
- Don't let camp frequency erase attrition pressure
- Avoid showing actions that aren't functionally implemented

## Non-Goals for MVP
- Full WFC generator
- Giant city/town simulation
- Full NPC economy and reputation web
- General equipment durability
- Fully dynamic primary quest generation
