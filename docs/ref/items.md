# 5e SRD Items & Consumables Reference

Potions, scrolls, adventuring gear, and loot for a tactical dungeon crawler.
Each entry includes the project YAML schema equivalent.
Based on the 5e System Reference Document.

**Status legend**: ✅ Implemented | 🔲 Planned

| Category | Item | Effect | Cost |
|----------|------|--------|------|
| Potion | Healing | Heal 2d4+2 | 50 gp |
| Potion | Greater Healing | Heal 4d4+4 | 100 gp |
| Potion | Antitoxin | Adv vs poison 1hr | 50 gp |
| Potion | Fire Resistance | Resist fire 1hr | 300 gp |
| Potion | Invisibility | Invisible 1hr | 5000 gp |
| Scroll | Cure Wounds (1st) | Cast once | 75 gp |
| Scroll | Fireball (3rd) | Cast once | 300 gp |
| Throwable | Alchemist's Fire | 1d4 fire/turn | 50 gp |
| Throwable | Acid Vial | 2d6 acid | 25 gp |
| Throwable | Holy Water | 2d6 radiant (undead) | 25 gp |
| Throwable | Grease Bottle | Prone, flammable | 30 gp |
| Gear | Torch | Bright light 3 tiles | 0 gp |
| Gear | Rope (50 ft) | Climbing, utility | 1 gp |
| Gear | Thieves' Tools | Pick locks, disarm | 25 gp |
| Gear | Healer's Kit (10) | Stabilize at 0 HP | 5 gp |

---

## Potions

### Potion of Healing 🔲

| Stat | Value |
|------|-------|
| Rarity | Common |
| Action | 1 action (or bonus action in BG3) |
| Effect | Heal 2d4+2 HP |
| Cost | 50 gp |

Variants scale by rarity:

| Potion | Heal | Rarity | Cost |
|--------|------|--------|------|
| Healing | 2d4+2 | Common | 50 gp |
| Greater Healing | 4d4+4 | Uncommon | 100 gp |
| Superior Healing | 8d4+8 | Rare | 500 gp |
| Supreme Healing | 10d4+20 | Very Rare | 5000 gp |

```yaml
potion_healing:
  name: "Potion of Healing"
  type: consumable
  subtype: potion
  rarity: common
  useCost: { bonusAction: 1 }
  effect: heal
  healDice: "2d4+2"
  description: "Regain 2d4+2 hit points."
  cost: 50
  stackable: true

potion_greater_healing:
  name: "Potion of Greater Healing"
  type: consumable
  subtype: potion
  rarity: uncommon
  useCost: { bonusAction: 1 }
  effect: heal
  healDice: "4d4+4"
  description: "Regain 4d4+4 hit points."
  cost: 100
  stackable: true
```

### Antitoxin 🔲

| Stat | Value |
|------|-------|
| Rarity | Common |
| Action | 1 action |
| Effect | Advantage on saves vs poison for 1 hour |
| Cost | 50 gp |

```yaml
antitoxin:
  name: "Antitoxin"
  type: consumable
  subtype: potion
  rarity: common
  useCost: { action: 1 }
  effect: status_apply
  statusId: antitoxin_buff
  duration: 60
  description: "Advantage on saving throws vs poison for 1 hour."
  cost: 50
```

### Potion of Fire Resistance 🔲

| Stat | Value |
|------|-------|
| Rarity | Uncommon |
| Action | 1 action |
| Effect | Resistance to fire damage for 1 hour |
| Cost | 300 gp |

```yaml
potion_fire_resistance:
  name: "Potion of Fire Resistance"
  type: consumable
  subtype: potion
  rarity: uncommon
  useCost: { action: 1 }
  effect: status_apply
  statusId: fire_resistance
  duration: 60
  description: "Resistance to fire damage for 1 hour."
  cost: 300
```

### Potion of Invisibility 🔲

| Stat | Value |
|------|-------|
| Rarity | Very Rare |
| Action | 1 action |
| Effect | Invisible for 1 hour (breaks on attack/spell) |
| Cost | 5000 gp |

```yaml
potion_invisibility:
  name: "Potion of Invisibility"
  type: consumable
  subtype: potion
  rarity: very_rare
  useCost: { action: 1 }
  effect: status_apply
  statusId: invisible
  duration: 60
  breakOnAttack: true
  description: "Become invisible for 1 hour. Breaks on attack or spell cast."
  cost: 5000
```

