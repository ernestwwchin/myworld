# 5e SRD Monsters Reference

Compact bestiary of 15 iconic monsters (CR 0–2) for a tactical dungeon crawler.
Each entry includes the project `creatures.yaml` schema equivalent.
Based on the 5e System Reference Document.

**Status legend**: ✅ Implemented | 🔲 Planned

> **CR (Challenge Rating)**: How tough a monster is. CR 1 = fair solo fight for a level 1 party of 4. Lower CR = weaker. Higher CR = stronger.

| CR  | Creature      |  HP | Role          | Status |
|-----|---------------|-----|---------------|--------|
| 0   | Rat           |   1 | Swarm filler  | -      |
| 0   | Bat           |   1 | Ambiance      | -      |
| 1/8 | Kobold        |   5 | Pack tactics  | -      |
| 1/8 | Giant Rat     |   7 | Disease       | -      |
| 1/4 | Goblin        |   7 | Ambusher      | done   |
| 1/4 | Skeleton      |  13 | Undead melee  | done   |
| 1/4 | Zombie        |  22 | Undead tank   | -      |
| 1/4 | Wolf          |  11 | Knockdown     | -      |
| 1/2 | Orc           |  15 | Charger       | done   |
| 1/2 | Hobgoblin     |  11 | Disciplined   | -      |
| 1/2 | Shadow        |  16 | STR drain     | -      |
| 1   | Bugbear       |  27 | Surprise hit  | -      |
| 1   | Ghoul         |  22 | Paralyze      | -      |
| 1   | Giant Spider  |  26 | Poison + web  | -      |
| 2   | Ogre          |  59 | Heavy hitter  | -      |
| 2   | Mimic         |  58 | Ambush chest  | -      |

---

## CR 0

### Rat 🔲

> Tiny beast. Swarm filler, negligible threat alone.

| Stat | Value |
|------|-------|
| HP | 1 (1d4 − 1) |
| AC | 10 |
| Speed | 20 ft (1 tile) |
| STR 2 | DEX 11 | CON 9 | INT 2 | WIS 10 | CHA 4 |
| Senses | Darkvision 30 ft |
| XP | 10 |

**Bite**: +0 to hit, 1 piercing damage.
**Keen Smell**: Advantage on WIS (Perception) checks using smell.

```yaml
rat:
  name: Rat
  type: rat
  cr: "0"
  xp: 10
  hp: 1
  ac: 10
  speed: 1
  sight: 3
  fov: 360
  stats: { str: 2, dex: 11, con: 9, int: 2, wis: 10, cha: 4 }
  attack: { dice: "1d1", range: 1 }
```

### Bat 🔲

> Tiny beast. Blind sense, negligible damage, ambiance creature.

| Stat | Value |
|------|-------|
| HP | 1 (1d4 − 1) |
| AC | 12 |
| Speed | 5 ft / fly 30 ft (1 tile) |
| STR 2 | DEX 15 | CON 8 | INT 2 | WIS 12 | CHA 4 |
| Senses | Blindsight 60 ft |
| XP | 10 |

**Bite**: +0 to hit, 1 piercing damage.
**Echolocation**: Can't use blindsight while deafened.

```yaml
bat:
  name: Bat
  type: bat
  cr: "0"
  xp: 10
  hp: 1
  ac: 12
  speed: 1
  sight: 5
  fov: 360
  stats: { str: 2, dex: 15, con: 8, int: 2, wis: 12, cha: 4 }
  attack: { dice: "1d1", range: 1 }
```

---

## CR 1/8

### Kobold 🔲

> Small humanoid. Pack tactics, low HP, annoying in groups.

| Stat | Value |
|------|-------|
| HP | 5 (2d6 − 2) |
| AC | 12 |
| Speed | 30 ft (2 tiles) |
| STR 7 | DEX 15 | CON 9 | INT 8 | WIS 7 | CHA 8 |
| Senses | Darkvision 60 ft |
| XP | 25 |

