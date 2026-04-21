# Class System Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decisions

- **4 classes** (minimum to showcase all ability scores)
- **Start solo**, recruit party members through story (RPG-style)
- **Hard equipment restrictions** per class
- **Cooldown-based abilities** (not per-rest)
- **4-person party** at full strength
- **Persistent slow XP leveling** (kill-based, lose XP progress on death, never de-level)
- **Select skill on level-up** (choose from 2-3 options, game remembers last selection)
- **Stats are permanent** (grow from boss milestones only)
- **Level cap: 10** (reached over many worlds, slow pace)
- **No multiclass, no advanced class** — skill pool grows via unlocks, build variety from choices

---

## Three Progression Layers

```
STATS = permanent (boss milestones, never lost)
LEVEL = persistent slow XP (gives HP + proficiency + skill unlocks, lose XP on death)
EQUIPMENT = persistent (★, slots, abilities, survives death)
```

| Layer | Grows from | Lost on death | Pace |
|---|---|---|---|
| Stats | Boss kills, rare events | Never | ~5-6 points total game |
| Level | Kill XP (slow) | Lose 50% progress to next level | ~1 level per world |
| Equipment | Blacksmith, drops, synthesis | Carried items lost, equipped kept | Continuous |

---

## Leveling System

### Persistent Slow XP (Model B)

- XP from kills. Slow grind — each level takes many floors.
- Level 10 takes the whole game (~5 worlds).
- **Death = lose 50% of XP progress toward next level** (never lose a level, just slower)
- Each level feels like an achievement (rare).
- No reset per world. No de-level traps.

### What level gives

| Level gain | Effect |
|---|---|
| HP | +hit die per level (Fighter d10, Rogue d8, Wizard d6) |
| Proficiency | +1 at level 5 and 9 |
| Skill unlock | Choose 1 skill from 2-3 options per level |

### Skill selection on level-up

```
LEVEL UP! Choose a skill:
  ► [Extra Attack] (last run's choice)  ← remembered, highlighted
    [Shield Bash]
    [Cleave] ★NEW                       ← recently unlocked
    
  Skills once chosen are PERMANENT. Never lost. Never disabled.
  Level only determines WHEN you got to choose, not ongoing access.
```

- 2-3 options per level from class pool
- Pool grows as you unlock more skills (boss kills, quests, events)
- Game remembers last choice (auto-select or override)
- Once chosen, the skill is permanent — kept on death, between worlds, forever

### Scaling abilities

Some abilities scale with level (numbers change), but are never disabled:

```
Sneak Attack: 1d6 per 2 levels (level 2 = 1d6, level 10 = 5d6)
Second Wind:  heal 1d10 + level
Fireball:     4d6 + 1d6 per level above 3
```

If you're level 4, Sneak Attack is 2d6. At level 8, it's 4d6. But you always HAVE it.

---

## Stats (Permanent)

Fixed starting array by class. Grow ONLY from permanent milestones.

### Starting Stats

| Class | STR | DEX | CON | INT | WIS | CHA |
|---|---|---|---|---|---|---|
| Fighter | 16 | 10 | 14 | 8 | 10 | 8 |
| Rogue | 10 | 16 | 12 | 14 | 10 | 8 |
| Cleric | 12 | 10 | 14 | 8 | 16 | 10 |
| Wizard | 8 | 14 | 10 | 16 | 12 | 8 |

### Stat Growth (Milestones only)

| Milestone | Reward |
|---|---|
| World 1 boss | +1 to primary stat |
| World 2 boss | +1 to secondary stat |
| World 3 boss | +1 to primary stat |
| World 4 boss | +1 to any stat |
| World 5 boss | +1 to primary stat |
| Rare dungeon event | +1 to random stat (very rare) |

Total: ~5-6 stat points across the full game. Never lost.

---

## The Four Classes

| Class | Primary | Secondary | Hit Die | Identity |
|---|---|---|---|---|
| **Fighter** | STR | CON | d10 | I hit things and don't die |
| **Rogue** | DEX | INT | d8 | I position and deal big single-target burst |
| **Cleric** | WIS | CON | d8 | I heal and support while being durable |
| **Wizard** | INT | DEX | d6 | I cast powerful spells but I'm fragile |

---

## Equipment Restrictions (Hard)

| Class | Weapons | Armor | Shield |
|---|---|---|---|
| **Fighter** | All weapons | All armor (light/medium/heavy) | Yes |
| **Rogue** | Light + finesse only (dagger, vibro knife, phase blade, longsword, beam saber) | Light only | No |
| **Cleric** | Blunt + staff only (mace, thunder maul, pulsar hammer, quarterstaff, ether rod, void staff) | Medium + Heavy | Yes |
| **Wizard** | Staff only (quarterstaff, ether rod, void staff) | None | No |

