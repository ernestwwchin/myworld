# Equipment System Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Philosophy

Shiren the Wanderer meets D&D 5e. Persistent weapon investment, synthesis merging, no runes-as-items. Abilities live ON weapons, not in a rune bag.

---

## Equipment Slots

```
3 deep (slots, synthesis, ★refinement, +N, abilities):
  - Main hand (weapon)
  - Off-hand (shield / light weapon / arcane focus)
  - Armor

2 simple (static effect, no growth):
  - Ring
  - Amulet
```

Slots belong to the ITEM, not the position. A dagger with 5 slots has 5 slots whether main or off-hand.

Two-handed weapons compensate for blocking off-hand by having more slots.

### Build Comparison (max slots)

| Build | Weapon | Off-hand | Armor | Total |
|---|---|---|---|---|
| 1H + Shield | max 5 | max 3 | max 4 | 12 |
| Dual wield | max 5 | max 5 | max 4 | 14 (most slots, double investment) |
| Two-handed | max 7 | — | max 4 | 11 (fewest slots, highest base damage, cheapest to invest) |

Trade-off triangle:
- **2H**: Big hits, fewer slots, one weapon to invest
- **Dual wield**: Most slots, two weapons to refine/synthesize (double cost)
- **1H + Shield**: Middle ground + AC bonus

---

## Weapon System

### Two Categories

| Category | Description |
|---|---|
| Base weapon | Longsword, Dagger, Greatsword, etc. No fixed ability. All slots empty. Upgradeable. |
| Unique weapon | Named. Has one fixed (locked) ability occupying a slot. Same growth system otherwise. |

### Weapon Families (Depth-Gated)

No tiers. Each family has multiple named weapons at different power levels. Same combat properties, different base damage and starting slots. What drops where is defined by the map's loot rules — not on the weapon itself.

| Family | Weapon | Base Damage | Properties | Starting Slots | Max Slots |
|---|---|---|---|---|---|
| Long Blade | Longsword | 1d8 | versatile | 2 | 5 |
| | Beam Saber | 1d10 | versatile | 3 | 5 |
| | Plasma Edge | 1d12 | versatile | 4 | 5 |
| Short Knife | Dagger | 1d4 | finesse, light | 2 | 5 |
| | Vibro Knife | 1d6 | finesse, light | 3 | 5 |
| | Phase Blade | 1d8 | finesse, light | 4 | 5 |
| Great Blade | Greatsword | 2d6 | two-handed, heavy | 4 | 7 |
| | Gravity Blade | 2d8 | two-handed, heavy | 5 | 7 |
| | Annihilator | 2d10 | two-handed, heavy | 6 | 7 |
| Blunt | Mace | 1d6 | bludgeoning | 2 | 5 |
| | Thunder Maul | 1d8 | bludgeoning | 3 | 5 |
| | Pulsar Hammer | 1d10 | bludgeoning, two-handed | 4 | 7 |
| Staff | Quarterstaff | 1d6 | versatile | 2 | 5 |
| | Ether Rod | 1d8 | versatile | 3 | 5 |
| | Void Staff | 1d10 | two-handed | 4 | 7 |

Each is a distinct named weapon — not a quality label on the same weapon. "I found a Beam Saber!" not "I found a Superior Longsword."

### Shuffled Identity (Within Families)

All weapons in a family share the same unidentified appearance. Must identify to know which weapon.

```
LONG BLADE FAMILY (versatile):
  "a Long Blade ?" → could be Longsword, Beam Saber, Plasma Edge, or a Unique
  All share versatile property. Mystery is which named weapon.

SHORT KNIFE FAMILY (finesse, light):
  "a Short Knife ?" → could be Dagger, Vibro Knife, Phase Blade, or a Unique

GREAT BLADE FAMILY (two-handed, heavy):
  "a Great Blade ?" → could be Greatsword, Gravity Blade, Annihilator, or a Unique
```

