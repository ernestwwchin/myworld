Unprocessed idea dumps. Drop anything here — bullet lists, chat transcripts, screenshots, half-formed thoughts.

**Flow:** `raw/` → refine into a decision file in `ideas/` → move raw file to `archive/` (marked `status: ingested`).

No quality bar. No formatting required.

---

## W1 Readiness

| Status | Count | Files |
|---|---|---|
| ✅ Complete for W1 | 13 | game-parameters, class-system, ability-system, equipment-system, enemy-scaling, boss-fight, companion-system, consumables, gold-economy, world-progression, ui-system, mod-system, save-system |
| ⏭️ Post-W1 | 2 | identification-system (Phase 2 by own plan), sprite-requirements (P0 = emoji MVP) |
| ⚠️ Has gaps | 4 | inventory-economy (stubs for extraction/gold), run-structure (traps/NPCs/events), world-events (no W1 event YAML), quest-reward-system (no W1 quest list) |

---

## Reading Order (Recommended)

Start with game-parameters.md for the numbers, then read by topic:

### Core Mechanics
1. **game-parameters.md** — Source of truth: all numbers, tables, formulae
2. **class-system-brainstorm.md** — 4 classes, stats, leveling, point-buy, companions
3. **ability-system-brainstorm.md** — Per-encounter/per-rest, spell slots, reactions, inheritance
4. **equipment-system-brainstorm.md** — Weapon families, ★ refinement, +N, synthesis, slots

### Combat & Enemies
5. **enemy-scaling-brainstorm.md** — Enemy HP/AC/damage curves by world
6. **boss-fight-brainstorm.md** — Boss mechanics for 5 worlds
7. **companion-system-brainstorm.md** — Party AI, scaling, auras, rescue

### Items & Economy
8. **consumables-brainstorm.md** — Potions, scrolls, throwables, town upgrades
9. **identification-system-brainstorm.md** — BUC, hidden properties, shuffled names (post-W1)
10. **inventory-economy-brainstorm.md** — Carry/stash, stack limits
11. **gold-economy-brainstorm.md** — Economy balance, gold sinks/sources

### Progression & World
12. **run-structure-brainstorm.md** — Run flow, stages, depth bands
13. **world-progression-brainstorm.md** — World-to-world advancement
14. **world-events-brainstorm.md** — Events, dialogs, story flags
15. **quest-reward-system-brainstorm.md** — Quest types and rewards

### Technical
16. **ui-system-brainstorm.md** — Navigation bar, screen layout, mobile-first 375px
17. **mod-system-brainstorm.md** — 4-tier mods, eval+call execution, status/boost system, resources, encounters, town services, full mod API audit
18. **save-system-brainstorm.md** — Save/load, persistence
19. **sprite-requirements-brainstorm.md** — Asset inventory, P0/P1/P2 priorities, PixelLab pipeline
