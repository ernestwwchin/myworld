# 5e SRD Armor & Shields Reference

Armor types, AC calculation, and shields for a tactical dungeon crawler.
Each entry includes the project YAML schema equivalent.
Based on the 5e System Reference Document.

**Status legend**: ✅ Implemented (as AC value) | 🔲 Planned

### Equipment Slots (Future)

| Slot | Examples |
|------|---------|
| Head | Helmet, circlet |
| Armor | Leather, chain mail, plate |
| Cloak | Cloak of protection |
| Amulet | Amulet of health |
| Gloves | Gauntlets of ogre power |
| Main Hand | Longsword, staff |
| Off Hand | Shield, dagger, torch |
| Ring 1 | Ring of protection |
| Ring 2 | Ring of evasion |
| Boots | Boots of speed |

**AC = Armor base + DEX mod (capped by armor type) + Shield bonus**

---

## AC Calculation

| Situation | Formula |
|-----------|---------|
| **Unarmored** | 10 + DEX mod |
| **Light Armor** | Armor base + DEX mod |
| **Medium Armor** | Armor base + DEX mod (max +2) |
| **Heavy Armor** | Armor base (no DEX) |
| **Shield** | +2 AC (stacks with any armor) |
| **Barbarian Unarmored Defense** | 10 + DEX mod + CON mod |
| **Mage Armor (spell)** | 13 + DEX mod |

### Current Project Convention

The project currently stores AC as a flat number in `player.yaml`:

```yaml
equipment:
  ac: 16  # Chain mail (16) or Leather (11 + DEX mod)
```

**Recommended future**: separate armor item with AC calculated at runtime:

```yaml
equipment:
  armor: chain_mail
  shield: false
# Engine calculates: AC = armor.baseAC + min(dexMod, armor.maxDex) + (shield ? 2 : 0)
```

---

## Light Armor

> Full DEX modifier added to AC. No STR requirement. No stealth penalty.

### Padded 🔲

| Stat | Value |
|------|-------|
| AC | 11 + DEX mod |
| Stealth | Disadvantage |
| Weight | 8 lb |
| Cost | 5 gp |

```yaml
padded:
  name: Padded Armor
  category: light
  baseAC: 11
  maxDex: 99
  stealthDisadvantage: true
  cost: 5
```

### Leather 🔲

| Stat | Value |
|------|-------|
| AC | 11 + DEX mod |
| Stealth | — |
| Weight | 10 lb |
| Cost | 10 gp |

```yaml
leather:
  name: Leather Armor
  category: light
  baseAC: 11
  maxDex: 99
  stealthDisadvantage: false
  cost: 10
```

### Studded Leather 🔲

| Stat | Value |
|------|-------|
| AC | 12 + DEX mod |
| Stealth | — |
| Weight | 13 lb |
| Cost | 45 gp |

Best light armor. Ideal for Rogues and DEX-based Fighters/Rangers.

```yaml
studded_leather:
  name: Studded Leather Armor
  category: light
  baseAC: 12
  maxDex: 99
  stealthDisadvantage: false
  cost: 45
```

---

## Medium Armor

> DEX modifier added to AC, capped at +2. Some have stealth disadvantage.

### Hide 🔲

| Stat | Value |
|------|-------|
| AC | 12 + DEX mod (max 2) |
| Stealth | — |
| Weight | 12 lb |
| Cost | 10 gp |

```yaml
hide:
  name: Hide Armor
  category: medium
  baseAC: 12
  maxDex: 2
  stealthDisadvantage: false
  cost: 10
```

### Chain Shirt 🔲

| Stat | Value |
|------|-------|
| AC | 13 + DEX mod (max 2) |
| Stealth | — |
| Weight | 20 lb |
| Cost | 50 gp |

```yaml
chain_shirt:
  name: Chain Shirt
  category: medium
  baseAC: 13
  maxDex: 2
  stealthDisadvantage: false
  cost: 50
```

### Scale Mail 🔲

| Stat | Value |
|------|-------|
| AC | 14 + DEX mod (max 2) |
| Stealth | Disadvantage |
| Weight | 45 lb |
| Cost | 50 gp |

```yaml
scale_mail:
  name: Scale Mail
  category: medium
  baseAC: 14
  maxDex: 2
  stealthDisadvantage: true
  cost: 50
```

### Breastplate 🔲

| Stat | Value |
|------|-------|
| AC | 14 + DEX mod (max 2) |
| Stealth | — |
| Weight | 20 lb |
| Cost | 400 gp |

Best medium armor (no stealth penalty). Ideal for Rangers and Clerics.

