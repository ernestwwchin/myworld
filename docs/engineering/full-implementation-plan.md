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

## Phase 1: Wire Engine Into Game (critical path — makes Phase 0 real)

### 1A. Status engine wiring
- [ ] Replace flat `StatusEffect[]` with `StatusInstance[]` (source, stacks, def ref)
- [ ] Wire `StatusEngine.applyStatus()` into `processStatusEffectsForActor()`
- [ ] Wire `StatusEngine.tickStatuses()` into turn_start/turn_end
- [ ] Wire `StatusEngine.removeStatusBySource()` into enemy death cleanup
- [ ] Wire `recalcBoosts()` on apply/remove/equip — cache `actor.derived`
- [ ] Emit `statsChanged` event on boost change → update side panel UI

### 1B. Damage pipeline wiring
- [ ] Wire `resolveDamage()` into `applyDamageToActor()` — type-aware
- [ ] Read `actor.derived.resistances/immunities/vulnerabilities` in damage path
- [ ] Add `actor.derived.damage` bonus to outgoing attacks
- [ ] Float text color by damage type (fire→orange, cold→blue, etc.)

### 1C. useAbility pipeline wiring
- [ ] Wire `useAbility()` into `selectAction()` for Attack/Dash/Hide/Flee
- [ ] Resource check before ability use (canAfford → spend)
- [ ] Wire resource system into turn start (resetResources)
- [ ] Add bonusAction to turn flow (Disengage as bonus action)

### 1D. AI profile wiring
- [ ] Wire `decideAction()` into `combat-ai.ts` enemy turn
- [ ] Read creature `ai.profile` field from YAML
- [ ] Pass creature `abilities[]` to AI decision
- [ ] Wire AI ability use through `useAbility()` pipeline

### 1E. Creature resolver wiring
- [ ] Call `resolveAllCreatures()` in ModLoader during mod load
- [ ] Store resolved creatures in registry (replace raw YAML refs)

### 1F. Event hook wiring (15 trigger points)
- [ ] `on_turn_start` — fire in actorTurn before action
- [ ] `on_turn_end` — fire in actorTurn after action
- [ ] `on_hit` — fire in damage pipeline after hit
- [ ] `on_miss` — fire in damage pipeline after miss
- [ ] `on_kill` — fire when target HP ≤ 0
- [ ] `on_damage_dealt` — fire after damage applied (source side)
- [ ] `on_damage_taken` — fire after damage applied (target side)
- [ ] `on_combat_start` — fire on enterCombat()
- [ ] `on_combat_end` — fire on exitCombat()
- [ ] `on_status_applied` — fire after applyStatus()
- [ ] `on_status_removed` — fire after removeStatus()
- [ ] `on_skill_check` — fire after skill roll
- [ ] Round counter: track `combatRound`, increment on wrap

---

## Phase 2: Encounter System Rework

### 2A. Squad-based encounters
- [ ] New YAML schema: `squad:` with `creatures[]`, `count`, `placement`
- [ ] Squad placement algorithm — match hint → pick room → cluster within 2 tiles
- [ ] Room occupation tracking — avoid stacking squads
- [ ] Backward compat: flat `creature:` format still works
- [ ] Auto-assign `group: squad_N` for room-based combat join

### 2B. Room-aware placement
- [ ] BSP generator returns `rooms[]` with bounds + type
- [ ] Room classification: dead_end, hub, corridor, near_stairs
- [ ] Placement priority: room_near_stairs > room_center > room_dead_end > corridor
- [ ] Overflow to adjacent corridor if room too small
- [ ] Minimum 6-tile distance from playerStart (existing rule)

### 2C. Creature naming (BG3-style)
- [ ] Explicit `name:` in encounter YAML wins
- [ ] Auto-suffix for duplicates: "Goblin A", "Goblin B"
- [ ] No suffix for unique types in combat
- [ ] Suffix assigned at combat start, stable for duration

### 2D. Encounter tables by floor
- [ ] B1F: 2 patrols (2×goblin), 1 camp (3×goblin + shaman), 1 wolf squad
- [ ] B2F: 2 patrols, 1 barracks (warrior+archer), 1 spider nest, 1 captain squad
- [ ] B3F: 1 patrol, 1 shaman circle, 1 spider den, 1 elite guard, 1 ambush
- [ ] B4F: 2 heavy patrols, 1 war camp, 1 spider lair, 1 chief guard, 1 trapper ambush
- [ ] B5F: fixed boss layout — throne guard + gate + Warchief
- [ ] Hidden creature state: `hidden: true` for stealth ambush squads

### 2E. Difficulty budget
- [ ] Formula: `partySize × level × 100 × multiplier`
- [ ] Multipliers: B1F=1.0, B2F=1.5, B3F=2.0, B4F=2.5
- [ ] Creature XP values declared in creatures.yaml

---

## Phase 3: Run Loop Completion (town → floors → boss → town)

### 3A. Boss victory
- [ ] Wire `shouldResolveBossVictory()` into `exitCombat()` — check if bossStage
- [ ] Call `resolveRunOutcome('victory')` after boss defeated
- [ ] Victory screen/dialog before returning to town
- [ ] Record win in run history

### 3B. Player death
- [ ] Implement `handlePlayerDefeat()` — trigger `resolveRunOutcome('death')`
- [ ] Death screen/dialog (show what was lost)
- [ ] Gold loss (30%), item loss per world config
- [ ] Return to town after acknowledgment

### 3C. Run loop polish
- [ ] Floor counter in HUD ("B3F — Bone Warrens")
- [ ] Objective hint if quest active ("Quest: 2/3 goblins")
- [ ] Win/loss/extraction transition screens
- [ ] Run summary on town return (gold earned, enemies killed, floors cleared)