Rule: Family members MUST share the same combat properties. Player always knows playstyle, never knows power until identified.

### Unique Weapons

A unique is just a base weapon with its fixed ability permanently occupying one slot (locked).

```yaml
godslayer:
  type: greatsword       # base weapon determines damage dice
  slots: 2
  maxSlots: 3            # lower max than base weapons (max 5)
  fixedAbility: chain_explosion  # occupies slot 1, can't overwrite
```

- CAN use Slot Chisels — but max slots is lower (2-3, varies per unique vs 5 for base)
- CAN refine ★ at Blacksmith — same ★15 max, same costs. Full growth track.
- Can't increase +N at Blacksmith on uniques (enhancement is drop-only for uniques)
- Synthesize unique INTO base weapon → locked ability becomes normal (transferable)
- Unique used as synthesis fuel → its fixed ability transfers to target
- Trade-off: powerful locked ability + lower slot ceiling vs blank weapon's full 5-slot customization

---

## Dual Growth Tracks

### Enhancement (+N) — D&D Rules

- Max: +3
- Adds to attack roll AND damage
- Found as drops only (not upgradeable at Blacksmith)
- Very rare
- Affected by map events (extremely rare +/-1)

### Refinement (★N) — Shiren Growth

- Range: ★-15 to ★15
- Adds bonus DAMAGE only (not to-hit) for weapons
- Adds DR or DEX save bonus for armor/shields (see Defensive Gear section)
- Negative ★ = PENALTY (reduced damage / reduced defense)
- Upgraded at Blacksmith (gold cost, scaling)
- Transfers fully on synthesis (sum of both, capped at ★-15 to ★15)
- Affected by map events, curses, traps (common +/-1 to +/-3)
- Conversion to damage dice (not flat):

| Refinement | Bonus damage (weapon) |
|---|---|
| ★-15 | -1d10 |
| ★-14 to ★-12 | -1d8 |
| ★-11 to ★-9 | -1d6 |
| ★-8 to ★-6 | -1d4 |
| ★-5 to ★-3 | -1 |
| ★-2 to ★2 | +0 |
| ★3-5 | +1 |
| ★6-8 | +1d4 |
| ★9-11 | +1d6 |
| ★12-14 | +1d8 |
| ★15 | +1d10 |

Negative ★ reduces damage dealt (weapon) or defense (armor). A ★-10 weapon deals 1d6 LESS damage per hit (min 1 total). Makes cursed/trapped gear feel dangerous.

Sources of negative ★:
- Cursed weapon drops (BUC system — cursed items drop at ★-1 to ★-5)
- Floor traps (rust trap: -1 to -3 ★ on equipped gear)
- Monster abilities (rust monster: -1 ★ on hit)
- Failed events / bad gambles

Using dice (not flat) keeps it D&D-native, exciting (variance), and self-balancing.

### Blacksmith ★ Costs

| ★ range | Gold per level |
|---|---|
| ★0-5 | 50-100 |
| ★6-10 | 200-400 |
| ★11-15 | 500-1000 |

Total ★0→★15 ≈ 3,500-5,000 gold per piece. Player has 3 deep pieces (weapon + armor + shield/off-hand) = ~12,000-15,000 gold total. Companions use auto-scaling gear (no ★ investment needed).

---

## Weapon Slots and Abilities

### Slot Rules

- Slots belong to the item. No position caps.
- One-handed weapons: max 5 slots
- Two-handed weapons: max 7 slots (compensates for no off-hand)
- Shield: max 3 slots
- Armor: max 4 slots
- Uniques: 2-3 max (fixed per unique)
- Slot Chisels add +1 slot up to max (common-ish, ~10% per floor, Blacksmith sells one per run)
- ALL equipment (including uniques) can use Slot Chisels — just different max caps
- Abilities live IN slots. No rune inventory. No socketing menu.

### Dual Wield Rules

