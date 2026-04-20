# 5e SRD Feats Reference

Optional rule: at ASI levels (4, 8, 12, 16, 19), take a feat instead of +2 ability scores.
12 popular feats for a tactical dungeon crawler. Based on the 5e SRD.

**Status**: All 🔲 Planned (feats not yet implemented in engine)

---

## Combat Feats

### Great Weapon Master
- **Prereq**: None
- **Effect**: On crit or kill, bonus action melee attack. Can take -5 attack for +10 damage on heavy weapons.
- **Best for**: Barbarian, Fighter (two-handed)

```yaml
great_weapon_master:
  name: "Great Weapon Master"
  type: passive
  effects:
    - trigger: on_kill_or_crit
      action: bonus_melee_attack
    - trigger: on_attack
      optional: true
      attackPenalty: -5
      damageBonus: 10
      condition: "weapon.properties.includes('heavy')"
```

### Sharpshooter
- **Prereq**: None
- **Effect**: No disadvantage at long range. Ignore half/three-quarter cover. Can take -5 attack for +10 damage on ranged.
- **Best for**: Ranger, Fighter (ranged)

```yaml
sharpshooter:
  name: "Sharpshooter"
  type: passive
  effects:
    - ignoreLongRangePenalty: true
    - ignoreCover: true
    - trigger: on_attack
      optional: true
      attackPenalty: -5
      damageBonus: 10
      condition: "weapon.category.includes('ranged')"
```

### Sentinel
- **Prereq**: None
- **Effect**: On hit with opportunity attack, target's speed → 0. Can opportunity attack even if target Disengages. Reaction attack when enemy attacks ally within 5 ft.
- **Best for**: Fighter, Barbarian (tank)

```yaml
sentinel:
  name: "Sentinel"
  type: passive
  effects:
    - trigger: on_opportunity_attack_hit
      setTargetSpeed: 0
    - ignoreDisengage: true
    - trigger: on_ally_attacked_nearby
      action: reaction_attack
```

### Polearm Master
- **Prereq**: None
- **Effect**: Bonus action d4 attack with butt end of polearm. Opportunity attack when creature enters your reach.
- **Best for**: Fighter, Barbarian

```yaml
polearm_master:
  name: "Polearm Master"
  type: passive
  effects:
    - trigger: turn_end
      action: bonus_attack
      damage: "1d4"
      condition: "weapon.properties.includes('reach') || weapon.id === 'quarterstaff'"
    - trigger: on_enemy_enter_reach
      action: opportunity_attack
```

---

## Defense Feats

### Shield Master
- **Prereq**: None
- **Effect**: Bonus action shove after Attack action. Add shield AC to DEX saves vs single-target effects. On successful DEX save, take 0 damage.
- **Best for**: Fighter (sword & board)

```yaml
shield_master:
  name: "Shield Master"
  type: passive
  condition: "equipment.shield"
  effects:
    - trigger: after_attack_action
      action: bonus_shove
    - dexSaveBonus: "shield.acBonus"
    - trigger: on_dex_save_success
      takeDamage: 0
```

### Tough
- **Prereq**: None
- **Effect**: +2 HP per level (retroactive).
- **Best for**: Everyone, especially low-CON builds

```yaml
tough:
  name: "Tough"
  type: passive
  effects:
    - hpBonusPerLevel: 2
```

### Resilient
- **Prereq**: None
- **Effect**: +1 to chosen ability. Gain proficiency in that ability's saving throw.
- **Best for**: Shoring up weak saves (e.g., Resilient CON for concentration)

```yaml
resilient:
  name: "Resilient"
  type: passive
  chooseAbility: true
  effects:
    - abilityBonus: 1
    - saveProficiency: true
```

---

## Skill / Utility Feats

### Alert
- **Prereq**: None
- **Effect**: +5 initiative. Can't be surprised. Hidden attackers don't get advantage.
- **Best for**: Everyone (especially Rogues, casters)

```yaml
alert:
  name: "Alert"
  type: passive
  effects:
    - initiativeBonus: 5
    - immuneSurprise: true
    - ignoreHiddenAdvantage: true
```

### Lucky
- **Prereq**: None
- **Effect**: 3 luck points per long rest. Spend to reroll any d20 (attack, save, check) or force enemy reroll.
- **Best for**: Everyone

```yaml
lucky:
  name: "Lucky"
  type: passive
  resource:
    name: "Luck Points"
    perLongRest: 3
  effects:
    - trigger: on_any_d20
      optional: true
      action: reroll
      costResource: 1
```

### War Caster
- **Prereq**: Spellcasting
- **Effect**: Advantage on CON saves for concentration. Can cast with hands full. Opportunity attacks can be spells.
- **Best for**: Cleric, Wizard (melee range)

```yaml
war_caster:
  name: "War Caster"
  type: passive
  prereq: { spellcasting: true }
  effects:
    - concentrationAdvantage: true
    - somaticWithHandsFull: true
    - trigger: on_opportunity_attack
      canCastSpell: true
```

### Mobile
- **Prereq**: None
- **Effect**: +10 ft speed. Dash ignores difficult terrain. No opportunity attack from creature you melee attacked this turn.
- **Best for**: Rogue, Monk, melee classes

```yaml
mobile:
  name: "Mobile"
  type: passive
  effects:
    - speedBonus: 1
    - dashIgnoresDifficultTerrain: true
    - trigger: after_melee_attack
      noOpportunityAttackFromTarget: true
```

### Observant
- **Prereq**: None
- **Effect**: +1 INT or WIS. +5 passive Perception and Investigation. Can read lips.
- **Best for**: Scouts, trap detection

```yaml
observant:
  name: "Observant"
  type: passive
  chooseAbility: [int, wis]
  effects:
    - abilityBonus: 1
    - passivePerceptionBonus: 5
    - passiveInvestigationBonus: 5
```

---

## Implementation Notes

Feats are essentially **passives with conditions**. In the engine they would:
1. Live in `public/data/00_core/feats.yaml`
2. Be selected at ASI levels (player chooses feat OR +2 stats)
3. Each feat registers hooks via the existing ability hook system
4. Feats with resources (Lucky) use a per-rest counter

This can be built on top of the hook system — no new engine architecture needed.