### Investment Implications

| Class | Deep equipment pieces | Notes |
|---|---|---|
| Fighter | Weapon + Shield/Off-hand + Armor (3) | Most flexible, any build |
| Rogue | Weapon + Off-hand weapon + Light Armor (3) | Dual wield natural fit |
| Cleric | Weapon + Shield + Armor (3) | Tanky support |
| Wizard | Staff only (1) | Cheap to build, compensates with spells |

---

## Party Recruitment

```
Game start:     Pick your class (1 character, solo)
World 1 mid:    Recruit party member #2 (story event / town NPC)
World 1 end:    Recruit party member #3
World 2 early:  Recruit party member #4 (full party)
```

- Recruited members join at appropriate level
- One of each class (no duplicates)
- Early game is solo — teaches mechanics before party complexity

---

## Ability Resource Model: Cooldowns

No spell slots. No per-rest resources. All class abilities use turn-based cooldowns.

| Ability type | Cooldown | Example |
|---|---|---|
| Basic | 2-3 turns | Shield Bash, Quick Strike |
| Standard | 4-6 turns | Sneak Attack, Heal, Fireball |
| Ultimate | 8-12 turns | Action Surge, Mass Heal, Meteor |

---

## Class Abilities (Sketch)

Skills are chosen on level-up from a growing pool. Pool starts small, grows from boss kills and unlocks.

### Fighter

| Ability | Type | Effect |
|---|---|---|
| Extra Attack | Passive | Attack twice per turn |
| Second Wind | Active (6 CD) | Heal self 1d10 + level |
| Improved Critical | Passive | Crit on 19-20 |
| Action Surge | Active (10 CD) | Extra action this turn |
| Shield Bash | Active (4 CD) | Stun target 1 turn |
| Cleave | Active (5 CD) | Hit all adjacent enemies |
| Shield Wall | Active (6 CD) | +3 AC for 2 turns |
| Taunt | Active (4 CD) | Force enemy to attack you |
| Intercept | Reaction (6 CD) | Take hit for adjacent ally |
| Fortitude | Passive | +20 max HP |

### Rogue

| Ability | Type | Effect |
|---|---|---|
| Sneak Attack | Passive (scales) | +Xd6 when advantage or ally adjacent |
| Cunning Action | Active (2 CD) | Bonus: Dash, Disengage, or Hide |
| Uncanny Dodge | Reaction (4 CD) | Halve one attack's damage |
| Evasion | Passive | DEX saves: pass = 0, fail = half |
| Shadow Step | Active (5 CD) | Teleport behind target |
| Assassination | Active (10 CD) | Auto-crit from stealth |
| Poison Blade | Active (4 CD) | Next hit applies poison (3 turns) |
| Vanish | Active (8 CD) | Become invisible 2 turns |

### Cleric

| Ability | Type | Effect |
|---|---|---|
| Heal | Active (4 CD) | Heal target 2d8 + WIS mod |
| Shield of Faith | Active (6 CD) | +2 AC to target for 3 turns |
| Turn Undead | Active (8 CD) | AoE fear undead |
| Mass Heal | Active (12 CD) | Heal all allies 1d8 + WIS |
| Smite | Active (4 CD) | +2d8 radiant damage on hit |
| Bless | Active (6 CD) | Party +1d4 to attacks/saves for 3 turns |
| Divine Armor | Passive | +1 AC permanently |
| Revive | Active (rest of combat) | Bring fallen ally to 1 HP |

### Wizard

| Ability | Type | Effect |
|---|---|---|
| Magic Missile | Active (2 CD) | 3 darts, 1d4+1 each, auto-hit |
| Fireball | Active (6 CD) | AoE, scales with level |
| Shield | Reaction (3 CD) | +5 AC until next turn |
| Frost Nova | Active (4 CD) | AoE slow all adjacent |
| Chain Lightning | Active (6 CD) | Bounces 3 targets |
| Teleport | Active (5 CD) | Move to any visible tile |
| Blizzard | Active (8 CD) | Large AoE, 3-turn slow zone |
| Meteor | Active (12 CD) | Massive AoE, scales with level |

---

## Death Penalty Summary

| What's lost | What's kept |
|---|---|
| 50% XP progress to next level | Current level (never lose a level) |
| All carried inventory | Equipped gear (weapon, armor, shield) |
| 30% carried gold | Stash (safe) |
| — | All skills (permanent) |
| — | All stats (permanent) |

---

## Open Questions

- Exact XP curve per level?
- How many skill choices per level-up (2 or 3)?
- Total skill pool size per class by endgame?
- Can you respec skill choices at town?
- Party member personality/story?
