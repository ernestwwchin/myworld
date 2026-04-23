# Item & Identification System Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Design

Shiren-style identification. Consumable type hidden behind random colors/names (reshuffled per run or per save). Equipment stats hidden until identified. All dungeon drops are unknown.

---

## Identification Layers

### Equipment (Weapons/Armor/Shield)

```
DUNGEON DROP: "Long Blade ?"       ← everything hidden (type family visible from shape)
IDENTIFIED:   "Longsword +2 ★5 (3 slots) [Fire][ ][ ]"  ← stats revealed
FULLY KNOWN:  "Longsword +2 ★5 (3 slots) [Fire][ ][ ] cursed"  ← BUC revealed
```

What `?` hides on equipment:
- True name (tier, unique name)
- +N enhancement
- ★ refinement
- Number of slots
- Abilities in slots
- BUC state

### Potions

```
UNIDENTIFIED: "Blue Potion ?"     ← color randomized per run/save
IDENTIFIED:   "Healing Potion"    ← all Blue Potions now labeled (class-based)
```

Once ONE blue potion is identified, ALL blue potions are known.

### Scrolls

```
UNIDENTIFIED: "Strange Scroll ?"   ← gibberish/random name per run/save
IDENTIFIED:   "Scroll of Identify" ← all with that fake name now labeled
```

Same as potions — class-based identification.

---

## Identification Methods

| Method | Reveals | Risk | Cost |
|---|---|---|---|
| Equip weapon | ALL stats + BUC | If cursed, stuck (WIS save DC 12 to resist) | Free |
| Drink potion | Type + BUC | If harmful, CON save (success = half effect) | Potion consumed |
| Read scroll | Type + BUC | If harmful, WIS save (success = scroll kept) | Scroll consumed (on fail) |
| Scroll of Identify | Stats + abilities (not BUC) | None | Scroll consumed |
| Scroll of Insight | BUC only | None | Scroll consumed |
| Sage NPC (town) | Everything | None | Gold cost |
| WIS shrine (dungeon) | Type (DC 12 check, partial on fail) | None | One-use |
| INT examine (free action) | Hint only ("harmful/beneficial/???") | None | Free |

---

## Stat Checks for Harmful Items

### Potions: CON Save

```
Drink unknown potion that's harmful:
  CON save DC (scales by world: 10/12/14/16/18)
  Success: "You spit it out." Half effect. Potion still consumed. Item identified.
  Fail: Full effect. Potion consumed. Item identified.
```

### Scrolls: WIS Save

```
Read unknown scroll that's harmful:
  WIS save DC (scales by world)
  Success: "You sense danger, stop reading." Scroll NOT consumed. Item identified.
  Fail: Full effect. Scroll consumed. Item identified.
```

### Cursed Equipment: WIS Save

```
Equip item that's cursed:
  WIS save DC 12
  Success: "You sense something wrong." Weapon NOT equipped. Shown as cursed.
  Fail: Weapon equips. Cursed. Stuck.
```

---

## Stat Roles in Exploration

| Stat | Combat use | Exploration use |
|---|---|---|
| STR | Melee damage, carry weight | Bonus inventory slots, break doors |
| DEX | AC, ranged, initiative | Trap avoidance, stealth |
| CON | HP, concentration | Resist bad potions/fountains |
| INT | Spell damage | Examine items (free hint) |
| WIS | Perception, spell saves | Resist bad scrolls, sense curses, shrine ID |
| CHA | — | NPC prices, quest rewards |

---

## BUC System (Blessed/Uncursed/Cursed)

### States

```
Blessed → (curse attack) → Uncursed → (curse attack) → Cursed
Cursed  → (bless) → Uncursed → (bless) → Blessed
```

### Equipment Effects

| State | Weapon | Armor | Shield |
|---|---|---|---|
| Blessed | +1 damage | +1 AC | +1 AC |
| Uncursed | Normal | Normal | Normal |
| Cursed | -1 to-hit, can't unequip | -1 AC, can't unequip | -1 AC, can't unequip |

Blessed acts as SHIELD against curse: blessed + curse attack → uncursed (not cursed). Insurance.

### Consumable Effects

| State | Potion | Scroll |
|---|---|---|
| Blessed | Enhanced (heal more, wider effect) | Enhanced (stronger, all targets) |
| Uncursed | Normal | Normal |
| Cursed | Reduced/reversed | Reduced/reversed/backfires |

### Consumable Tool BUC (devastating if cursed)

| Item | Blessed | Cursed |
|---|---|---|
| Synthesis Hammer | Merge AND grant ★+1 | Merge works but target loses ★1 |
| Slot Chisel | +2 slots (instead of +1) | REMOVES 1 slot (!!!) |
| Scroll of Identify | Identify ALL items | Un-identifies one random known item |

### Sources

| Bless source | Curse source |
|---|---|
| Scroll of Blessing | Monster attack (Curse Imp, Dark Priest) |
| Blessed Shrine (dungeon event) | Trapped chest |
| Temple (town, gold) | Cursed fountain |
| Blessed Potion (pour on equipment) | Curse Pot (trap) |