### 3D. Mid-run pacing
- [ ] Camp/refuge floor option (heal, manage inventory, no combat)
- [ ] Extraction via stairs to town (already works) — ensure UI clear

---

## Phase 4: YAML Content — Data-Driven Core

### 4A. Abilities YAML
- [ ] `00_core/abilities.yaml` — all W1 abilities in YAML format
- [ ] Attack, Dash, Disengage, Hide, Flee, Dodge, Help (common)
- [ ] Ability `extends:` inheritance (reuse creature resolver pattern)
- [ ] Ability `actionCost:` field (action / bonusAction / free)
- [ ] Base templates: melee_attack, spell_bolt, spell_aoe, spell_buff
- [ ] ModLoader: load abilities.yaml, merge into ABILITY_DEFS registry

### 4B. Statuses YAML
- [ ] `00_core/statuses.yaml` — all W1 statuses with `boosts:` pipe strings
- [ ] burning, poisoned, bleeding, frozen, stunned, blessed, haste, slow, etc.
- [ ] Status `onTick:`, `onApply:`, `onRemove:` hooks as JS strings
- [ ] Status `stackId`/`stackPriority` for mutual exclusion groups
- [ ] Status `saveToRemove:` for save-to-shake-off
- [ ] ModLoader: load statuses.yaml, merge into STATUS_DEFS registry

### 4C. Creatures YAML update
- [ ] Add `extends:` to goblin variants (goblin_archer extends goblin, etc.)
- [ ] Add `ai: { profile, preferredRange }` to all creatures
- [ ] Add `abilities:` list with trigger conditions
- [ ] Add `resistances:`, `immunities:`, `vulnerabilities:` arrays
- [ ] Add `onHit:` effects (e.g., spider bite → save vs poison)

### 4D. Items YAML update
- [ ] Items reference abilities: scroll `casts:`, potion `casts:`
- [ ] Weapon `weapon_abilities:[]` — granted abilities when equipped
- [ ] Item `onUse:` hook for custom items
- [ ] Throwable items with `throw_casts:` for alt ability

---

## Phase 5: Town Services

### 5A. Stash UI
- [ ] Stash view panel (HTML overlay) — show carried vs stashed
- [ ] Deposit all / withdraw all buttons (wire to scene methods)
- [ ] Individual item move between carried/stash

### 5B. Shop system
- [ ] `shop.yaml` in mod data — item stock, prices, categories
- [ ] Shop browse panel — HTML overlay with gold display
- [ ] Buy item: deduct gold, add to inventory
- [ ] Sold-out graying for unavailable items
- [ ] Restock on extract/new run

### 5C. Quest board MVP
- [ ] Quest data in YAML — templates: hunt_cull, retrieve_item
- [ ] Quest board interactable — show 2 contracts
- [ ] Accept quest → track in runState.acceptedQuests
- [ ] Quest progress tracking (kill count, item found)
- [ ] Quest completion check on town return → reward gold/XP

---

## Phase 6: Map & Terrain

### 6A. BSP room data export
- [ ] BSP generator returns `rooms[]` with `{ x, y, w, h, type, connections }`
- [ ] Room type detection: dead_end (1 connection), hub (3+), corridor
- [ ] Expose rooms to encounter placement system

### 6B. Terrain effects
- [ ] Terrain tile types: fire, water, acid, ice, consecrated
- [ ] Per-tile effect on enter: damage, slow, heal, etc.
- [ ] `spawn_terrain()` functor for abilities (fireball leaves fire)
- [ ] Terrain duration: turns until terrain fades
- [ ] Terrain visual: tile overlay / color tint

### 6C. Tile & sprite rework
- [ ] Tile atlas consolidation (single spritesheet)
- [ ] Per-biome tile themes (warren stone, fungal, bone, deep pit, throne)
- [ ] Door sprites (open/closed/locked states)
- [ ] Chest sprites (open/closed/trapped)
- [ ] Interactable entity sprites (portal, stash, shop, quest board)

---

## Phase 7: Combat UI Polish

### 7A. Ability UI
- [ ] Hotbar tabs: common / class / items
- [ ] Ability range indicator on hover (circle overlay)
- [ ] AOE preview on ability select (sphere/cone/line shapes)
- [ ] Action button graying when resource insufficient
- [ ] Tooltip showing ability name, cost, description

### 7B. Status UI
- [ ] Status icon bar on portraits (player + enemies)
- [ ] Icon rendering: overwrite (1 icon), stack (×N badge), independent (N icons)
- [ ] Duration countdown on each icon
- [ ] Side panel: show AC, movement, saves with `(+2)` boost diffs

### 7C. Combat feedback
- [ ] Damage float text colored by type
- [ ] Projectile tween animations
- [ ] Cast/hit sound hooks from YAML
- [ ] Combat log: status applied/removed messages
- [ ] Combat log: damage type + resistance info

---

## Phase 8: Advanced Systems (post-core, pre-polish)

### 8A. Aura engine
- [ ] Spatial range check per tick — `auraRadius` field
- [ ] Auto-apply child status to actors entering range
- [ ] Auto-remove child status on leaving range
- [ ] Aura source tracking on children
- [ ] Aura cleanup on bearer death
- [ ] Aura circle rendering (translucent overlay)

### 8B. Explore abilities
- [ ] Context menu on entity tap (show available abilities)
- [ ] `targetKind:` filtering (door, chest, NPC, trap)
- [ ] Ability `condition:` eval on entity state
- [ ] Lockpick (DEX vs lockDc), Break door (STR vs breakDc)
- [ ] Check for traps (WIS perception vs trapDc)
- [ ] Disarm trap (DEX vs trapDc, needs detected)
- [ ] Detect magic, Persuade, Steal

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