- Off-hand slot accepts: shield, arcane focus, OR any weapon with `light` property
- Off-hand weapon grants one bonus attack per turn (damage die only, no ability modifier — D&D 5e rules)
- Off-hand weapon uses full normal item rules (★, slots, synthesis, abilities all work)
- Trade-off: double investment (two weapons to refine, synthesize, chisel)

### Titan's Grip (Endgame Ability)

```yaml
titans_grip:
  tier: superior
  effect: "Can equip a two-handed weapon in off-hand (bonus attack with off-hand)"
  tradeoff: null
```

- Endgame (World 4-5, rare)
- Allows dual two-handed: max 7+7+4 = 18 ability slots
- Absurdly expensive to invest (two greatswords to ★15)
- The ultimate glass-cannon power fantasy

### Slot Caps Summary

| Equipment | Starting slots | Max slots |
|---|---|---|
| One-handed weapon (base) | Per weapon type (2-4) | 5 |
| Two-handed weapon (base) | Per weapon type (4-6) | 7 |
| Weapon (unique) | 1-2 (fixed per unique) | 2-3 (fixed per unique) |
| Shield | 2 | 3 |
| Armor | 2-3 | 4 |

### Ability Tiers

| Tier | Effect | Trade-off | Where found |
|---|---|---|---|
| Basic | Small bonus (+1d4 fire, +1 AC, heal 1 on kill) | None | World 1-2 |
| Advanced | Strong (+resist, +vampiric, +crit range) | Yes (-vuln, -AC, -HP) | World 2-4 |
| Superior | Strong (same as Advanced) | None | World 4-5 (rare) |

Progression: Basic (safe) → Advanced (powerful but costly) → Superior (replace the trade-off version).

### Ability Transfer: Synthesis

No runes. Abilities move between weapons ONLY via synthesis.

---

## Synthesis System

### Core Mechanic

Merge weapon B into weapon A. B is destroyed. A inherits B's +N, ★, and abilities.

```
Weapon A: Longsword +1 ★12 (4 slots) [Fire][Crit][ ][ ]
Weapon B: Beam Saber +2 ★8 (3 slots) [Vampiric][ ][ ]

Synthesize A → B (merge INTO higher-base weapon):
Result: Beam Saber +3 ★20 (3 slots) [Fire][Crit][Vampiric]
        Longsword destroyed. Better base, but lost 1 slot.

OR Synthesize B → A (merge INTO higher-slot weapon):
Result: Longsword +3 ★20 (4 slots) [Fire][Crit][Vampiric][ ]
        Beam Saber destroyed. Keep slots, but weaker base.
```

Merge direction matters: better base (fewer slots) vs keep slots (weaker base).

### Transfer Rules

| Attribute | Transfers? |
|---|---|
| +N enhancement | Yes (A's +N + B's +N, capped at +3) |
| Abilities | Yes, fill A's empty slots. Overflow = player picks, rest LOST. |
| Slots | No. A keeps its own slot count. |
| Base weapon type | No. A keeps its own base. |
| ★ Refinement | Yes, fully (A's ★ + B's ★, capped at ★-15 to ★15) |
| Unique locked ability | Yes, becomes unlocked on target. |

### Synthesis Is RARE (Resource-Gated)

Requires a Synthesis Hammer (consumable) OR dungeon Anvil (interactable, one-use).

| Source | Frequency |
|---|---|
| Town shop | 1 per world (expensive, scaling) |
| Floor drop | ~3% per floor (~1 per run) |
| World boss | Guaranteed 1 |
| Dungeon Anvil | ~1 per 8-10 floors (free, one-use) |

Per run estimate: 2-4 total merges. Every merge counts.

### Four Choices on Every Weapon Drop

1. EQUIP it (use as-is)
2. CARRY it (save for merge — costs inventory slot)
3. MERGE it now (if you have Hammer or found Anvil)
4. LEAVE it (not worth the slot)

---

## Slot Chisels (Adding Slots)