```yaml
breastplate:
  name: Breastplate
  category: medium
  baseAC: 14
  maxDex: 2
  stealthDisadvantage: false
  cost: 400
```

### Half Plate 🔲

| Stat | Value |
|------|-------|
| AC | 15 + DEX mod (max 2) |
| Stealth | Disadvantage |
| Weight | 40 lb |
| Cost | 750 gp |

Highest AC medium armor, but stealth penalty.

```yaml
half_plate:
  name: Half Plate
  category: medium
  baseAC: 15
  maxDex: 2
  stealthDisadvantage: true
  cost: 750
```

---

## Heavy Armor

> No DEX modifier. STR requirement or speed reduced by 10 ft. Stealth disadvantage on all.

### Ring Mail 🔲

| Stat | Value |
|------|-------|
| AC | 14 |
| STR Req | — |
| Stealth | Disadvantage |
| Weight | 40 lb |
| Cost | 30 gp |

```yaml
ring_mail:
  name: Ring Mail
  category: heavy
  baseAC: 14
  maxDex: 0
  strRequired: 0
  stealthDisadvantage: true
  cost: 30
```

### Chain Mail 🔲

| Stat | Value |
|------|-------|
| AC | 16 |
| STR Req | 13 |
| Stealth | Disadvantage |
| Weight | 55 lb |
| Cost | 75 gp |

Standard Fighter starting armor.

```yaml
chain_mail:
  name: Chain Mail
  category: heavy
  baseAC: 16
  maxDex: 0
  strRequired: 13
  stealthDisadvantage: true
  cost: 75
```

### Splint 🔲

| Stat | Value |
|------|-------|
| AC | 17 |
| STR Req | 15 |
| Stealth | Disadvantage |
| Weight | 60 lb |
| Cost | 200 gp |

```yaml
splint:
  name: Splint Armor
  category: heavy
  baseAC: 17
  maxDex: 0
  strRequired: 15
  stealthDisadvantage: true
  cost: 200
```

### Plate 🔲

| Stat | Value |
|------|-------|
| AC | 18 |
| STR Req | 15 |
| Stealth | Disadvantage |
| Weight | 65 lb |
| Cost | 1500 gp |

Best armor in the game. Full plate knight.

```yaml
plate:
  name: Plate Armor
  category: heavy
  baseAC: 18
  maxDex: 0
  strRequired: 15
  stealthDisadvantage: true
  cost: 1500
```

---

## Shields

### Shield 🔲

| Stat | Value |
|------|-------|
| AC Bonus | +2 |
| Weight | 6 lb |
| Cost | 10 gp |

Requires one free hand. Can be donned/doffed as an action.

```yaml
shield:
  name: Shield
  category: shield
  acBonus: 2
  cost: 10
```

---

## Armor by Class

| Class | Proficiency | Typical Choice |
|-------|-------------|----------------|
| **Fighter** | All armor, shields | Chain Mail → Plate |
| **Barbarian** | Light, medium, shields (or Unarmored Defense) | Unarmored (high CON) or Half Plate |
| **Ranger** | Light, medium, shields | Studded Leather or Breastplate |
| **Rogue** | Light | Studded Leather |
| **Cleric** | Light, medium, shields (Life: heavy) | Scale Mail + Shield or Chain Mail (Life) |
| **Wizard** | None | Mage Armor spell (13 + DEX) |

---

## Armor Data Schema (Recommended)

```yaml
# data/core/armor.yaml
armor:
  leather:
    name: Leather Armor
    category: light       # light | medium | heavy
    baseAC: 11
    maxDex: 99            # 99 = unlimited, 2 = medium cap, 0 = heavy
    strRequired: 0        # 0 = no requirement
    stealthDisadvantage: false
    cost: 10
    weight: 10

  chain_mail:
    name: Chain Mail
    category: heavy
    baseAC: 16
    maxDex: 0
    strRequired: 13
    stealthDisadvantage: true
    cost: 75
    weight: 55

  shield:
    name: Shield
    category: shield
    acBonus: 2
    cost: 10
    weight: 6
```

### Runtime AC Calculation

```js
function calculateAC(actor, armor, shield, features) {
  // Barbarian Unarmored Defense
  if (!armor && features.includes('Unarmored Defense')) {
    return 10 + dnd.mod(actor.dex) + dnd.mod(actor.con) + (shield ? 2 : 0);
  }
  // No armor
  if (!armor) {
    return 10 + dnd.mod(actor.dex) + (shield ? 2 : 0);
  }
  // Armored
  const dexBonus = Math.min(dnd.mod(actor.dex), armor.maxDex);
  return armor.baseAC + dexBonus + (shield ? shield.acBonus : 0);
}
```
