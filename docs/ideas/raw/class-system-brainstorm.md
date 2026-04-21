# Class System Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decisions

- **4 classes** (minimum to showcase all ability scores)
- **Solo player + companions** (named humanoid NPCs with classes — see companion-system-brainstorm.md)
- **Hard equipment restrictions** per class
- **Cooldown-based abilities** (not per-rest)
- **CHA = companion stat** (leadership: scales companion stats, unlocks 3rd slot at CHA 14+)
- **Persistent slow XP leveling** (kill-based, lose XP progress on death, never de-level)
- **Select skill on level-up** (choose from 2-3 options, game remembers last selection)
- **BG3-style 27-point buy** at character creation (replaces fixed starting arrays)
- **Milestone stat bonuses** (+2 at W1/W3/W5 bosses, permanent, non-respecable, separate layer)
- **Respec at town** (200g stats+skills, 500g class change — milestones never respeced)
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

## Stats (BG3-Style Point-Buy + Milestones)

### Character Creation: 27-Point Buy

Standard 5e point-buy rules. All stats start at 8, spend 27 points.

| Score | Point Cost |
|---|---|
| 8 | 0 |
| 9 | 1 |
| 10 | 2 |
| 11 | 3 |
| 12 | 4 |
| 13 | 5 |
| 14 | 7 |
| 15 | 9 |

Range: 8-15 at creation. No stat above 15 before milestones.
Hard cap: 20 (5e standard). Milestones and shrines cannot push any stat above 20.

### Suggested Arrays Per Class

| Class | STR | DEX | CON | INT | WIS | CHA | Focus |
|---|---|---|---|---|---|---|---|
| Fighter | 15 | 10 | 14 | 8 | 10 | 10 | STR + CON |
| Ranger | 10 | 15 | 12 | 8 | 14 | 8 | DEX + WIS |
| Cleric | 12 | 10 | 14 | 8 | 15 | 8 | WIS + CON |
| Wizard | 8 | 14 | 10 | 15 | 12 | 8 | INT + DEX |

Players can deviate — a CHA 14 Fighter "Warlord" with 3 companion slots is a valid build.

### Milestone Bonuses (Separate from Point-Buy)

+2 to a stat of your choice at each milestone. **Permanent, non-respecable.**

| Milestone | When | Bonus |
|---|---|---|
| 1st | W1 boss killed | +2 to any stat |
| 2nd | W3 boss killed | +2 to any stat |
| 3rd | W5 boss killed | +2 to any stat |

Total: +6 stats across the full game. Milestones are a SEPARATE LAYER always applied on top of point-buy. Choose wisely — they're forever.

### Respec at Town

| Respec Type | Cost | What Changes |
|---|---|---|
| Stat + Skill respec | 200g | Redistribute 27 points + re-pick skill choices. Same class. |
| Class change | 500g | Change class entirely. Incompatible gear unequipped. Stats redistributed. |

Milestones are NEVER respeced — permanent layer always applied on top.

### CHA: The Companion Stat

CHA serves double duty: social checks + companion scaling.

| CHA | Companion bonus | Slots | Shop discount |
|---|---|---|---|
| 8 (-1) | -1 to damage, -2 HP | 2 | +10% prices |
| 10 (0) | ±0 | 2 | Normal |
| 12 (+1) | +1 damage, +2 HP | 2 | -5% |
| 14 (+2) | +2 damage, +4 HP | **3** | -10% |
| 16 (+3) | +3 damage, +6 HP | 3 | -15% |

Every class pays the same cost for CHA. A CHA 14 Fighter is a "Warlord" commander. A CHA 8 Wizard is a solo glass cannon.

---

## The Four Classes

| Class | Primary | Secondary | Hit Die | Identity |
|---|---|---|---|---|
| **Fighter** | STR | CON | d10 | I hit things and don't die |
| **Ranger** | DEX | WIS | d8 | I shoot from range, scout, and handle traps |
| **Cleric** | WIS | CON | d8 | I heal and support while being durable |
| **Wizard** | INT | DEX | d6 | I cast powerful spells but I'm fragile |