**Dagger**: +4 to hit, 1d4+2 piercing.
**Sling**: +4 to hit, range 30/120 ft, 1d4+2 bludgeoning.
**Sunlight Sensitivity**: Disadvantage on attacks and perception in sunlight.
**Pack Tactics**: Advantage on attack if ally is within 5 ft of target.

```yaml
kobold:
  name: Kobold
  type: kobold
  cr: "1/8"
  xp: 25
  hp: 5
  ac: 12
  speed: 2
  sight: 5
  fov: 120
  stats: { str: 7, dex: 15, con: 9, int: 8, wis: 7, cha: 8 }
  attack: { weaponId: dagger, dice: "1d4+2", range: 1 }
  ai: { packTactics: true }
```

### Giant Rat 🔲

> Small beast. Disease carrier, dungeon staple.

| Stat | Value |
|------|-------|
| HP | 7 (2d6) |
| AC | 12 |
| Speed | 30 ft (2 tiles) |
| STR 7 | DEX 15 | CON 11 | INT 2 | WIS 10 | CHA 4 |
| Senses | Darkvision 60 ft |
| XP | 25 |

**Bite**: +4 to hit, 1d4+2 piercing.
**Keen Smell**: Advantage on WIS (Perception) checks using smell.
**Pack Tactics**: Advantage on attack if ally within 5 ft of target.

```yaml
giant_rat:
  name: Giant Rat
  type: giant_rat
  cr: "1/8"
  xp: 25
  hp: 7
  ac: 12
  speed: 2
  sight: 5
  fov: 360
  stats: { str: 7, dex: 15, con: 11, int: 2, wis: 10, cha: 4 }
  attack: { dice: "1d4+2", range: 1 }
  ai: { packTactics: true }
```

---

## CR 1/4

### Goblin ✅

> Small humanoid. Nimble Escape, ambush predator.

| Stat | Value |
|------|-------|
| HP | 7 (2d6) |
| AC | 15 (leather + shield) |
| Speed | 30 ft (2 tiles) |
| STR 8 | DEX 14 | CON 10 | INT 10 | WIS 8 | CHA 8 |
| Skills | Stealth +6 |
| Senses | Darkvision 60 ft |
| XP | 50 |

**Scimitar**: +4 to hit, 1d6+2 slashing.
**Shortbow**: +4 to hit, range 80/320, 1d6+2 piercing.
**Nimble Escape**: Disengage or Hide as bonus action.

```yaml
goblin:
  name: Goblin
  type: goblin
  cr: "1/4"
  xp: 50
  hp: 7
  ac: 15
  speed: 2
  sight: 4
  fov: 120
  stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }
  skillProficiencies: [stealth, perception]
  attack: { weaponId: scimitar, dice: "1d6+2", range: 1 }
```

### Skeleton ✅

> Undead. Immune to poison/exhaustion, mindless but obedient.

| Stat | Value |
|------|-------|
| HP | 13 (2d8 + 4) |
| AC | 13 (armor scraps) |
| Speed | 30 ft (2 tiles) |
| STR 10 | DEX 14 | CON 15 | INT 6 | WIS 8 | CHA 5 |
| Vulnerabilities | Bludgeoning |
| Immunities | Poison; poisoned, exhaustion |
| Senses | Darkvision 60 ft |
| XP | 50 |

**Shortsword**: +4 to hit, 1d6+2 piercing.
**Shortbow**: +4 to hit, range 80/320, 1d6+2 piercing.

```yaml
skeleton:
  name: Skeleton
  type: skeleton
  cr: "1/4"
  xp: 100
  hp: 13
  ac: 13
  speed: 2
  sight: 5
  fov: 100
  stats: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 }
  attack: { weaponId: shortsword, dice: "1d6+2", range: 1 }
```

### Zombie 🔲

> Undead. Slow but tough. Undead Fortitude makes them hard to finish.