---

## Scrolls

> Scrolls let any character attempt to cast a spell once. If the spell is on your class list, it works automatically. Otherwise, ability check DC 10 + spell level.

### Spell Scroll 🔲

| Scroll Level | Save DC | Attack Bonus | Cost |
|-------------|---------|--------------|------|
| Cantrip | 13 | +5 | 25 gp |
| 1st | 13 | +5 | 75 gp |
| 2nd | 13 | +5 | 150 gp |
| 3rd | 15 | +7 | 300 gp |

```yaml
scroll_fireball:
  name: "Scroll of Fireball"
  type: consumable
  subtype: scroll
  rarity: uncommon
  useCost: { action: 1 }
  spellId: fireball
  spellLevel: 3
  saveDC: 15
  attackBonus: 7
  description: "Cast Fireball (3rd level) once. Consumed on use."
  cost: 300

scroll_cure_wounds:
  name: "Scroll of Cure Wounds"
  type: consumable
  subtype: scroll
  rarity: common
  useCost: { action: 1 }
  spellId: cure_wounds
  spellLevel: 1
  saveDC: 13
  attackBonus: 5
  description: "Cast Cure Wounds (1st level) once. Consumed on use."
  cost: 75
```

---

## Throwables (BG3-Style)

BG3 adds throwable consumables not in base 5e. Great for tactical grid combat.

### Alchemist's Fire 🔲

| Stat | Value |
|------|-------|
| Rarity | Common |
| Action | 1 action (throw) |
| Range | 20 ft (2 tiles) |
| Effect | 1d4 fire damage per turn; DEX save DC 10 to extinguish |
| Cost | 50 gp |

```yaml
alchemists_fire:
  name: "Alchemist's Fire"
  type: consumable
  subtype: throwable
  rarity: common
  useCost: { action: 1 }
  range: 2
  effect: status_apply
  statusId: burning
  description: "Throw: target takes 1d4 fire per turn. DEX DC 10 to extinguish."
  cost: 50
```

### Acid Vial 🔲

| Stat | Value |
|------|-------|
| Rarity | Common |
| Action | 1 action (throw) |
| Range | 20 ft (2 tiles) |
| Effect | 2d6 acid damage |
| Cost | 25 gp |

```yaml
acid_vial:
  name: "Acid Vial"
  type: consumable
  subtype: throwable
  rarity: common
  useCost: { action: 1 }
  range: 2
  damageDice: "2d6"
  damageType: acid
  description: "Throw: deal 2d6 acid damage to a creature."
  cost: 25
```

### Holy Water 🔲

| Stat | Value |
|------|-------|
| Rarity | Common |
| Action | 1 action (throw) |
| Range | 20 ft (2 tiles) |
| Effect | 2d6 radiant damage to fiend/undead |
| Cost | 25 gp |

```yaml
holy_water:
  name: "Holy Water"
  type: consumable
  subtype: throwable
  rarity: common
  useCost: { action: 1 }
  range: 2
  damageDice: "2d6"
  damageType: radiant
  targetRestriction: [fiend, undead]
  description: "Throw: deal 2d6 radiant damage to undead or fiend."
  cost: 25
```

### Grease Bottle 🔲 (BG3)

| Stat | Value |
|------|-------|
| Rarity | Common |
| Action | 1 action (throw) |
| Range | 20 ft (2 tiles) |
| Area | 2×2 tiles |
| Effect | Creates grease surface. DEX save DC 10 or fall prone. Flammable. |
| Cost | 30 gp |

```yaml
grease_bottle:
  name: "Grease Bottle"
  type: consumable
  subtype: throwable
  rarity: common
  useCost: { action: 1 }
  range: 2
  effect: create_surface
  surface: grease
  areaRadius: 1
  surfaceSave: { stat: dex, dc: 10 }
  surfaceEffect: prone
  flammable: true
  description: "Create grease area. DEX DC 10 or fall prone. Flammable."
  cost: 30
```

---

## Adventuring Gear

### Torch 🔲

