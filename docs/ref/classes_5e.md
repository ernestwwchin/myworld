# 5e SRD Classes Reference

Compact reference for 6 core classes, levels 1–12. Each entry includes the project YAML schema equivalent.
Based on the 5e System Reference Document.

**Status legend**: ✅ Implemented | 🔲 Planned

| Class | Hit Die | Primary | Saves | Armor |
|-------|---------|---------|-------|-------|
| Fighter | d10 | STR/CON | STR, CON | All + shields |
| Rogue | d8 | DEX | DEX, INT | Light |
| Wizard | d6 | INT | INT, WIS | None |
| Cleric | d8 | WIS | WIS, CHA | Med + shields |
| Ranger | d10 | DEX/WIS | STR, DEX | Med + shields |
| Barbarian | d12 | STR | STR, CON | Med + shields |

---

## ⚔️ Fighter (Champion) ✅

> Martial weapon master. High HP, armor, and consistent damage output.

| Stat | Value |
|------|-------|
| Hit Die | d10 |
| Primary Ability | STR (or DEX for ranged) |
| Saving Throws | STR, CON |
| Armor | All armor, shields |
| Weapons | Simple + Martial |
| Skill Choices (pick 2) | Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Perception, Survival |

### Features by Level

| Level | Feature | Description |
|-------|---------|-------------|
| 1 | Fighting Style | Choose one: Dueling (+2 dmg 1h), Defense (+1 AC), Great Weapon Fighting (reroll 1-2 on dmg) |
| 1 | Second Wind | Bonus action: heal 1d10 + level. 1/short rest. |
| 2 | Action Surge | Take one additional action. 1/short rest. |
| 3 | Champion Archetype | Improved Critical: crit on 19-20. |
| 4 | ASI | +2 to one ability or +1 to two. |
| 5 | Extra Attack | Attack twice per Attack action. |
| 6 | ASI | +2 to one ability or +1 to two. |
| 7 | Remarkable Athlete | +half prof (round up) to STR/DEX/CON checks without prof. |
| 8 | ASI | +2 to one ability or +1 to two. |
| 9 | Indomitable | Reroll a failed saving throw. 1/long rest. |
| 10 | Additional Fighting Style | Choose a second fighting style. |
| 11 | Extra Attack (2) | Attack three times per Attack action. |
| 12 | ASI | +2 to one ability or +1 to two. |

### Project YAML

```yaml
fighter:
  name: Fighter
  hitDie: 10
  savingThrows: [str, con]
  skillProficiencyCount: 2
  skillProficiencyChoices:
    - acrobatics
    - animalHandling
    - athletics
    - history
    - insight
    - intimidation
    - perception
    - survival
  features:
    1:
      - "Second Wind (1d10+level HP)"
      - "Fighting Style: Dueling (+2 dmg)"
    2:
      - "Action Surge (extra action)"
    3:
      - "Champion Archetype: Improved Critical (19-20)"
    4:
      - "Ability Score Improvement"
    5:
      - "Extra Attack (2 per turn)"
    6:
      - "Ability Score Improvement"
    7:
      - "Remarkable Athlete"
    8:
      - "Ability Score Improvement"
    9:
      - "Indomitable (reroll failed save)"
    10:
      - "Additional Fighting Style"
    11:
      - "Extra Attack (3 per turn)"
    12:
      - "Ability Score Improvement"
```

---

## 🗡️ Rogue (Thief) ✅

> Stealth and precision striker. High skill count, Sneak Attack, evasion.

| Stat | Value |
|------|-------|
| Hit Die | d8 |
| Primary Ability | DEX |
| Saving Throws | DEX, INT |
| Armor | Light armor |
| Weapons | Simple + hand crossbow, longsword, rapier, shortsword |
| Skill Choices (pick 4) | Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Performance, Persuasion, Sleight of Hand, Stealth |

### Features by Level