| Stat | Value |
|------|-------|
| HP | 22 (3d8 + 9) |
| AC | 8 |
| Speed | 20 ft (1 tile) |
| STR 13 | DEX 6 | CON 16 | INT 3 | WIS 6 | CHA 5 |
| Immunities | Poison; poisoned |
| Senses | Darkvision 60 ft |
| XP | 50 |

**Slam**: +3 to hit, 1d6+1 bludgeoning.
**Undead Fortitude**: If reduced to 0 HP by non-radiant/non-crit, CON save DC 5+damage. On success, drop to 1 HP instead.

```yaml
zombie:
  name: Zombie
  type: zombie
  cr: "1/4"
  xp: 50
  hp: 22
  ac: 8
  speed: 1
  sight: 4
  fov: 120
  stats: { str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5 }
  attack: { dice: "1d6+1", range: 1 }
  ai: { undeadFortitude: true }
```

### Wolf 🔲

> Medium beast. Pack tactics + knockdown bite.

| Stat | Value |
|------|-------|
| HP | 11 (2d8 + 2) |
| AC | 13 (natural) |
| Speed | 40 ft (3 tiles) |
| STR 12 | DEX 15 | CON 12 | INT 3 | WIS 12 | CHA 6 |
| Skills | Perception +3, Stealth +4 |
| XP | 50 |

**Bite**: +4 to hit, 2d4+2 piercing. Target must STR DC 11 save or be knocked prone.
**Keen Hearing and Smell**: Advantage on WIS (Perception) using hearing or smell.
**Pack Tactics**: Advantage if ally within 5 ft.

```yaml
wolf:
  name: Wolf
  type: wolf
  cr: "1/4"
  xp: 50
  hp: 11
  ac: 13
  speed: 3
  sight: 5
  fov: 180
  stats: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }
  skillProficiencies: [perception, stealth]
  attack: { dice: "2d4+2", range: 1 }
  ai: { packTactics: true }
```

---

## CR 1/2

### Orc ✅

> Medium humanoid. Aggressive charger, hits hard.

| Stat | Value |
|------|-------|
| HP | 15 (2d8 + 6) |
| AC | 13 (hide armor) |
| Speed | 30 ft (2 tiles) |
| STR 16 | DEX 12 | CON 16 | INT 7 | WIS 11 | CHA 10 |
| Skills | Intimidation +2 |
| Senses | Darkvision 60 ft |
| XP | 100 |

**Greataxe**: +5 to hit, 1d12+3 slashing.
**Javelin**: +5 to hit, range 30/120, 1d6+3 piercing.
**Aggressive**: Bonus action: move up to speed toward hostile creature you can see.

```yaml
orc:
  name: Orc
  type: orc
  cr: "1/2"
  xp: 200
  hp: 15
  ac: 13
  speed: 2
  sight: 6
  fov: 140
  stats: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 }
  attack: { weaponId: greataxe, dice: "1d12+3", range: 1 }
  ai: { aggressive: true }
```

### Hobgoblin 🔲

> Medium humanoid. Disciplined, martial advantage in formation.

| Stat | Value |
|------|-------|
| HP | 11 (2d8 + 2) |
| AC | 18 (chain mail + shield) |
| Speed | 30 ft (2 tiles) |
| STR 13 | DEX 12 | CON 12 | INT 10 | WIS 10 | CHA 9 |
| Senses | Darkvision 60 ft |
| XP | 100 |

**Longsword**: +3 to hit, 1d8+1 slashing.
**Longbow**: +3 to hit, range 150/600, 1d8+1 piercing.
**Martial Advantage**: +2d6 damage once per turn if ally within 5 ft of target.

```yaml
hobgoblin:
  name: Hobgoblin
  type: hobgoblin
  cr: "1/2"
  xp: 100
  hp: 11
  ac: 18
  speed: 2
  sight: 5
  fov: 120
  stats: { str: 13, dex: 12, con: 12, int: 10, wis: 10, cha: 9 }
  attack: { weaponId: longsword, dice: "1d8+1", range: 1 }
  ai: { martialAdvantage: true }
```

