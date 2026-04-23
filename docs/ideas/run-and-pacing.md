---
tags: [myworld, ideas, progression, pacing]
created: 2026-04-20
status: open
decision: "Micro-floors vs macro-floors, XP curve, and seed-driven storylines?"
---

# Open Decision: Run Structure & Pacing

> **Key question:** Should a run be 10 small floors (micro) or 3 massive zones (macro)? How does XP scale? Should seeds drive narrative storylines?

## Context

**Current confirmed design** ([story-setting.md](../design/story-setting.md)):
- 10 depth floors per world, boss at depth 5, shrine at depth 10
- `nextStage: auto` resolution via depth bands in `worlds.yaml`
- Existing extraction/death rules: `goldLossPct`, `carriedItemLoss`, `bankCarriedToStash`
- Maps are stage-sized (hand-crafted or generated), not massive open-world

This decision is about whether to **keep that structure** or **replace it** with something larger.

> **Note:** The storyline system (Section 4) is largely **independent** of the micro-vs-macro question. It could layer onto the current 10-floor model with minimal changes.

---

## 1. Run Structure: Three Options

### Option A: Keep Current (10 Micro-Floors)
Maps are stage-sized (~30x40 tiles). Player descends through depth-banded floors.

**This is what's built today.** Pacing could be improved by tagging floors:
- 5 Standard Floors (50%) — basic exploration
- 2 Minor Events (20%) — Black Market, Cursed Shrine
- 1 Major Event (10%) — Prison Rescue (mid-boss)
- 1 Camp Floor (10%) — safe rest stop
- 1 Boss Floor (10%) — finale

**Pros:** Already works. Fast sessions. Easy to balance.
**Cons:** Each floor feels small. Limited exploration freedom.

### Option B: 3 Macro-Floors (New Proposal)
Maps are ~200x200 tiles. A run is 3 massive open-world zones, each 30+ min.

A single macro-floor hosts multiple quests simultaneously:
- Starting Hub (safe drop-in point)
- Central Expanse (standard enemies/chests)
- East Wing (spawns e.g. Black Market blueprint)
- West Wing (spawns e.g. Monster Nest blueprint)
- Northern Gate (locked boss door, requires exploring both wings)

**Pros:** Grand RPG feel (Diablo 2 Acts, BG3 zones). Player agency.
**Cons:** Longer sessions. Needs rest points within floors. **200x200 generation is untested** — current generators work at stage scale.

### Option C: Hybrid (Micro-Floors With Event Zones)
Keep 10-floor descent, but 2–3 floors are larger "event zones" (~80x80) with multiple objectives. Rest are standard size.

**Pros:** Best of both — pacing variety without rewriting the run engine.
**Cons:** Two different floor scales to balance.

### Comparison

| Aspect | A: Micro (current) | B: Macro (new) | C: Hybrid |
|---|---|---|---|
| Session length | ~20 min | ~90 min | ~30 min |
| Map size | 30x40 | 200x200 | 30x40 + 80x80 |
| Events per floor | 0–1 | 2–3 | 0–2 |
| Player agency | Linear | Open | Mixed |
| Implementation | Done | Major rework | Moderate |

---

## 2. Persistence Rules

### What's confirmed today

| Resource | Success (Extract/Victory) | Death |
| :--- | :--- | :--- |
| Gold | `bankCarriedToStash` rule | `goldLossPct` loss |
| Carried items | Moved to stash | `carriedItemLoss` rule |
| Character level | Kept for run | Reset on new run |
| Run state | Cleared | Cleared |

### What these proposals would add

| Resource | Success | Death | Depends on |
| :--- | :--- | :--- | :--- |
| Soul Cores | Returned to stash | Dropped at Grave | [power-system.md](power-system.md) |
| Blueprints | Permanent unlock | Lost if not banked | power-system.md |
| Character XP | Reset to Lv 1 | Reset to Lv 1 | XP curve (below) |

### Corpse Run Mechanic (proposed)
- Death places a Grave Marker holding lost items + portion of gold
- Player respawns at run start, must navigate back to Grave
- **Double-death** before reaching Grave = items gone forever
- **Depends on:** Soul Core system or similar high-value persistent items to make the risk meaningful

### Extraction
- Extract points at zone start and after mini-bosses
- Core tension: "Push deeper for loot, or extract to bank what I have?"
- **Already partially built:** `resolution.extract` rules exist in `worlds.yaml`

