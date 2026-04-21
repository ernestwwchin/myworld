# Consumables & Town Upgrades Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Consumable Categories

| Type | Examples | Identified? | Use |
|---|---|---|---|
| **Potions** | Healing, Poison, Strength, Fire | No — color-shuffled per save | Drink or throw |
| **Scrolls** | Identify, Fire, Blessing, Teleport | No — name-shuffled per save | Read (consumed) |
| **Throwables** | Bomb, Smoke, Caltrops, Net | Yes — always known | Throw at tile/enemy |
| **Tools** | Synthesis Hammer, Slot Chisel, Lockpick | Yes — always known | Use on item/object |

---

## Identification Pools

Shuffled once per save file. Knowledge persists across runs (Shiren-style).

### Potion Appearance Pool (15 colors → 16 types)

```
COLORS: Blue, Red, Green, Yellow, Purple, Orange, White, Black,
        Pink, Silver, Golden, Murky, Crimson, Emerald, Azure

POSITIVE: Healing (2d8), Greater Healing (4d8), Strength (+2 STR),
          Haste (+1 movement 10 turns), Invisibility (5 turns),
          Resistance (random element), Antidote (cleanse poison/curse)
NEGATIVE: Poison (2d6 + poisoned 3 turns), Confusion (random movement 5 turns),
          Weakness (-2 STR), Blindness (vision=1, 10 turns),
          Rust (★-2 equipped weapon), Amnesia (un-ID one known potion)
WEIRD:    Fire (2d6 self / throw for 2d6 fire), Ice (frozen 2 turns / freeze enemy),
          Levitation (float over traps), Shrink (halve damage dealt/taken)
```

Display: `"Blue Potion ?" × 2` → after ID → `"Healing Potion" × 2`

### Scroll Appearance Pool (15 names → 12 types)

```
NAMES: "Strange Scroll", "Ancient Scroll", "Dusty Scroll",
       "Torn Scroll", "Glowing Scroll", "Faded Scroll",
       "Ornate Scroll", "Charred Scroll", "Sealed Scroll",
       "Runic Scroll", "Tattered Scroll", "Pristine Scroll",
       "Cryptic Scroll", "Weathered Scroll", "Gilded Scroll"

UTILITY:    Identify, Insight (reveal BUC), Blessing, Remove Curse, Mapping
OFFENSIVE:  Fire (3d6 AoE), Lightning (4d6 single), Ice (2d6 + freeze)
MOVEMENT:   Teleport (random tile), Swap (swap position with enemy)
SPECIAL:    Protection (party DR 1 floor), Enchant (★+1 equipped weapon)
```

Display: `"Strange Scroll ?" × 3` → after ID → `"Scroll of Fire" × 3`

### Ring Appearance Pool (8 materials)

```
MATERIALS: Iron, Silver, Gold, Jade, Ruby, Onyx, Crystal, Bone

TYPES: Ring of Haste (+1 movement), Ring of Sight (+2 vision),
       Ring of Strength (+1 STR), Ring of Evasion (+1 DEX saves),
       Ring of Protection (+1 AC), Ring of Regeneration (heal 1/turn),
       Ring of Greed (+10% gold), Ring of Stealth (detect 1 tile later)
```

Display: `"Iron Ring ?"` → after ID → `"Ring of Haste"`

### Amulet Appearance Pool (8 materials)

```
MATERIALS: Wooden, Stone, Glass, Bronze, Pearl, Obsidian, Amber, Coral

TYPES: Amulet of Vitality (+5 max HP), Amulet of Warding (+1 AC),
       Amulet of Greed (+20% gold), Amulet of Stealth (detect 1 tile later),
       Amulet of Clarity (immune to confusion), Amulet of Warmth (immune to freeze),
       Amulet of Warding (+1 saves), Amulet of Light (+1 vision)
```

### Equipment Appearance (not shuffled — family = appearance)

| Item type | Unidentified as | Mystery is |
|---|---|---|
| Weapons | Family name ("a Long Blade ?") | Which weapon in family |
| Armor | Weight class ("Heavy Armor ?") | Which named armor |
| Shields | Weight class ("a Light Shield ?") | Which named shield |

---

## Drop Rates & Stack Sizes

### Base drop rates (per floor)

| Consumable | Drop chance | Stack on drop | Shop price |
|---|---|---|---|
| Potion (random) | ~30% | 1-2 | 50-200g |
| Scroll (random) | ~20% | 1-3 | 100-300g |
| Throwable | ~10% | 1-2 | 75-150g |
| Synthesis Hammer | ~3% | 1 | 500-1000g |
| Slot Chisel | ~10% | 1 | 100-800g (scaling) |

### Drop count scales by world

| World | Potion count | Scroll count | Throwable count |
|---|---|---|---|
| W1 | 1 | 1 | 1 |
| W2 | 1-2 | 1-2 | 1 |
| W3 | 1-2 | 1-2 | 1-2 |
| W4 | 1-3 | 1-3 | 1-2 |
| W5 | 2-3 | 2-3 | 1-3 |

### Base stack limits (before upgrades)

| Type | Base max stack |
|---|---|
| Potions | 5 |
| Scrolls | 5 |
| Throwables | 3 |
| Tools | Don't stack |

### Stacking rules

- Same identified type → stacks normally
- Same unidentified appearance ("Blue Potion ?") → stacks (same appearance = same type)
- Different appearances → separate stacks
- After ID: auto-merges matching stacks

---

## Throwables (Always Identified)