### Shadow 🔲

> Undead. Strength drain, lurks in darkness.

| Stat | Value |
|------|-------|
| HP | 16 (3d8 + 3) |
| AC | 12 |
| Speed | 40 ft (3 tiles) |
| STR 6 | DEX 14 | CON 13 | INT 6 | WIS 10 | CHA 8 |
| Vulnerabilities | Radiant |
| Resistances | Acid, cold, fire, lightning, thunder; nonmagical bludg/pierce/slash |
| Immunities | Necrotic, poison; exhaustion, frightened, grappled, paralyzed, petrified, poisoned, prone, restrained |
| Senses | Darkvision 60 ft |
| XP | 100 |

**Strength Drain**: +4 to hit, 2d6+2 necrotic. Target's STR reduced by 1d4. Target dies if STR reaches 0.
**Amorphous**: Can move through 1-inch spaces.
**Shadow Stealth**: Advantage on Stealth in dim light or darkness.

```yaml
shadow:
  name: Shadow
  type: shadow
  cr: "1/2"
  xp: 100
  hp: 16
  ac: 12
  speed: 3
  sight: 5
  fov: 360
  stats: { str: 6, dex: 14, con: 13, int: 6, wis: 10, cha: 8 }
  attack: { dice: "2d6+2", range: 1 }
  ai: { shadowStealth: true }
  effects:
    - { id: strength_drain, trigger: on_hit, onTrigger: { statDrain: { stat: str, dice: "1d4" } } }
```

---

## CR 1

### Bugbear 🔲

> Medium goblinoid. Surprise attacker, long reach, heavy hits.

| Stat | Value |
|------|-------|
| HP | 27 (5d8 + 5) |
| AC | 16 (hide armor + shield) |
| Speed | 30 ft (2 tiles) |
| STR 15 | DEX 14 | CON 13 | INT 8 | WIS 11 | CHA 9 |
| Skills | Stealth +6, Survival +2 |
| Senses | Darkvision 60 ft |
| XP | 200 |

**Morningstar**: +4 to hit, 2d8+2 piercing.
**Javelin**: +4 to hit, range 30/120, 2d6+2 piercing.
**Surprise Attack**: +2d6 damage if target is surprised in first round.
**Brute**: Extra damage die on melee (already included in damage).

```yaml
bugbear:
  name: Bugbear
  type: bugbear
  cr: "1"
  xp: 200
  hp: 27
  ac: 16
  speed: 2
  sight: 5
  fov: 120
  stats: { str: 15, dex: 14, con: 13, int: 8, wis: 11, cha: 9 }
  skillProficiencies: [stealth, survival]
  attack: { dice: "2d8+2", range: 1 }
  ai: { surpriseAttack: true, surpriseBonus: "2d6" }
```

### Ghoul 🔲

> Undead. Paralyzing claws, pack predator.

| Stat | Value |
|------|-------|
| HP | 22 (5d8) |
| AC | 12 |
| Speed | 30 ft (2 tiles) |
| STR 13 | DEX 15 | CON 10 | INT 7 | WIS 10 | CHA 6 |
| Immunities | Poison; charmed, exhaustion, poisoned |
| Senses | Darkvision 60 ft |
| XP | 200 |

**Claws**: +4 to hit, 2d4+2 slashing. Target must CON DC 10 save or be paralyzed for 1 min (repeat save each turn end).
**Bite**: +2 to hit, 2d6+2 piercing (only vs incapacitated/paralyzed).

```yaml
ghoul:
  name: Ghoul
  type: ghoul
  cr: "1"
  xp: 200
  hp: 22
  ac: 12
  speed: 2
  sight: 5
  fov: 120
  stats: { str: 13, dex: 15, con: 10, int: 7, wis: 10, cha: 6 }
  attack: { dice: "2d4+2", range: 1 }
  effects:
    - { id: paralyze, trigger: on_hit, save: { stat: con, dc: 10 }, duration: 3, onTrigger: { skipTurn: true } }
```

