# 5e SRD Weapons Reference

Compact reference for 12 core weapons (simple + martial melee) mapped to the project's `weapons.yaml` schema.
Based on the 5e System Reference Document.

**Status legend**: ✅ Implemented | 🔲 Planned

---

## Weapon Properties

| Property | Effect |
|----------|--------|
| **Finesse** | Use STR or DEX for attack/damage (attacker's choice). |
| **Heavy** | Small creatures have disadvantage on attacks. |
| **Light** | Suitable for two-weapon fighting (bonus action off-hand attack). |
| **Reach** | +5 ft melee range (2 tiles instead of 1). |
| **Thrown** | Can be thrown for ranged attack using same ability modifier. |
| **Two-Handed** | Requires both hands to attack. |
| **Versatile** | Can be used one-handed (listed damage) or two-handed (versatile damage). |

---

## Simple Melee Weapons

### Club 🔲

| Stat | Value |
|------|-------|
| Damage | 1d4 bludgeoning |
| Properties | Light |
| Weight | 2 lb |
| Cost | 1 sp |

```yaml
club:
  name: Club
  category: simple_melee
  damageType: bludgeoning
  damageDice: "1d4"
  range: 1
  properties: [light]
```

### Dagger 🔲

| Stat | Value |
|------|-------|
| Damage | 1d4 piercing |
| Properties | Finesse, Light, Thrown (20/60) |
| Weight | 1 lb |
| Cost | 2 gp |

```yaml
dagger:
  name: Dagger
  category: simple_melee
  damageType: piercing
  damageDice: "1d4"
  range: 1
  rangedRange: 4
  properties: [finesse, light, thrown]
```

### Handaxe 🔲

| Stat | Value |
|------|-------|
| Damage | 1d6 slashing |
| Properties | Light, Thrown (20/60) |
| Weight | 2 lb |
| Cost | 5 gp |

```yaml
handaxe:
  name: Handaxe
  category: simple_melee
  damageType: slashing
  damageDice: "1d6"
  range: 1
  rangedRange: 4
  properties: [light, thrown]
```

### Mace 🔲

| Stat | Value |
|------|-------|
| Damage | 1d6 bludgeoning |
| Properties | — |
| Weight | 4 lb |
| Cost | 5 gp |

```yaml
mace:
  name: Mace
  category: simple_melee
  damageType: bludgeoning
  damageDice: "1d6"
  range: 1
  properties: []
```

### Quarterstaff 🔲

| Stat | Value |
|------|-------|
| Damage | 1d6 bludgeoning (1d8 versatile) |
| Properties | Versatile |
| Weight | 4 lb |
| Cost | 2 sp |

```yaml
quarterstaff:
  name: Quarterstaff
  category: simple_melee
  damageType: bludgeoning
  damageDice: "1d6"
  versatileDice: "1d8"
  range: 1
  properties: [versatile]
```

### Spear 🔲

| Stat | Value |
|------|-------|
| Damage | 1d6 piercing (1d8 versatile) |
| Properties | Thrown (20/60), Versatile |
| Weight | 3 lb |
| Cost | 1 gp |

```yaml
spear:
  name: Spear
  category: simple_melee
  damageType: piercing
  damageDice: "1d6"
  versatileDice: "1d8"
  range: 1
  rangedRange: 4
  properties: [thrown, versatile]
```

---

## Martial Melee Weapons

### Battleaxe 🔲

| Stat | Value |
|------|-------|
| Damage | 1d8 slashing (1d10 versatile) |
| Properties | Versatile |
| Weight | 4 lb |
| Cost | 10 gp |

```yaml
battleaxe:
  name: Battleaxe
  category: martial_melee
  damageType: slashing
  damageDice: "1d8"
  versatileDice: "1d10"
  range: 1
  properties: [versatile]
```

### Longsword ✅

| Stat | Value |
|------|-------|
| Damage | 1d8 slashing (1d10 versatile) |
| Properties | Versatile |
| Weight | 3 lb |
| Cost | 15 gp |

```yaml
longsword:
  name: Longsword
  category: martial_melee
  damageType: slashing
  damageDice: "1d8"
  versatileDice: "1d10"
  range: 1
  properties: [versatile]
```

### Shortsword ✅

| Stat | Value |
|------|-------|
| Damage | 1d6 piercing |
| Properties | Finesse, Light |
| Weight | 2 lb |
| Cost | 10 gp |

```yaml
shortsword:
  name: Shortsword
  category: martial_melee
  damageType: piercing
  damageDice: "1d6"
  range: 1
  properties: [finesse, light]
```

### Greatsword 🔲

| Stat | Value |
|------|-------|
| Damage | 2d6 slashing |
| Properties | Heavy, Two-Handed |
| Weight | 6 lb |
| Cost | 50 gp |

```yaml
greatsword:
  name: Greatsword
  category: martial_melee
  damageType: slashing
  damageDice: "2d6"
  range: 1
  properties: [heavy, two_handed]
```

### Greataxe ✅

| Stat | Value |
|------|-------|
| Damage | 1d12 slashing |
| Properties | Heavy, Two-Handed |
| Weight | 7 lb |
| Cost | 30 gp |

```yaml
greataxe:
  name: Greataxe
  category: martial_melee
  damageType: slashing
  damageDice: "1d12"
  range: 1
  properties: [heavy, two_handed]
```

### Rapier 🔲

| Stat | Value |
|------|-------|
| Damage | 1d8 piercing |
| Properties | Finesse |
| Weight | 2 lb |
| Cost | 25 gp |

```yaml
rapier:
  name: Rapier
  category: martial_melee
  damageType: piercing
  damageDice: "1d8"
  range: 1
  properties: [finesse]
```

---

## Damage Modifier Notes

The `damageDice` in the project's `weapons.yaml` currently bakes in the ability modifier (e.g., `"1d8+3"` for a STR 16 character). The 5e-pure values above list only the weapon's base dice. The ability modifier should be added at runtime based on the wielder's stats:

- **Melee**: + STR mod (or DEX mod if finesse)
- **Ranged**: + DEX mod (or STR mod if thrown)
- **Two-Weapon Fighting**: off-hand doesn't add ability mod to damage (unless Fighting Style)

### Current project convention

```yaml
# Current: modifier baked in
longsword:
  damageDice: "1d8+3"   # includes STR mod

# Recommended future: pure base dice, modifier added at runtime
longsword:
  damageDice: "1d8"
  damageAbility: str     # engine adds mod at runtime
```
