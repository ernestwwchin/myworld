# World Events & Buffs Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Two Categories of Buffs

### Temporary (run-scoped)

Lasts until run ends (leave dungeon, die, or extract). Common. The dungeon gives power but takes it back.

| Event | Effect | Duration |
|---|---|---|
| Blessed Shrine | +1 to all saves | This run |
| War Drums | +1 damage die tier (d6→d8) | This run |
| Arcane Well | +1 spell slot | This run |
| Iron Skin | +1 AC | This run |
| Blood Pact | +2 damage, -1 AC | This run |
| Swift Blessing | +1 movement tile per turn | This run |
| Eagle Eye | +1 to-hit with ranged | This run |
| Fortify | +1 hit die (extra max HP) | This run |
| Cursed Fog | -1 to-hit | This run (negative) |
| Weakening Aura | -1 damage die tier (d8→d6) | This run (negative) |

### Permanent (forever)

Very rare. Each one is a milestone moment.

| Event | Effect | Rarity | Notes |
|---|---|---|---|
| Ancient Forge | Weapon ★+3 refinement | ~1 per world | |
| Rusted Trap | Weapon ★-2 refinement | ~1 per world | Grindable back at Blacksmith |
| Stat Shrine | +1 to one ability score | 1 per world, choose stat | Hard cap at 20 |
| Heart Crystal | +1 permanent max HP | Uncommon | No limit |
| Skill Book | Learn new weapon property/proficiency | Very rare | |
| Scar of Flame | Permanent fire resistance | Once per element | |

---

## Key Rule: Permanent Negatives Only on Grindable Resources

> If you can earn it back through gameplay → permanent negative OK.
> If you can't → temp or curse-until-cleansed ONLY.

| Resource | Recoverable? | Allow permanent negative? |
|---|---|---|
| ★ Refinement | Yes (Blacksmith, gold) | Yes |
| Weapon abilities | Yes (synthesis from any weapon) | Yes |
| Gold | Yes (enemy drops, chests) | Yes |
| Ability scores (STR, DEX...) | Limited (few shrines) | **No** — cleansable only |
| Weapon slots | Semi-limited (Chisels) | **No** |
| Max HP | Yes (level-ups + Heart Crystals) | Temp/cleansable only |

---

## Curses (Negative States) — Until Cleansed

Persists across runs until actively fixed. NOT permanent. A problem to solve.

| Curse | Effect | Source | Cleanse |
|---|---|---|---|
| Curse of Frailty | -1 CON | Cursed Idol event | Temple (gold) |
| Curse of Weakness | -1 STR | Cursed fountain | Temple (gold) |
| Curse of Poverty | Gold drops halved | Trapped chest | Wears off after 3 floors |
| Curse of Weight | Carry capacity halved | Cursed fountain | Temple or Scroll |
| Curse of Fumble | 5% chance to drop weapon when hit | Cursed weapon (unequipped) | Temple |
| Mark of Prey | One enemy per floor is enraged | World event | Lasts entire run |
| Poison Scar | -1 max HP | Rare trap | Temple or antidote |

---

## Choice Events (Gambles)

Offer permanent buff with risk of permanent (but recoverable) loss:

```
EVENT: Forge of Trials
  "The ancient forge burns with unstable magic."
  [Temper Weapon]  → 70%: ★+5 / 30%: ★-3
  [Walk Away]      → nothing

EVENT: Cursed Fountain
  "The water glows with an unnatural light."
  [Drink]          → 50%: +1 STR / 50%: curse of -1 CON (cleansable)
  [Pour weapon in] → 50%: weapon gains ability / 50%: weapon loses 1 ability
  [Ignore]         → nothing

EVENT: Mysterious Merchant
  "Pay 500 gold for a mystery box."
  Results: Slot Chisel / Synth Hammer / Heart Crystal / Cursed Idol / Nothing
```

---

## Floor Curses (One Floor Duration)

| Curse | Effect | Counter |
|---|---|---|
| Darkness | Vision range halved | Torch consumable |
| Erosion | All equipment loses ★1 on this floor | Rush to stairs |
| Monster House | First room = 6 enemies at once | Prepare AoE |
| Gravity Well | -1 movement per turn | Patience |
| Silence | No abilities or spells this floor | Pure weapon damage |
| Famine | No item drops on this floor | Endure |

---

## World Curses (Permanent World Modifiers)

Progressive difficulty on cleared worlds:

| Curse | Effect | Trigger |
|---|---|---|
| Flooding | Water tiles on 30% of floors in World 1 | After World 1 clear |
| Goblin Revenge | All goblins +1 damage | After killing goblin boss |
| Spreading Corruption | +1 extra enemy per run in World 3 | Progressive |

---

## Map Event Frequency

| Type | Per floor chance | Per run (~12 floors) |
|---|---|---|
| Temp positive | ~20% | 2-3 |
| Temp negative | ~10% | 1-2 |
| Perm positive | ~5% | 0-1 |
| Perm negative (grindable) | ~3% | 0-1 |
| Choice gamble | ~5% | 0-1 |

---

## Good Suffering Design

| Principle | Example |
|---|---|
| Player has a choice | "Drink cursed fountain or walk away" |
| Curse has an upside nearby | "Cursed weapon is powerful BUT..." |
| Cure exists but costs something | "Temple cleanses for 500 gold" |
| Adapting to curse feels clever | "Silence floor? My weapon has high base damage" |
| Temporary curses add variety | "This floor is dark — play differently" |
| Permanent curses have escape valves | "Curse of Weight until cleansed at Temple" |

Best suffering comes from **player choices gone wrong.** "I opened that chest." "I drank that fountain." Player blames themselves, not the game.

---

## Event Sources Summary

| Source | Positive example | Negative example |
|---|---|---|
| Shrine (interact) | +1 stat, bless items, ★+3 | — (shrines are always positive) |
| Fountain (interact, choice) | +1 stat, add ability | Curse, lose ability |
| Trap (hidden, no choice) | — | ★-2, curse equipment, amnesia |
| Chest (choice to open) | Good loot | Trapped: poison, curse, explosion |
| NPC event (scripted) | Stat shrine, Slot Tome, quest reward | — |
| Monster attack (combat) | — | Curse equipment, ★ reduction |
| World event (scripted) | Unique reward, blessing | Progressive world difficulty |