### Cleansing

- Temple (town): gold cost
- Scroll of Blessing: one step toward blessed (cursed → uncursed)
- Blessed Shrine: bless all equipped items

---

## Display Notation

```
"a Long Blade ?"                        ← first time seeing this family
"Long Blade ?"                          ← family known, instance unknown
"Longsword +2 ★5 (3 slots) [Fire][ ][ ]"  ← fully identified, uncursed
"Longsword +2 ★5 (3 slots) [Fire][ ][ ] blessed"  ← blessed
"Longsword +2 ★5 (3 slots) [Fire][ ][ ] cursed"   ← cursed

"Blue Potion ?"    ← type unknown
"Healing Potion"   ← identified, uncursed (no mark)
"Healing Potion +" ← identified, blessed
"Healing Potion X" ← identified, cursed
```

The `?` means "something unknown." No `?` = fully safe.

---

## Knowledge Persistence

### Permanent (survives death, survives amnesia)

- Type/family recognition: "I've seen long blades before" (removes "a" prefix)
- Potion color→type mapping: "Blue = Healing" (if per-save persistence)
- Scroll name→type mapping: same

### Per-Instance (per-item, wiped by amnesia)

- Equipment stats (+N, ★, slots, abilities)
- BUC state

### Amnesia Events

| Event | Effect | Severity |
|---|---|---|
| Fog of Amnesia | All inventory items revert to "Type ?" (instance stats hidden) | Medium |
| Curse of Confusion | Appearance-to-type mapping reshuffles. All consumable colors/names randomized again. | Severe |

Equipped gear: ALWAYS unaffected by amnesia (you know what you're wearing).

---

## Potion System

### Colors randomized per run (or per save)

```
Run 1: Blue = Healing, Red = Poison, Green = Strength
Run 2: Blue = Poison, Red = Strength, Green = Healing
```

### Potion Pool

**Positive:**
- Healing (2d8 HP)
- Greater Healing (4d8 HP)
- Strength (+2 STR this run)
- Haste (+1 movement 10 turns)
- Invisibility (5 turns)
- Resistance (random element resist this run)
- Antidote (cleanse poisons/curses)

**Negative:**
- Poison (2d6 damage, poisoned 3 turns)
- Confusion (random movement 5 turns)
- Weakness (-2 STR this run)
- Blindness (vision = 1 tile, 10 turns)
- Rust (equipped weapon ★-2)
- Amnesia (one identified potion becomes unidentified)

**Weird (bad to drink, good to throw):**
- Fire (2d6 fire to self / throw for 2d6 fire + lights tile)
- Ice (frozen 2 turns / freeze enemy 2 turns)
- Levitation (float over traps / enemy can't melee ground)
- Shrink (halve your damage / halve enemy damage)

### BUC on Potions

- Blessed Healing: 4d8 instead of 2d8
- Cursed Healing: 1d4 (barely works)

### Throw Mechanic

Throw potion at enemy → effect applies to them (reversed for buffs).
Safe way to identify without drinking.

---

## Scroll System

### Fake names randomized per run (or per save)

```
"Strange Scroll" = Scroll of Identify (this run)
"Ancient Scroll" = Scroll of Fire (this run)
```

### Scroll Pool

- Scroll of Identify: reveal stats on one item
- Scroll of Insight: reveal BUC on one item
- Scroll of Blessing: bless one item (cursed→uncursed, or uncursed→blessed)
- Scroll of Remove Curse: remove cursed status from equipped item
- Scroll of Fire: deal 3d6 fire to all enemies in room
- Scroll of Teleport: move to random position on floor
- Scroll of Mapping: reveal entire floor layout

### Key Rule: Scrolls Are the "Known" Safety Tool

Potions and weapons are the gamble. Scrolls (once identified) are reliable tools for dealing with unknowns. If scrolls were ALSO unreliable, the player has no grounding.

---

## Monster Curse Attacks

| Monster | Attack | Effect |
|---|---|---|
| Curse Imp | Hex Touch | Curses weapon |
| Dark Priest | Profane Word | Curses armor |
| Specter | Binding Grasp | Curses shield |
| Rust Monster | Corrode | Weapon ★-1 (not curse, direct damage) |
| Curse Pot (trap) | Splash | Curses 1 random equipped item |

Curse monsters are PRIORITY TARGETS. They don't deal HP damage — they deal equipment inconvenience. Changes combat tactics.

---

## Phase Plan

```
PHASE 1 (build first):
  - All items fully visible on pickup. No identification.
  - No BUC system.
  - Potions/scrolls have known effects.
  - Focus: weapon synthesis, refinement, slots, abilities.

PHASE 2 (layer on top):
  - Add identification (equipment stats hidden, potion colors, scroll names)
  - Add BUC system
  - Add harmful abilities pool
  - Add CON/WIS/INT checks
  - Add Sage NPC, Scroll of Identify, Scroll of Insight
  - Add curse monster attacks
  - Add amnesia events
```

Phase 2 is purely additive. Nothing in Phase 1 needs to change.