### Giant Spider 🔲

> Large beast. Web restraint, poison bite, wall crawler.

| Stat | Value |
|------|-------|
| HP | 26 (4d10 + 4) |
| AC | 14 (natural) |
| Speed | 30 ft / climb 30 ft (2 tiles) |
| STR 14 | DEX 16 | CON 12 | INT 2 | WIS 11 | CHA 4 |
| Skills | Stealth +7 |
| Senses | Blindsight 10 ft, Darkvision 60 ft |
| XP | 200 |

**Bite**: +5 to hit, 1d8+3 piercing + 2d8 poison (CON DC 11: half on save).
**Web** (Recharge 5-6): Ranged, +5 to hit, range 30/60. Target restrained (STR DC 12 to break).
**Web Sense**: While touching web, knows location of all creatures touching same web.
**Spider Climb**: Can climb without checks.

```yaml
giant_spider:
  name: Giant Spider
  type: giant_spider
  cr: "1"
  xp: 200
  hp: 26
  ac: 14
  speed: 2
  sight: 5
  fov: 360
  stats: { str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4 }
  skillProficiencies: [stealth]
  attack: { dice: "1d8+3", range: 1 }
  effects:
    - { id: poisoned, trigger: on_hit, save: { stat: con, dc: 11 }, damageDice: "2d8", duration: 1 }
```

---

## CR 2

### Ogre 🔲

> Large giant. Slow, dumb, hits like a truck.

| Stat | Value |
|------|-------|
| HP | 59 (7d10 + 21) |
| AC | 11 (hide armor) |
| Speed | 40 ft (3 tiles) |
| STR 19 | DEX 8 | CON 16 | INT 5 | WIS 7 | CHA 7 |
| Senses | Darkvision 60 ft |
| XP | 450 |

**Greatclub**: +6 to hit, 2d8+4 bludgeoning.
**Javelin**: +6 to hit, range 30/120, 2d6+4 piercing.

```yaml
ogre:
  name: Ogre
  type: ogre
  cr: "2"
  xp: 450
  hp: 59
  ac: 11
  speed: 3
  sight: 5
  fov: 120
  stats: { str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7 }
  attack: { dice: "2d8+4", range: 1 }
```

### Mimic 🔲

> Monstrosity (shapechanger). Disguises as object, adhesive, surprise ambusher.

| Stat | Value |
|------|-------|
| HP | 58 (9d8 + 18) |
| AC | 12 (natural) |
| Speed | 15 ft (1 tile) |
| STR 17 | DEX 12 | CON 15 | INT 5 | WIS 13 | CHA 8 |
| Skills | Stealth +5 |
| Immunities | Acid; prone |
| Senses | Darkvision 60 ft |
| XP | 450 |

**Pseudopod**: +5 to hit, 1d8+3 bludgeoning. Target grappled (escape DC 13).
**Bite**: +5 to hit, 1d8+3 piercing + 1d8 acid.
**Shapechanger**: Can polymorph into object or back to amorphous form.
**Adhesive** (Object Form): creature that touches mimic is grappled (escape DC 13). Advantage on attacks vs grappled.
**Grappler**: Advantage on attacks vs grappled creatures.

```yaml
mimic:
  name: Mimic
  type: mimic
  cr: "2"
  xp: 450
  hp: 58
  ac: 12
  speed: 1
  sight: 5
  fov: 360
  stats: { str: 17, dex: 12, con: 15, int: 5, wis: 13, cha: 8 }
  skillProficiencies: [stealth]
  attack: { dice: "1d8+3", range: 1 }
  ai: { ambush: true, disguise: "chest" }
  effects:
    - { id: grappled, trigger: on_hit, save: { stat: str, dc: 13 }, duration: 3, onTrigger: { skipTurn: false } }
```