| Level | Feature | Description |
|-------|---------|-------------|
| 1 | Expertise | Double prof bonus on 2 chosen skills. |
| 1 | Sneak Attack | +1d6 damage when you have advantage or ally adjacent to target. Scales: +1d6 every 2 levels. |
| 1 | Thieves' Cant | Secret language / coded messages. |
| 2 | Cunning Action | Bonus action: Dash, Disengage, or Hide. |
| 3 | Thief Archetype | Fast Hands (bonus action: Use Object, Sleight of Hand, thieves' tools). Second-Story Work (climbing costs no extra movement; running jump + DEX mod ft). |
| 4 | ASI | +2 to one ability or +1 to two. |
| 5 | Uncanny Dodge | Reaction: halve attack damage from attacker you can see. |
| 6 | Expertise (2) | Double prof bonus on 2 more skills. |
| 7 | Evasion | DEX saves: success = 0 damage, fail = half damage. |
| 8 | ASI | +2 to one ability or +1 to two. |
| 9 | Supreme Sneak | Advantage on Stealth if you move no more than half speed. |
| 10 | ASI | +2 to one ability or +1 to two. |
| 11 | Reliable Talent | Minimum 10 on any proficient ability check. |
| 12 | ASI | +2 to one ability or +1 to two. |

### Sneak Attack Scaling

| Level | Dice |
|-------|------|
| 1-2 | 1d6 |
| 3-4 | 2d6 |
| 5-6 | 3d6 |
| 7-8 | 4d6 |
| 9-10 | 5d6 |
| 11-12 | 6d6 |

### Project YAML

```yaml
rogue:
  name: Rogue
  hitDie: 8
  savingThrows: [dex, int]
  skillProficiencyCount: 4
  skillProficiencyChoices:
    - acrobatics
    - athletics
    - deception
    - insight
    - intimidation
    - investigation
    - perception
    - performance
    - persuasion
    - sleightOfHand
    - stealth
  expertiseSkills:
    - stealth
    - sleightOfHand
  features:
    1:
      - "Expertise (master 2 skills)"
      - "Sneak Attack (1d6 bonus dmg)"
    2:
      - "Cunning Action (bonus Dash/Disengage/Hide)"
    3:
      - "Thief Archetype: Fast Hands, Second-Story Work"
    4:
      - "Ability Score Improvement"
    5:
      - "Uncanny Dodge (halve attack dmg, reaction)"
    6:
      - "Expertise (master 2 more skills)"
    7:
      - "Evasion (DEX save: 0 on pass, half on fail)"
    8:
      - "Ability Score Improvement"
    9:
      - "Supreme Sneak (advantage if half speed)"
    10:
      - "Ability Score Improvement"
    11:
      - "Reliable Talent (min 10 on prof checks)"
    12:
      - "Ability Score Improvement"
```

---

## 🔮 Wizard (Evocation) 🔲

> Arcane spellcaster. Massive spell list, fragile, Intelligence-based.

| Stat | Value |
|------|-------|
| Hit Die | d6 |
| Primary Ability | INT |
| Saving Throws | INT, WIS |
| Armor | None |
| Weapons | Dagger, dart, sling, quarterstaff, light crossbow |
| Skill Choices (pick 2) | Arcana, History, Insight, Investigation, Medicine, Religion |

### Features by Level

| Level | Feature | Description |
|-------|---------|-------------|
| 1 | Spellcasting | INT-based. Cantrips + spell slots. Ritual casting. Spellbook. |
| 1 | Arcane Recovery | 1/day after short rest: recover spell slots totaling ≤ half wizard level (round up). |
| 2 | Evocation School | Sculpt Spells: allies auto-succeed on saves vs your evocation spells. |
| 3 | — | 2nd-level spell slots. |
| 4 | ASI | +2 to one ability or +1 to two. |
| 5 | — | 3rd-level spell slots. |
| 6 | Potent Cantrip | Targets that save vs your cantrips still take half damage. |
| 7 | — | 4th-level spell slots. |
| 8 | ASI | +2 to one ability or +1 to two. |
| 9 | — | 5th-level spell slots. |
| 10 | Empowered Evocation | Add INT mod to damage of evocation spells. |
| 11 | — | 6th-level spell slots. |
| 12 | ASI | +2 to one ability or +1 to two. |

### Spell Slots per Level

| Wizard Lvl | 1st | 2nd | 3rd | 4th | 5th | 6th |
|------------|-----|-----|-----|-----|-----|-----|
| 1 | 2 | — | — | — | — | — |
| 2 | 3 | — | — | — | — | — |
| 3 | 4 | 2 | — | — | — | — |
| 4 | 4 | 3 | — | — | — | — |
| 5 | 4 | 3 | 2 | — | — | — |
| 6 | 4 | 3 | 3 | — | — | — |
| 7 | 4 | 3 | 3 | 1 | — | — |
| 8 | 4 | 3 | 3 | 2 | — | — |
| 9 | 4 | 3 | 3 | 3 | 1 | — |
| 10 | 4 | 3 | 3 | 3 | 2 | — |
| 11 | 4 | 3 | 3 | 3 | 2 | 1 |
| 12 | 4 | 3 | 3 | 3 | 2 | 1 |

### Project YAML

```yaml
wizard:
  name: Wizard
  hitDie: 6
  savingThrows: [int, wis]
  skillProficiencyCount: 2
  skillProficiencyChoices:
    - arcana
    - history
    - insight
    - investigation
    - medicine
    - religion
  spellcasting:
    ability: int
    cantripsKnown: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5]
    spellSlots:
      1: [2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
      2: [0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3]
      3: [0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3]
      4: [0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3]
      5: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2]
      6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1]
  features:
    1:
      - "Spellcasting (INT-based)"
      - "Arcane Recovery (recover slots on short rest)"
    2:
      - "Evocation: Sculpt Spells (protect allies)"
    4:
      - "Ability Score Improvement"
    6:
      - "Potent Cantrip (half dmg on save)"
    8:
      - "Ability Score Improvement"
    10:
      - "Empowered Evocation (+INT mod to evocation dmg)"
    12:
      - "Ability Score Improvement"
```

---

## ✝️ Cleric (Life Domain) 🔲

> Divine spellcaster. Healer, medium armor, solid melee backup.

| Stat | Value |
|------|-------|
| Hit Die | d8 |
| Primary Ability | WIS |
| Saving Throws | WIS, CHA |
| Armor | Light, medium armor, shields |
| Weapons | Simple weapons |
| Skill Choices (pick 2) | History, Insight, Medicine, Persuasion, Religion |

### Features by Level

| Level | Feature | Description |
|-------|---------|-------------|
| 1 | Spellcasting | WIS-based. Prepare spells from full cleric list. |
| 1 | Life Domain | Disciple of Life: healing spells heal extra 2 + spell level HP. |
| 1 | Domain Spells | Bless, Cure Wounds (always prepared). |
| 2 | Channel Divinity (1/rest) | Turn Undead: undead within 30 ft must WIS save or flee. Preserve Life: distribute up to 5× cleric level HP among allies within 30 ft. |
| 3 | Domain Spells | Lesser Restoration, Spiritual Weapon. |
| 4 | ASI | +2 to one ability or +1 to two. |
| 5 | Destroy Undead | Turn Undead destroys CR ≤ 1/2. |
| 5 | Domain Spells | Beacon of Hope, Revivify. |
| 6 | Blessed Healer | When you heal others, heal self 2 + spell level. |
| 6 | Channel Divinity (2/rest) | Second use per rest. |
| 7 | Domain Spells | Death Ward, Guardian of Faith. |
| 8 | Divine Strike | +1d8 radiant damage on weapon attacks. |
| 8 | ASI | +2 to one ability or +1 to two. |
| 9 | Domain Spells | Mass Cure Wounds, Raise Dead. |
| 10 | Divine Intervention | Call for divine aid (level % chance). |
| 12 | ASI | +2 to one ability or +1 to two. |

### Project YAML

```yaml
cleric:
  name: Cleric
  hitDie: 8
  savingThrows: [wis, cha]
  skillProficiencyCount: 2
  skillProficiencyChoices:
    - history
    - insight
    - medicine
    - persuasion
    - religion
  spellcasting:
    ability: wis
    preparedCount: "wis_mod + cleric_level"
  features:
    1:
      - "Spellcasting (WIS-based, prepare from full list)"
      - "Life Domain: Disciple of Life (+2+spell lvl healing)"
    2:
      - "Channel Divinity: Turn Undead / Preserve Life"
    4:
      - "Ability Score Improvement"
    5:
      - "Destroy Undead (CR 1/2)"
    6:
      - "Blessed Healer (heal self when healing others)"
    8:
      - "Ability Score Improvement"
      - "Divine Strike (+1d8 radiant on weapon hit)"
    10:
      - "Divine Intervention (level % chance)"
    12:
      - "Ability Score Improvement"
```

---

## 🏹 Ranger (Hunter) 🔲

> Nature warrior. Tracking, ranged combat, light spellcasting.

| Stat | Value |
|------|-------|
| Hit Die | d10 |
| Primary Ability | DEX, WIS |
| Saving Throws | STR, DEX |
| Armor | Light, medium armor, shields |
| Weapons | Simple + Martial |
| Skill Choices (pick 3) | Animal Handling, Athletics, Insight, Investigation, Nature, Perception, Stealth, Survival |

### Features by Level

| Level | Feature | Description |
|-------|---------|-------------|
| 1 | Favored Enemy | Advantage on WIS (Survival) to track, INT checks to recall info about chosen type. |
| 1 | Natural Explorer | Difficult terrain doesn't slow group. Advantage on initiative. Advantage on attacks vs creatures that haven't acted in combat (1st round). |
| 2 | Spellcasting | WIS-based. Known spells (not prepared). |
| 2 | Fighting Style | Archery (+2 ranged attack), Dueling (+2 1h dmg), or Two-Weapon Fighting. |
| 3 | Hunter Archetype | Colossus Slayer: +1d8 dmg vs wounded targets (1/turn). OR Horde Breaker: extra attack vs different adjacent target. |
| 4 | ASI | +2 to one ability or +1 to two. |
| 5 | Extra Attack | Attack twice per Attack action. |
| 6 | Favored Enemy (2) | Choose additional favored enemy type. |
| 7 | Defensive Tactics | Escape the Horde: opportunity attacks against you have disadvantage. |
| 8 | ASI | +2 to one ability or +1 to two. |
| 9 | — | 3rd-level spell slots. |
| 10 | Hide in Plain Sight | Spend 1 min camouflaging: +10 to Stealth while still. |
| 11 | Multiattack | Volley (ranged) or Whirlwind Attack (melee) vs all in range. |
| 12 | ASI | +2 to one ability or +1 to two. |

### Project YAML

```yaml
ranger:
  name: Ranger
  hitDie: 10
  savingThrows: [str, dex]
  skillProficiencyCount: 3
  skillProficiencyChoices:
    - animalHandling
    - athletics
    - insight
    - investigation
    - nature
    - perception
    - stealth
    - survival
  spellcasting:
    ability: wis
    knownSpells: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7]
  features:
    1:
      - "Favored Enemy (advantage on tracking)"
      - "Natural Explorer (no difficult terrain, adv initiative)"
    2:
      - "Spellcasting (WIS-based)"
      - "Fighting Style: Archery (+2 ranged attack)"
    3:
      - "Hunter: Colossus Slayer (+1d8 vs wounded, 1/turn)"
    4:
      - "Ability Score Improvement"
    5:
      - "Extra Attack (2 per turn)"
    6:
      - "Favored Enemy (additional type)"
    7:
      - "Defensive Tactics: Escape the Horde"
    8:
      - "Ability Score Improvement"
    10:
      - "Hide in Plain Sight (+10 Stealth while still)"
    11:
      - "Multiattack (Volley/Whirlwind)"
    12:
      - "Ability Score Improvement"
```

---

## 💪 Barbarian 🔲

> Primal warrior. Rage for damage resistance and bonus, high HP, reckless combat.

| Stat | Value |
|------|-------|
| Hit Die | d12 |
| Primary Ability | STR |
| Saving Throws | STR, CON |
| Armor | Light, medium armor, shields (Unarmored Defense: AC = 10 + DEX + CON) |
| Weapons | Simple + Martial |
| Skill Choices (pick 2) | Animal Handling, Athletics, Intimidation, Nature, Perception, Survival |

### Features by Level

| Level | Feature | Description |
|-------|---------|-------------|
| 1 | Rage | Bonus action: +2 melee damage, resistance to bludg/pierce/slash, advantage on STR checks/saves. Lasts 1 min or until no attack/damage taken. 2/long rest at lvl 1. |
| 1 | Unarmored Defense | AC = 10 + DEX mod + CON mod (no armor). |
| 2 | Reckless Attack | Advantage on STR melee attacks this turn; attacks against you have advantage until next turn. |
| 2 | Danger Sense | Advantage on DEX saves vs effects you can see (traps, spells). |
| 3 | Berserker Path | Frenzy: bonus action melee attack each turn while raging (1 level of exhaustion after). |
| 4 | ASI | +2 to one ability or +1 to two. |
| 5 | Extra Attack | Attack twice per Attack action. |
| 5 | Fast Movement | +10 ft speed while not in heavy armor. |
| 6 | Mindless Rage | Can't be charmed or frightened while raging. |
| 7 | Feral Instinct | Advantage on initiative. Can act normally on surprise round if you rage. |
| 8 | ASI | +2 to one ability or +1 to two. |
| 9 | Brutal Critical | +1 additional damage die on critical hits. |
| 10 | Intimidating Presence | Action: frighten creature within 30 ft (CHA save). |
| 11 | Relentless Rage | Drop to 0 HP while raging: CON save DC 10 → drop to 1 HP instead. DC increases +5 each use. |
| 12 | ASI | +2 to one ability or +1 to two. |

### Rage Scaling

| Level | Rages/Day | Rage Damage |
|-------|-----------|-------------|
| 1-2 | 2 | +2 |
| 3-5 | 3 | +2 |
| 6-8 | 4 | +2 |
| 9-11 | 4 | +3 |
| 12 | 5 | +3 |

### Project YAML

```yaml
barbarian:
  name: Barbarian
  hitDie: 12
  savingThrows: [str, con]
  skillProficiencyCount: 2
  skillProficiencyChoices:
    - animalHandling
    - athletics
    - intimidation
    - nature
    - perception
    - survival
  rage:
    damageBonus: [2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3]
    usesPerDay: [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5]
  features:
    1:
      - "Rage (+2 melee dmg, resistance, adv STR)"
      - "Unarmored Defense (AC = 10 + DEX + CON)"
    2:
      - "Reckless Attack (adv melee, enemies get adv on you)"
      - "Danger Sense (adv DEX saves vs visible effects)"
    3:
      - "Berserker: Frenzy (bonus attack while raging)"
    4:
      - "Ability Score Improvement"
    5:
      - "Extra Attack (2 per turn)"
      - "Fast Movement (+10 ft unarmored)"
    6:
      - "Mindless Rage (immune charm/fear while raging)"
    7:
      - "Feral Instinct (adv initiative, act in surprise)"
    8:
      - "Ability Score Improvement"
    9:
      - "Brutal Critical (+1 die on crits)"
    10:
      - "Intimidating Presence (frighten, CHA save)"
    11:
      - "Relentless Rage (CON save to stay at 1 HP)"
    12:
      - "Ability Score Improvement"
```
