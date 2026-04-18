---
tags: [myworld, roadmap]
status: active
---

# MyWorld RPG — Roadmap

## Anchor: Playable v1

**One complete Goblin Warren run, end-to-end.** Player starts in town → enters portal → traverses 5–10 generated floors → fights a boss on the final floor → wins (or extracts mid-run) → returns to town with banked loot → can start another run. Side-quest board offers 1–2 simple contracts. Shop is functional enough to spend gold.

Everything not on that path is deferred. See "Post-v1 candidates" below.

## Legend
- [ ] Not started · [~] Partial · [x] Done

---

## Phase 1: Foundation (Done)

- Stage transitions, deterministic seed persistence, spawn safety, `nextStage` token resolution
- Town hub with portal + NPCs + dialog actions
- BG3-style turn-based combat with initiative, stealth, room-based joining, loot tables, combat log
- Chest behaviors (standard / locked / trapped scaffolds)
- Run-state scaffold (`runId`, `seed`, `worldId`, `depth`, carried/stash, history)
- Inventory split (carried vs stash) + extraction banking + death loss

---

## Phase 2: Playable v1 (Current)

Sprint goals, ordered. Each one ends in a thing the player notices.

### 1. Map generation good enough for 10 floors
- [x] CA generator wired (`js/mapgen.js`)
- [ ] BSP room+corridor algorithm (better readability than CA for combat)
- [ ] Per-floor difficulty: room count/size scales with depth
- [ ] Auto-place player start + stairs + at least one chest

### 2. Encounter placement
- [ ] Weighted creature pool defined per depth band (already structured in `worlds.yaml`)
- [ ] Density: low/medium/high enemies per floor
- [ ] Floor scaling — deeper floors get more/tougher enemies
- [ ] Group assignment so room-based combat join behaves coherently

### 3. Boss floor + win condition
- [ ] Hand-crafted final stage (Goblin Warren boss + guards)
- [ ] Boss-defeat → "victory" resolution path (carries to town, win screen/dialog)
- [ ] Run history records the win

### 4. Shop (un-stub)
- [ ] Town shop interactable — buy consumables (potions, etc.) + basic gear
- [ ] Sell from carried inventory for gold
- [ ] Shop stock + prices in YAML, refresh between runs

### 5. Side-quest board MVP
- [ ] Quest board interactable — offers 2 contracts per visit
- [ ] Templates: `hunt_cull` (kill N of monster type), `retrieve_item` (find item, return)
- [ ] Accept up to 1 active contract per run; reward on town return

### 6. Run-loop polish
- [ ] Win/loss/extraction screens (currently silent transitions)
- [ ] Floor counter + objective hint in HUD ("Boss: B5", "Quest: 2/3 goblins")
- [ ] One refuge/camp floor mid-run for pacing relief

### 7. v1 content tuning
- [ ] Monster pools balanced: floors 1–4 weak goblins, 5 mini-boss, 6–9 tougher mix, 10 boss
- [ ] Loot tables tuned so the loop produces enough gold to use the shop
- [ ] Starting Fighter kit playable through to boss

---

## Post-v1 candidates

Not on the v1 path. Promote to a phase when v1 ships.

### Content & systems
- Map events: Monster House, Golden Vault, Lost NPC, hazard rooms, treasure goblin, healing fountain
- Mimic creature + chest preset
- Key item system + locked-chest puzzle placement
- Equipment slots, weight limits, full inventory grid
- Player light sources (torch/lantern, fog interplay, stealth tradeoff)
- Ranged attacks (bow/crossbow, LoS, range bands)
- AI: patrols, smarter targeting, enemy flee
- Trap detection (Perception/Investigation)

### Classes & abilities
- Wizard, Cleric, Ranger progression
- Spell slots + casting flow
- AoE abilities (fireball, etc.)
- Healing spells

### Polish
- Crit display, chest log entries, dialog log entries
- Death animation, level-up VFX, screen shake, floor theme variations
- Stealth enter/break animations
- Hunt-quest expansion (`hunt_named` injection)
- Passive system (schema + starter set)

### Long-shot deep-dives (need their own ADR before starting)
- Sprite/sound/music sourcing strategy (buy vs craft, asset criteria)
- Multiple map generators (WFC, hand-stitched rooms)
- Art direction (maps, characters, UI overhaul)
- Backstory + main story + scripted quest framework
- **Framework re-evaluation** (Phaser → alt; 2.5D/3D). Resolve before any heavy art/VFX work.

---

## Deliberately out of v1
- Multiple worlds — only Goblin Warren ships
- Ranged attacks, multiple classes, spell slots
- Map events / mimics / key items
- Equipment slot polish, weight limit
- Art & VFX polish
- Framework re-evaluation

---

## Risk notes
- Avoid overloading null `nextStage` with multiple meanings
- Keep generated progression deterministic per seed
- Don't let camp frequency erase attrition pressure
- Avoid showing actions that aren't functionally implemented (current shop/quest stubs are visible — un-stubbing is a v1 task)
- Tune monster pools before content-balance rework — premature tuning gets wasted on placeholder data

## Non-goals (for v1, possibly forever)
- Full WFC generator
- Giant city/town simulation
- NPC economy and reputation web
- Equipment durability
- Fully dynamic primary quest generation

---

## Testing priorities (v1)
- [x] Run-state scaffold + auto-transition unit tests
- [x] Descriptor resolution edge cases
- [~] E2E: town start → portal → generated stage → auto transition → return town
- [ ] E2E: accept side quest → complete → reward on resolution
- [ ] E2E: full run to boss + win screen
- [ ] E2E: shop buy/sell
- [ ] Unit: extraction/death inventory transfer
