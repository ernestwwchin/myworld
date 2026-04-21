# Class System Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decisions

- **4 classes** (minimum to showcase all ability scores)
- **Solo player + companions** (named humanoid NPCs with classes — see companion-system-brainstorm.md)
- **Hard equipment restrictions** per class
- **Per-encounter abilities + per-rest spells** (BG3 model — see ability-system-brainstorm.md)
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

## Ability Resource Model: Per-Encounter + Per-Rest

Full system design in `ability-system-brainstorm.md`.

| Resource | Reset | Examples |
|---|---|---|
| Per-encounter charges | After combat ends | Maneuvers, Second Wind, Action Surge, weapon abilities |
| Per-rest spell slots | At town/waypoint rest | All spells (Fireball, Cure Wounds, Haste) |
| Unlimited cantrips | Never consumed | Strike, Fire Bolt, Sacred Flame |

### Spell Slots Per Class

| Class | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| Fighter | 2 | 0 | 0 |
| Ranger | 3 | 2 | 0 |
| Cleric | 4 | 3 | 2 |
| Wizard | 4 | 3 | 2 |

---

## Class Abilities (Summary)

Full ability definitions (with YAML format) in `ability-system-brainstorm.md`.
Skills are chosen on level-up from a growing pool. Pool starts small, grows from boss kills and unlocks.

### Fighter — Maneuvers + Class Actives

| Ability | Type | Charges | Effect |
|---|---|---|---|
| Strike | Cantrip | ∞ | Basic weapon attack |
| Shove | Cantrip | ∞ | Push target 1 tile |
| Trip Attack | Maneuver | 2/enc | Weapon + superiority die. STR save or prone. |
| Precision Attack | Maneuver | 2/enc | Add superiority die to attack roll |
| Menacing Attack | Maneuver | 2/enc | Weapon + superiority die. WIS save or frightened. |
| Pushing Attack | Maneuver | 2/enc | Weapon + superiority die. Push 2 tiles. |
| Second Wind | Class Active | 1/enc | Heal 1d10 + level |
| Action Surge | Class Active | 1/enc | Extra action this turn |
| Extra Attack | Passive | — | Attack twice per Attack action |
| Improved Critical | Passive | — | Crit on 19-20 |
| Fighting Style: Defense | Passive | — | +1 AC while armored |
| Parry | Reaction | 1/round | Reduce damage by DEX mod + superiority die |
| Riposte | Reaction | 1/round | Free attack on miss + superiority die |
| Thunderous Smite | Spell (L1) | slot | +2d6 thunder + push 2 tiles |
| Shield | Spell (L1) | slot | +5 AC, reaction |

### Ranger — Class Actives + Spells

| Ability | Type | Charges | Effect |
|---|---|---|---|
| Quick Shot | Cantrip | ∞ | Basic ranged attack |
| Careful Step | Cantrip | ∞ | Move 2 tiles, ignore traps |
| Mark Target | Class Active | 1/enc | +2 to hit vs marked, 3 turns |
| Camouflage | Class Active | 1/enc | Hidden, next attack has advantage |
| Colossus Slayer | Passive | — | +1d8 vs wounded (1/turn) |
| Fighting Style: Archery | Passive | — | +2 ranged attack rolls |
| Evasion | Passive | — | DEX save: pass = 0, fail = half |
| Uncanny Dodge | Reaction | 1/round | Halve incoming damage |
| Hunter's Mark | Spell (L1) | slot | +1d6 to marked target, concentration |
| Ensnaring Strike | Spell (L1) | slot | STR save or restrained 2 turns |
| Cure Wounds | Spell (L1) | slot | Heal 1d8 + WIS |
| Spike Growth | Spell (L2) | slot | Zone: 2d4 per tile, concentration |

### Cleric — Class Actives + Spells

| Ability | Type | Charges | Effect |
|---|---|---|---|
| Sacred Flame | Cantrip | ∞ | 1d8 radiant, DEX save half |
| Guidance | Cantrip | ∞ | +1d4 to ally's next roll |
| Turn Undead | Class Active | 1/enc | WIS save or frightened, 3-tile AOE |
| Preserve Life | Class Active | 1/enc | Heal allies below 50%, pool = 5×level |
| Disciple of Life | Passive | — | Healing spells +2+spell_level |
| Blessed Healer | Passive | — | Heal others → heal self 2+spell_level |
| Divine Strike | Passive | — | Weapon attacks +1d8 radiant (1/turn) |
| Warding Flare | Reaction | 1/round | Impose disadvantage on attacker |
| Cure Wounds | Spell (L1) | slot | Heal 1d8 + WIS, +1d8/upcast |
| Healing Word | Spell (L1) | slot | Heal 1d4 + WIS at range, bonus action |
| Bless | Spell (L1) | slot | 3 allies +1d4 attacks/saves, concentration |
| Shield of Faith | Spell (L1) | slot | +2 AC, concentration |
| Spiritual Weapon | Spell (L2) | slot | Summon, 1d8+WIS, 5 turns |
| Spirit Guardians | Spell (L3) | slot | 3d8 radiant aura, concentration |
| Divine Intervention | Per-rest | 1 | Full heal + cleanse all allies (level 10) |

### Wizard — Spell Modifiers + Spells

| Ability | Type | Charges | Effect |
|---|---|---|---|
| Fire Bolt | Cantrip | ∞ | 1d10 fire |
| Ray of Frost | Cantrip | ∞ | 1d8 cold + slow |
| Twin Cast | Spell Modifier | 1/enc | Next single-target spell hits 2 targets |
| Empower Spell | Spell Modifier | 2/enc | Reroll damage, keep higher |
| Quicken Spell | Spell Modifier | 1/enc | Next spell free action |
| Sculpt Spells | Passive | — | Allies auto-save on your AOE |
| Potent Cantrip | Passive | — | Cantrips deal half on save |
| Empowered Evocation | Passive | — | +INT mod to spell damage |
| Magic Missile | Spell (L1) | slot | 3 darts, 1d4+1, auto-hit |
| Shield | Spell (L1) | slot | +5 AC, reaction |
| Sleep | Spell (L1) | slot | 5d8 HP worth fall asleep |
| Fireball | Spell (L2) | slot | 8d6 fire, AOE radius 3, DEX save half |
| Misty Step | Spell (L2) | slot | Teleport 6 tiles, bonus action |
| Lightning Bolt | Spell (L3) | slot | 8d6 lightning, line, DEX save half |
| Counterspell | Spell (L3) | slot | Negate enemy spell, reaction |
| Haste | Spell (L3) | slot | +2 AC, double speed, extra action, concentration |

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
- Exact companion ability interactions with player abilities (combos)?
- How does respec interact with unlocked skill pool?

## Resolved Questions

- ~~Cooldown-based or per-rest?~~ → **Per-encounter charges + per-rest spell slots** (BG3 model)
- ~~Ranger ability list finalized?~~ → **Yes** — see ability-system-brainstorm.md for full list
- ~~How do reactions work?~~ → **Each fires once per round**, 5 timing windows