| Throwable | Effect | Range |
|---|---|---|
| Bomb | 3d6 fire, 3×3 AoE, destroys ground items | 5 tiles |
| Smoke Bomb | Block vision 3 turns, 3×3, breaks aggro | 5 tiles |
| Caltrops | Place on tile, 1d6 + slow to enemy that steps on it | 4 tiles |
| Net | Restrain 2 turns (STR save to break) | 4 tiles |
| Holy Water | 3d6 radiant to undead, splash | 5 tiles |
| Acid Flask | ★-1 to target's armor or weapon | 4 tiles |

---

## BUC on Consumables

| State | Potion effect | Scroll effect |
|---|---|---|
| Blessed | Enhanced (heal more, wider) | Enhanced (stronger, all targets) |
| Uncursed | Normal | Normal |
| Cursed | Reduced/reversed | Reduced/reversed/backfires |

### Tool BUC (devastating)

| Tool | Blessed | Cursed |
|---|---|---|
| Synthesis Hammer | Merge AND ★+1 | Merge works but target ★-1 |
| Slot Chisel | +2 slots | REMOVES 1 slot |
| Scroll of Identify | Identify ALL items | Un-identify one known item |

---

## Party Consumable Rules

| Rule | Detail |
|---|---|
| Inventory | Shared — any party member can use any consumable |
| Potions on ally | Administer to adjacent ally (uses your turn) |
| Scrolls | Caster reads (uses their turn) |
| Throwables | Any party member can throw |
| Throw range | 4-6 tiles (varies by throwable) |

---

## Town Upgrades (Persistent Meta-Progression)

Town NPCs offer permanent upgrades bought with gold. Whole party benefits.

### Alchemist (Potions)

| Tier | Cost | Effect |
|---|---|---|
| 1 | 200g | Potion stack +1 (5→6) |
| 2 | 500g | Potion stack +1 (6→7) |
| 3 | 1000g | Potion stack +1 (7→8) |
| 4 | 2000g | Unlock: Blade Coating (apply potion to weapon, next 3 hits) |
| 5 | 5000g | Unlock: Brew potions from ingredients |

### Scribe (Scrolls)

| Tier | Cost | Effect |
|---|---|---|
| 1 | 200g | Scroll stack +1 (5→6) |
| 2 | 500g | Scroll stack +1 (6→7) |
| 3 | 1000g | Scroll stack +1 (7→8) |
| 4 | 2000g | Unlock: Scroll Conservation (INT check DC 12 to preserve scroll on use) |
| 5 | 5000g | Unlock: Copy scroll (2 blank scrolls → 1 duplicate) |

### Armorer (Throwables)

| Tier | Cost | Effect |
|---|---|---|
| 1 | 200g | Throwable stack +1 (3→4) |
| 2 | 500g | Throwable stack +1 (4→5) |
| 3 | 1000g | +1 throw range (all party) |
| 4 | 2000g | Unlock: Craft throwables from materials |
| 5 | 5000g | Throwables deal +1d6 damage |

### Blacksmith (already in equipment file)

- Refine ★ on weapons/armor/shields
- Sell Slot Chisels (1 per run)
- Sell Synthesis Hammers (1 per world)

### Total Gold Sink (Town Upgrades)

| NPC | Total cost |
|---|---|
| Blacksmith (★ refinement) | ~50,000 |
| Alchemist | 8,700 |
| Scribe | 8,700 |
| Armorer | 8,700 |
| **Total** | **~76,000+** |

---

## Class Consumable Passives (Free, Small)

| Class | Passive | Flavor |
|---|---|---|
| Fighter | Can throw while adjacent (no disengage needed) | Martial |
| Rogue | Free potion ID on pickup (WIS check) | Alchemist nose |
| Cleric | Holy Water always blessed in Cleric's hands | Holy |
| Wizard | Free hint about scroll type on pickup | Scholar |

---

## Death Penalty on Consumables

All carried consumables LOST on death. Only stash survives.
Makes hoarding risky — use them or lose them.

---

## YAML Data Model

```yaml
consumable_drops:
  scroll:
    base_chance: 0.20
    count: { min: 1, max: 3 }
    count_scaling: world
    identified: false
    pool: [identify, insight, blessing, remove_curse, fire, lightning, ice, teleport, swap, mapping, protection, enchant]

  potion:
    base_chance: 0.30
    count: { min: 1, max: 2 }
    count_scaling: world
    identified: false
    pool: [healing, greater_healing, strength, haste, invisibility, resistance, antidote, poison, confusion, weakness, blindness, rust, amnesia, fire, ice, levitation, shrink]

  throwable:
    base_chance: 0.10
    count: { min: 1, max: 2 }
    count_scaling: world
    identified: true
    pool: [bomb, smoke_bomb, caltrops, net, holy_water, acid_flask]

id_shuffle:
  scope: per_save          # shuffled once per save, persists across runs
  potion_colors: [blue, red, green, yellow, purple, orange, white, black, pink, silver, golden, murky, crimson, emerald, azure]
  scroll_names: ["Strange Scroll", "Ancient Scroll", "Dusty Scroll", "Torn Scroll", "Glowing Scroll", "Faded Scroll", "Ornate Scroll", "Charred Scroll", "Sealed Scroll", "Runic Scroll", "Tattered Scroll", "Pristine Scroll", "Cryptic Scroll", "Weathered Scroll", "Gilded Scroll"]
  ring_materials: [iron, silver, gold, jade, ruby, onyx, crystal, bone]
  amulet_materials: [wooden, stone, glass, bronze, pearl, obsidian, amber, coral]
```

---

## Open Questions

- Ingredient system for brewing/crafting? (or too complex for now)
- Blank scrolls as a drop? (needed for copy mechanic)
- Can enemies drop consumables on death?
- Shop consumable inventory — random or fixed per visit?