---

## Equipment Restrictions (Hard)

| Class | Weapons | Armor | Shield |
|---|---|---|---|
| **Fighter** | All weapons | All armor (light/medium/heavy) | Yes |
| **Ranger** | Light + finesse + ranged (dagger, shortsword, longbow, shortbow, crossbow) | Light + Medium | No |
| **Cleric** | Blunt + staff only (mace, thunder maul, pulsar hammer, quarterstaff, ether rod, void staff) | Medium + Heavy | Yes |
| **Wizard** | Staff only (quarterstaff, ether rod, void staff) | None | No |

### Investment Implications

| Class | Deep equipment pieces | Notes |
|---|---|---|
| Fighter | Weapon + Shield/Off-hand + Armor (3) | Most flexible, any build |
| Ranger | Weapon (ranged) + Off-hand/Melee + Light-Med Armor (3) | Ranged focus, dual wield option |
| Cleric | Weapon + Shield + Armor (3) | Tanky support |
| Wizard | Staff only (1) | Cheap to build, compensates with spells |

---

## Companion System (Replaces Party)

**Solo player + humanoid NPC companions.** Full design in `companion-system-brainstorm.md`.

Key points:
- Companions are **named humanoid NPCs** with classes (same 4 classes as player)
- **Direct control** in combat (you play their turn) — MVP
- **AI + auto mode** togglable per companion — post-MVP
- **CHA scales companion stats** and unlocks 3rd slot at CHA 14+
- Max **2 active** (3 at CHA 14+)
- Scale with player level + tier (later-world companions have higher base)
- KO'd = out for rest of run, return at town
- Player KO'd = 3-turn rescue window (companions can save you)
- Equipment: own auto-scaling gear + 1 companion accessory you give
- Explore passives: Fighter bash, Ranger scout/lockpick, Cleric detect, Wizard identify

### Class Aura Buffs (Party)

| Class | Aura | Effect |
|---|---|---|
| Fighter | Battle Presence | Party +1 AC |
| Cleric | Blessed Aura | Party +10% healing received |
| Ranger | Keen Eyes | Party +1 sight range, +10% trap detection |
| Wizard | Arcane Ward | Party +1 save vs magic |

Auras don't stack with duplicates. Diverse party = more auras.

### Party Size Bonus

| Size | Bonus |
|---|---|
| Solo (0) | Lone Wolf: +15% damage, +2 AC |
| 1 companion | +5% XP |
| 2 companions | +5% XP, +5% gold |
| 3 companions | +5% XP, +5% gold, +5% drop rate |

### Conjured Summons (Post-MVP, Wizard/Cleric Only)

| Class | Summon | Stat | Duration | Role |
|---|---|---|---|---|
| Wizard | Conjure Skeleton | INT | 5 turns | Melee DPS |
| Wizard | Conjure Elemental | INT | 4 turns | AoE damage |
| Cleric | Spirit Guardian | WIS | 4 turns | Support |
| Cleric | Angelic Protector | WIS | 3 turns | Tank |

Does NOT use companion slots. Max 1 conjured at a time. AI-controlled.

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

### Ranger

| Ability | Type | Effect |
|---|---|---|
| Hunter's Mark | Active (3 CD) | Mark target, +1d6 damage on hits for 3 turns |
| Aimed Shot | Active (4 CD) | +3 to-hit, +1d8 damage (ranged only) |
| Disengage | Active (2 CD) | Move without provoking opportunity attacks |
| Evasion | Passive | DEX saves: pass = 0, fail = half |
| Volley | Active (6 CD) | AoE ranged attack, all enemies in 3-tile area |
| Trap Sense | Passive | Detect traps within 2 tiles |
| Snare | Active (5 CD) | Place trap on tile, immobilizes enemy 2 turns |
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
- Ranger ability list — finalize (currently sketch)
- Exact companion ability interactions with player abilities (combos)?
- How does respec interact with unlocked skill pool?
