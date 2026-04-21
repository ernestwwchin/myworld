---
tags: [myworld, ideas, items, magic]
created: 2026-04-20
status: open
decision: What persistent power system should the game use?
---

# Open Decision: Power / Item System

> **Key question:** How does the player carry persistent power across runs — and how does that interact with temporary dungeon loot?

## Context

The current game has a simple carried/stash inventory with D&D 5e weapons and items. The extraction/death resolution rules (`worlds.yaml`) handle what's kept vs lost. There is no deeper meta-progression layer yet.

This decision determines whether to add one, and if so, which model.

## What matters for this decision

| Priority | Why |
|---|---|
| **5e compatibility** | The game is built on D&D 5e rules. The power system must not break action economy or make 5e math irrelevant. |
| **Implementation complexity** | Solo dev project. Simpler = ships sooner. |
| **Mod-friendliness** | New powers should be YAML-definable, not hardcoded TS. |
| **Session feel** | Does it enhance the "town → dungeon → town" loop or fight against it? |

---

## The Four Candidate Models

### Model 1: The Soul Alchemist (Distillation)
*Inspired by: Dead Cells / Roguelite meta-progression.*

- **Hook:** Physical items can't pass through the portal. You "eat" items to distill them into permanent Soul Gems.
- **Loop:** Start naked → find gear → success converts gear to permanent Soul Gems → death drops gems at your Grave.
- **Pros:** Clear "naked run" identity. High end-of-run excitement.
- **Cons:** Hard to balance permanent power; power-creep risk.
- **5e fit:** Moderate — gems would layer on top of standard attack/AC math as bonus effects.

### Model 2: The Master Craftsman (Persistence)
*Inspired by: Shiren the Wanderer / Synthesis.*

- **Hook:** You're building one legendary masterpiece over many lives.
- **Loop:** Bring items to town → find Soul Shrines in dungeon → sacrifice items to graft souls onto your main weapon → gems are equippable runes.
- **Pros:** Deep gear attachment. High inventory strategy.
- **Cons:** "Glass cannon" balancing (Lv 1 character vs Lv 100 sword).
- **5e fit:** Low — persistent gear power undermines level-appropriate encounter balance.

### Model 3: The Chaos Vessel (Infinite Synergy)
*Inspired by: Binding of Isaac / Risk of Rain.*

- **Hook:** Your soul is a vacuum. Stack power until you mutate.
- **Loop:** Start naked → no slot limits → 10+ gems stack visually and mechanically (Fire + Ice = Steam) → winning unlocks new items in the global pool.
- **Pros:** Every run unique. Maximum fun factor.
- **Cons:** Extreme coding/VFX complexity. Impossible to balance with 5e math.
- **5e fit:** Very low — infinite stacking breaks bounded accuracy.

### Model 4: The Polished Heir (Rarity Hierarchy)
*Inspired by: Diablo 3 / Modern ARPGs.*

- **Hook:** Simple math, huge impact.
- **Loop:** 3-slot Soul Bar → rarity gates unlock slots (Magic → Rare → Unique → Artifact).
- **Pros:** Very intuitive. Professional power-curve feel.
- **Cons:** Can feel arcade-y, less roguelike.
- **5e fit:** High — rarity tiers map cleanly to 5e magic item tiers (common → legendary).

### Comparison

| Feature | Soul Alchemist | Master Craftsman | Chaos Vessel | Polished Heir |
| :--- | :---: | :---: | :---: | :---: |
| **Start State** | Naked | Gear Kept | Naked | Gear Kept |
| **Power Limit** | 3 Slots | Sockets | Infinite | 4 Slots |
| **Progression** | Persistent Gems | Persistent Gear | Unlocked Pool | Persistent Stats |
| **Complexity** | Medium | High | Extreme | Low |
| **5e Fit** | Moderate | Low | Very Low | High |
| **Core Fun** | Collection | Crafting | Synergy/Luck | Pacing/Loot |

### Model 0: No Meta-Power System
Worth considering: keep the current carried/stash model and add depth through more 5e content (classes, spells, magic items via loot tables) rather than a new system. Lowest risk, lowest novelty.

---

## Detailed Design: Soul Core System (Model 1 variant)

See [soul-core-detail.md](soul-core-detail.md) — a full tactical design for Model 1 including core mechanics, ability pools, and sample YAML data. Only relevant if Model 1 is chosen.

---

## Open Questions

- [ ] Which model best fits the existing D&D 5e + BG3 combat system?
- [ ] Is "Model 0" (no new system, just more 5e content) good enough?
- [ ] Does the "naked run" concept conflict with the current carried/stash inventory model?
- [ ] How does any meta-power system interact with the existing loot-table system?
- [ ] What's the implementation cost vs. gameplay value for a solo dev?