| Stat | Value |
|------|-------|
| Light | Bright 20 ft, dim 20 ft further |
| Duration | 1 hour |
| Damage | 1 fire (as improvised weapon) |
| Cost | 1 cp |

```yaml
torch:
  name: "Torch"
  type: gear
  subtype: light_source
  lightRadius: 3
  lightLevel: bright
  duration: 60
  cost: 0
```

### Rope (50 ft) 🔲

| Stat | Value |
|------|-------|
| HP | 2 |
| Break DC | STR 17 |
| Cost | 1 gp |

Useful for climbing, tying, and environmental puzzles.

```yaml
rope:
  name: "Rope (50 ft)"
  type: gear
  subtype: utility
  description: "50 feet of hempen rope."
  cost: 1
```

### Thieves' Tools 🔲

| Stat | Value |
|------|-------|
| Use | Pick locks, disarm traps |
| Check | DEX + proficiency (if proficient) |
| Cost | 25 gp |

Required for Rogues to pick locks and disarm traps.

```yaml
thieves_tools:
  name: "Thieves' Tools"
  type: gear
  subtype: tools
  skillRequired: sleightOfHand
  description: "Pick locks and disarm traps. DEX check + prof if proficient."
  cost: 25
```

### Healer's Kit 🔲

| Stat | Value |
|------|-------|
| Uses | 10 |
| Effect | Stabilize creature at 0 HP (no check needed) |
| Cost | 5 gp |

```yaml
healers_kit:
  name: "Healer's Kit"
  type: gear
  subtype: tools
  uses: 10
  effect: stabilize
  description: "Stabilize a dying creature without a Medicine check."
  cost: 5
```

---

## Keys & Quest Items

Stage-specific items for progression and puzzles.

```yaml
gw_key_01:
  name: "Goblin Warren Key"
  type: key
  description: "A rusty iron key. Opens the exit gate in the Goblin Warren."
  keyId: gw_key_01
  questItem: true

ancient_tome:
  name: "Ancient Tome"
  type: quest
  description: "A dusty book written in an unknown script."
  questItem: true
```

---

## Loot Tables

Define random loot drops per encounter or chest. Modders can customize these in stage YAML.

```yaml
# data/core/loot.yaml (suggested)
lootTables:
  starter_common:
    rolls: 1
    items:
      - { id: potion_healing, weight: 40 }
      - { id: antitoxin, weight: 15 }
      - { id: torch, weight: 20 }
      - { id: gold, amount: "2d6", weight: 25 }

  dungeon_uncommon:
    rolls: 2
    items:
      - { id: potion_healing, weight: 25 }
      - { id: potion_greater_healing, weight: 10 }
      - { id: scroll_cure_wounds, weight: 10 }
      - { id: alchemists_fire, weight: 15 }
      - { id: acid_vial, weight: 10 }
      - { id: gold, amount: "4d6", weight: 30 }

  boss_rare:
    rolls: 3
    guaranteed:
      - potion_greater_healing
    items:
      - { id: potion_fire_resistance, weight: 15 }
      - { id: scroll_fireball, weight: 10 }
      - { id: gold, amount: "8d6+20", weight: 30 }
      - { id: thieves_tools, weight: 10 }
      - { id: healers_kit, weight: 15 }
```

### Loot in Stage YAML

```yaml
# In stage.yaml interactables:
interactables:
  - id: chest_main
    kind: chest
    x: 4
    y: 3
    state:
      opened: false
      lootTable: dungeon_uncommon

# On enemy defeat (in creatures.yaml):
creatures:
  goblin:
    loot:
      table: starter_common
      dropChance: 0.6
```

---

## Item Data Schema (Recommended)

```yaml
# data/core/items.yaml (suggested new file)
items:
  potion_healing:
    name: "Potion of Healing"
    type: consumable
    subtype: potion
    rarity: common
    stackable: true
    maxStack: 10
    useCost: { bonusAction: 1 }
    effect: heal
    healDice: "2d4+2"
    cost: 50
    icon: "🧪"
    description: "A small red vial. Restores 2d4+2 HP."
```

### Inventory Schema (Player Runtime)

```yaml
# Runtime state
inventory:
  - { itemId: potion_healing, count: 3 }
  - { itemId: torch, count: 5 }
  - { itemId: gw_key_01, count: 1 }
gold: 47
```