| Source | Frequency |
|---|---|
| Blacksmith (town) | 1 per run (scaling gold cost: 100 → 200 → 400 → 800) |
| Floor drop | ~10% per floor (1-2 per run) |
| World boss | Guaranteed 1 |
| Dungeon event | Occasional |

Slots are NOT the bottleneck. Getting slots is common. The bottleneck is:
- Synthesis Hammers (to fill slots with good abilities)
- Finding good abilities on weapons to merge

---

## Weapon Display

```
┌─────────────────────────────────┐
│ Beam Saber +2 ★18               │
│ ─────────────────────────────── │
│ Damage: 1d10 + 2 + 1d6         │
│ To-hit: +2                      │
│ Slots:  [Fire][Vampiric][ ][ ] │
│ Properties: Versatile            │
└─────────────────────────────────┘
```

---

## Death Penalty

- Lose ALL carried inventory items
- Lose 30% of carried gold
- Equipped weapon/armor/shield: KEPT (survives death)
- ★ refinement: kept (on weapon)
- Stash: safe (everything in stash survives)

The risk is carrying unmerged weapons and consumables, not your main build.

---

## Progression Arc (Full Game)

```
WORLD 1:
  Town: Buy Longsword +0 (2 slots)
  Dungeon: Find weapons, start merging abilities, build ★
  End: Longsword +1 ★5 (4 slots) [Poison][ ][ ][ ]

WORLD 2:
  Keep investing. More abilities, more ★.
  End: Longsword +2 ★10 (5 slots) [Poison][Holy][ ][ ][ ]

WORLD 3:
  Find "Long Blade ?" → Identify → Beam Saber (1d10)! The switch moment.
  Synthesize Longsword INTO Beam Saber → ★ stacks (★15 cap), abilities transfer, slots restart.
  Sacrifice first unique for its ability.
  End: Beam Saber +3 ★15 (4 slots) [Poison][Holy][Chain Explosion][ ]
        Need Chisels to rebuild slots.

WORLD 4-5:
  Find Plasma Edge (1d12). Another switch decision.
  Hunt perfect abilities to fill all slots.
  End: Plasma Edge +3 ★15 (5 slots) [5 perfect abilities]
```

The weapon has a biography. Every upgrade is remembered. Every switch is a real decision — better base vs losing slots.

---

## Armor Families

Same model as weapons: named armors within families, map loot table decides drops. Full deep equipment (★, slots, synthesis, abilities).

### Three Weight Classes

| Family | Property | AC Formula | Trade-off |
|---|---|---|---|
| Light Armor | light | base + DEX mod | Full DEX, low base AC |
| Medium Armor | medium | base + DEX (max +2) | Capped DEX, mid base AC |
| Heavy Armor | heavy | base (no DEX) | Highest base AC, stealth disadvantage |

### Named Armors

| Family | Armor | Base AC | Starting Slots | Max Slots |
|---|---|---|---|---|
| Light | Leather | 11 + DEX | 2 | 4 |
| | Synth Weave | 12 + DEX | 3 | 4 |
| | Phase Suit | 13 + DEX | 3 | 4 |
| Medium | Chain Shirt | 13 + DEX(max 2) | 2 | 4 |
| | Scale Mail | 14 + DEX(max 2) | 3 | 4 |
| | Titan Plate | 15 + DEX(max 2) | 3 | 4 |
| Heavy | Ring Mail | 14 | 2 | 4 |
| | Splint | 17 | 3 | 4 |
| | Fortress Plate | 18 | 3 | 4 |

Unidentified: "Light Garb ?", "Medium Armor ?", "Heavy Armor ?"

---

## Shield Families

Shields are full deep equipment — same rules as weapons (★, slots, synthesis, abilities). Oriented toward defense.

### Two Weight Classes