### Forward-Only Philosophy
- No backtracking to previous floors/acts in a run
- Neutral merchants in-dungeon so player never needs to return to town mid-run

---

## 3. XP Curve (only relevant if Lv 1→20 per run is adopted)

> **⚠ Conflict:** The current game does not reset to Lv 1 each run. This section assumes a "Macro-Floor" model where you level within a single massive zone. If the current micro-floor structure is kept, XP works differently.

### Zone Heatmap (Radial Difficulty — macro-floor only)

| Distance from Spawn | Enemy Level | Content |
| :--- | :---: | :--- |
| 0–20 tiles (Safe) | 1–2 | Trash mobs |
| 20–50 tiles (Frontier) | 3–8 | Packs, elites |
| 50–100 tiles (Deep) | 9–15 | Ambushes, minibosses |
| Boss Arena | 18–20 | Final challenge |

### Sprint Curve (Lv 1→20 in 20–30 min)
- Lv 1–5 in first 3 minutes
- Lv 10–15 as a steady climb
- Lv 18–20 requires clearing elite camp or miniboss

### XP Model: Relative (not Static)
- A Lv 2 goblin gives 0 XP if player is Lv 10
- Forces player to push deeper for XP
- Prevents farming weak mobs

### Catch-Up Mechanic (Corpse Run)
- Near Grave Marker: "Will of the Ancestors" buff = +500% XP
- Lets player rapidly re-level to previous level on death

---

## 4. Seed-Driven Storylines (independent — works with any run structure)

### Concept
The run seed deterministically selects a **Storyline Theme** that modifies map generation, enemies, events, and boss for the entire run.

**This works with the current 10-floor model today** — the seed just picks which floor types to generate and which boss/events to include.

### Storyline Definition (`storylines.yaml`)

```yaml
storylines:
  - id: the_lost_expedition
    weight: 10
    title: "The Lost Expedition"
    description: "A group of cartographers went missing."
    mapModifiers:
      generator_type: "bsp"
      extra_loops: true
      features: ["campfires", "dead_explorers"]
    encounters:
      boss: "goblin_shaman_corrupted"
      bonus_creature: "scavenger_slime"
    events:
      - floor: 4
        type: "npc_rescue"
        target: "cartographer_npc"

  - id: the_flooded_depths
    weight: 5
    title: "The Flooded Depths"
    description: "The underground rivers have burst."
    mapModifiers:
      generator_type: "cellular_automata"
      water_density: "high"
      bridges: true
    encounters:
      boss: "water_elemental_brute"
```

### Seed Resolution Flow
1. New seed → `ModLoader` deterministically picks storyline from weighted list
2. Town hub updates (quest board shows storyline objective)
3. `mapModifiers` attached to run state → fed to `MapGen.generate`
4. Generator selection, tile replacement, and feature spawning driven by storyline

### Floor Biomes (per-act theming)
- Act 1: Forgotten Mines (dirt, braziers, goblins/spiders)
- Act 2: Flooded Warrens (water, bioluminescence, elementals/slimes)
- Act 3: Warlord's Keep (stone, torchlight, armored orcs + final boss)

### Persistent World State
- Cleared zones stay cleared (no respawn on revisit)
- Death triggers full zone respawn (prevents farming cleared areas)
- Completed quests persist across death
- World reset only on new seed

---

## Open Questions

- [ ] Keep current micro-floors (Option A), go macro (B), or hybrid (C)?
- [ ] Should storylines be the **first** thing implemented from this doc? (Lowest risk, works with current structure)
- [ ] Does Lv 1→20 per run add enough to justify reworking the leveling system?
- [ ] Is corpse run worth the complexity without soul cores to make it high-stakes?
- [ ] Can the generators handle 200x200 if macro-floors are chosen? (Needs technical spike)

## Cross-cutting Pacing Mechanics

These mechanics live in other decision files but directly shape run pacing:

- **Class stat growth** ([class-and-progression.md](class-and-progression.md) Part 1): How quickly STR/DEX/etc. scale per level determines the mid-run power curve.
- **Soul Core level gates** ([soul-core-detail.md](soul-core-detail.md)): If adopted, Lv 10 and Lv 20 ability unlocks create pacing beats — predictable power spikes that structure each run.

## Dependencies

- Persistence rules: partially depend on [power-system.md](power-system.md) (soul cores, blueprints)
- XP curve: only relevant if macro-floor or per-run leveling is adopted
- Storylines: **no dependencies** — can be built incrementally on current architecture