| Family | Shield | Base AC Bonus | Starting Slots | Max Slots |
|---|---|---|---|---|
| Light Shield (no penalty) | Buckler | +1 | 1 | 3 |
| | Force Buckler | +1 | 2 | 3 |
| | Phase Guard | +1 | 3 | 3 |
| Heavy Shield (stealth penalty) | Kite Shield | +2 | 1 | 3 |
| | Tower Shield | +2 | 2 | 3 |
| | Aegis Barrier | +2 | 3 | 3 |

Unidentified: "a Light Shield ?", "a Heavy Shield ?"

Same growth as weapons: ★ refinement, +N enhancement, synthesis, abilities, Slot Chisels.

---

## ★ Refinement on Defensive Gear (Armor + Shield)

★ effect depends on weight class: heavy gear → DR (tank hits), light gear → DEX save bonus (dodge AoE).

### Heavy Gear ★ → Damage Reduction (DR)

Applies to: Heavy Armor, Heavy Shield (Tower Shield family)

| ★ | Effect |
|---|---|
| ★-15 | Vuln: +1d10 extra damage taken |
| ★-14 to ★-12 | Vuln: +1d8 extra damage taken |
| ★-11 to ★-9 | Vuln: +1d6 extra damage taken |
| ★-8 to ★-6 | Vuln: +1d4 extra damage taken |
| ★-5 to ★-3 | Vuln: +1 extra damage taken |
| ★-2 to ★2 | DR 0 |
| ★3-5 | DR 1 |
| ★6-8 | DR 1d4 |
| ★9-11 | DR 1d6 |
| ★12-14 | DR 1d8 |
| ★15 | DR 1d10 |

Negative ★ on heavy armor = you take MORE damage. Makes cursed armor a real threat.

**Stacking rule: armor + shield DR stacks** (both roll). Only achievable with full tank build (heavy armor + heavy shield).

### Light/Medium Gear ★ → DEX Save Bonus

Applies to: Light Armor, Medium Armor, Light Shield (Buckler family)

| ★ | DEX save bonus |
|---|---|
| ★-15 | -5 |
| ★-14 to ★-12 | -4 |
| ★-11 to ★-9 | -3 |
| ★-8 to ★-6 | -2 |
| ★-5 to ★-3 | -1 |
| ★-2 to ★2 | +0 |
| ★3-5 | +1 |
| ★6-8 | +2 |
| ★9-11 | +3 |
| ★12-14 | +4 |
| ★15 | +5 |

### DR Stacking by Build

| Build | DR potential | DEX save bonus |
|---|---|---|
| Light armor + Buckler | 0 | Armor + Shield (stacks) |
| Light armor + Heavy Shield | Shield DR (max 1d10) | Armor only |
| Heavy armor + no shield (2H) | Armor DR (max 1d10) | 0 |
| Heavy armor + Buckler | Armor DR (max 1d10) | Shield only |
| Heavy armor + Heavy Shield | Armor + Shield DR (max 2d10) | 0 — full tank |

Only the full tank commitment (heavy armor + heavy shield) gets double DR. That build sacrifices: DEX to AC, stealth, and offense.

---

## Accessory Design (Ring + Amulet)

Static effect. No growth. No synthesis. Just equip the best one you've found.

| Accessory | Effect |
|---|---|
| Ring of Haste | +1 movement |
| Ring of Sight | +2 vision range |
| Ring of Strength | +1 STR |
| Ring of Evasion | +1 DEX saves |
| Amulet of Vitality | +5 max HP |
| Amulet of Warding | +1 AC |
| Amulet of Greed | +20% gold find |
| Amulet of Stealth | Enemies detect 1 tile later |

One ring + one amulet equipped at a time. Swap freely.

---

## Resistance Rules

- D&D 5e: resistance = half damage (rounded down)
- Resistance from multiple sources does NOT stack (still half, not quarter)
- No equipment-granted immunity (removes challenge)
- Advanced tier resistance abilities come with vulnerability trade-off
- Superior tier resistance abilities have no trade-off (endgame reward)

Example trade-off pairs:
- [Fire Resist] → half fire, BUT cold vulnerability
- [Vampiric] → heal on hit, BUT necrotic vulnerability
- [Physical Resist] → half physical, BUT -1 movement

---

## YAML Data Model Sketch

```yaml
weapon_types:
  # Long Blade family (versatile, one-handed)
  longsword:    { damage: 1d8,  properties: [versatile], family: long_blade, slots: 2, maxSlots: 5 }
  beam_saber:   { damage: 1d10, properties: [versatile], family: long_blade, slots: 3, maxSlots: 5 }
  plasma_edge:  { damage: 1d12, properties: [versatile], family: long_blade, slots: 4, maxSlots: 5 }

  # Short Knife family (finesse, light — can dual wield)
  dagger:       { damage: 1d4,  properties: [finesse, light], family: short_knife, slots: 2, maxSlots: 5 }
  vibro_knife:  { damage: 1d6,  properties: [finesse, light], family: short_knife, slots: 3, maxSlots: 5 }
  phase_blade:  { damage: 1d8,  properties: [finesse, light], family: short_knife, slots: 4, maxSlots: 5 }

  # Great Blade family (two-handed, heavy — more slots, no off-hand)
  greatsword:    { damage: 2d6,  properties: [two-handed, heavy], family: great_blade, slots: 4, maxSlots: 7 }
  gravity_blade: { damage: 2d8,  properties: [two-handed, heavy], family: great_blade, slots: 5, maxSlots: 7 }
  annihilator:   { damage: 2d10, properties: [two-handed, heavy], family: great_blade, slots: 6, maxSlots: 7 }

  # Blunt family (one-handed light, two-handed heavy)
  mace:          { damage: 1d6,  properties: [bludgeoning], family: blunt, slots: 2, maxSlots: 5 }
  thunder_maul:  { damage: 1d8,  properties: [bludgeoning], family: blunt, slots: 3, maxSlots: 5 }
  pulsar_hammer: { damage: 1d10, properties: [bludgeoning, two-handed], family: blunt, slots: 4, maxSlots: 7 }

  # Staff family (versatile / two-handed)
  quarterstaff:  { damage: 1d6,  properties: [versatile], family: staff, slots: 2, maxSlots: 5 }
  ether_rod:     { damage: 1d8,  properties: [versatile], family: staff, slots: 3, maxSlots: 5 }
  void_staff:    { damage: 1d10, properties: [two-handed], family: staff, slots: 4, maxSlots: 7 }

weapon_families:
  long_blade:  { appearance: "Long Blade", properties: [versatile] }
  short_knife: { appearance: "Short Knife", properties: [finesse, light] }
  great_blade: { appearance: "Great Blade", properties: [two-handed, heavy] }
  blunt:       { appearance: "Heavy Club", properties: [bludgeoning] }
  staff:       { appearance: "Staff", properties: [versatile] }

# Loot rules are MAP-DEFINED, not weapon-defined.
# Each stage's loot table controls which weapons can drop.
loot_tables:
  goblin_warren_floor_1:
    weapons: [longsword, dagger, greatsword, mace, quarterstaff]
  goblin_warren_floor_8:
    weapons: [longsword, beam_saber, dagger, vibro_knife, greatsword, gravity_blade]
  crystal_depths_floor_1:
    weapons: [beam_saber, vibro_knife, gravity_blade, thunder_maul, ether_rod]

uniques:
  godslayer:
    type: greatsword
    slots: 2
    fixedAbility: chain_explosion
  soulreaper:
    type: greatsword
    slots: 1
    fixedAbility: soul_harvest

abilities:
  fire:
    tier: basic
    effect: "+1d4 fire damage on hit"
    tradeoff: null
  fire_resist:
    tier: advanced
    effect: "half fire damage"
    tradeoff: "cold vulnerability"
  flame_guard:
    tier: superior
    effect: "half fire damage"
    tradeoff: null
  titans_grip:
    tier: superior
    effect: "Can equip a two-handed weapon in off-hand (bonus attack)"
    tradeoff: null
```
