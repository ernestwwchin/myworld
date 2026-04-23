# Companion System Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decisions

- **Humanoid NPCs with classes** — not monsters/animals/pets
- **Named characters** with personality and backstory
- **Same 4 classes** as player: Fighter, Ranger, Wizard, Cleric
- **Direct control** in combat (you play their turn) — MVP
- **AI + auto mode** for post-MVP convenience
- **Command-only** for escort/rescue NPCs (not companions)
- **CHA = companion stat** (leadership, not "summoning")
- **Max 2 active** (CHA 14+ = 3rd slot)
- **Global roster** — companions travel with you across worlds
- **Scale with player level** + tier system (later-world companions have higher base)

---

## Companion vs Escort vs Conjured Summon

| | Companion | Escort NPC | Conjured Summon |
|---|---|---|---|
| Control | **Direct** (play their turn) | **Command only** (preset orders + AI) | AI only |
| Duration | Entire run | Until quest completes | N turns |
| Equipment | Own gear + 1 accessory from player | Fixed, can't change | None |
| Roster | Permanent | Temporary | Temporary |
| Scaling | Player level + CHA | Fixed stats | Spellcasting stat (INT/WIS) |
| If KO'd | Out for rest of run | **Quest fails** | Disappears |
| Who gets them | All classes | Quest encounters | Wizard/Cleric only (post-MVP) |
| MVP? | **Yes** | Post-MVP | Post-MVP |

---

## CHA as Companion Stat

Charisma = leadership. High CHA = stronger companions, more slots, better prices.

### CHA Effects

| CHA | Companion HP bonus | Companion damage bonus | Slots | Shop discount |
|---|---|---|---|---|
| 8 (-1) | -2 HP | -1 | 2 | +10% prices |
| 10 (0) | 0 | 0 | 2 | Normal |
| 12 (+1) | +2 HP | +1 | 2 | -5% |
| 14 (+2) | +4 HP | +2 | **3** | -10% |
| 16 (+3) | +6 HP | +3 | 3 | -15% |

### CHA Also Does

| Effect | How |
|---|---|
| Companion stats | +CHA_mod × 2 to HP, +CHA_mod to damage |
| 3rd companion slot | Unlocked at CHA 14+ |
| Shop prices | -5% per CHA mod |
| Reputation gain | Faster contract reputation (post-MVP) |
| Dialog options | CHA check options in conversations (persuade, intimidate) |

### Build Spectrum

```
CHA 8  ──────────────────────── CHA 16
SOLO POWERHOUSE                COMMANDER
Your stats are maxed           Your stats are lower
Companions are weaker          Companions are stronger
2 slots                        3 slots + bonuses
YOU carry the team             Companions carry the team
```

---

## Companion Equipment

### Two Layers

```
1. INNATE GEAR — companion's own equipment, auto-scales with level
   → You never manage this. It improves automatically.

2. COMPANION ACCESSORY — 1 slot, you choose what goes here
   → Found as loot. Customizes the companion's role.
```

### Why Two Layers

Innate gear solves "they should have equipment" without making you manage it:

```
Kira (Fighter, Level 8):
  Innate: Longsword → auto-scales with level
  Innate: Chain Mail → auto-scales with level  
  Innate: Kite Shield
  Accessory: [Ring of Fortitude] +10 HP  ← you choose this
```

### Accessory Types (Role Shifters)

| Accessory | Effect | Role Shift |
|---|---|---|
| Ring of Fortitude | +10 HP, +1 CON save | Push toward Tank |
| Amulet of Ferocity | +2 damage, +10% crit | Push toward DPS |
| Charm of Evasion | +2 AC, AoE dodge | Push toward Skirmisher |
| Token of Mending | Heal 3 HP/turn (self) | Sustain / off-tank |
| Pendant of Thorns | Reflect 2 damage when hit | Tank + damage |
| Band of Haste | +1 action every 3 turns | Any role, more actions |
| Sigil of Protection | Adjacent allies get +1 AC | Support / aura |
| Focus Crystal | Ability cooldowns -1 turn | Ability-heavy companions |
| Lifebond Amulet | When KO'd, heals player 20 HP | Sacrifice play |
| Shadow Cloak | Stealth on first turn of combat | Ambush opener |

### Shared Equipment Rule

**No.** Player gear and companion gear are separate pools.

| Item Type | Who Uses It |
|---|---|
| Weapons, Armor, Shields | Player only |
| Player Accessories | Player only |
| **Companion Accessories** | Companions only |

---

## Level Scaling + Tier System

All companions scale with player level. Later-world companions have higher base stats.

### Tier Formula

```
HP     = base_hp + (player_level × hp_per_level) + ★_bonus + (CHA_mod × 2)
Damage = base_die + (player_level / 4) + ★_bonus + CHA_mod
```

### Tiers

| Tier | World | base_hp | hp/level | base_die |
|---|---|---|---|---|
| T1 | W1 | 14 | 3 | 1d6 |
| T2 | W2 | 20 | 4 | 1d8 |
| T3 | W3 | 28 | 5 | 1d10 |
| T4 | W4 | 36 | 5 | 1d10+2 |
| T5 | W5 | 44 | 6 | 1d12 |

### Example at Player Level 20 (Late W5), All at ★★★

| Companion | Tier | HP | Damage | Viable? |
|---|---|---|---|---|
| Kira (W1 Fighter) | T1 | 84 | ~12 | Usable but weaker (~47%) |
| W2 Dwarf Cleric | T2 | 112 | ~13.5 | Solid (~62%) |
| W3 Elf Ranger | T3 | 142 | ~14.5 | Strong (~79%) |
| W4 Undead Knight | T4 | 150 | ~16.5 | Very strong (~83%) |
| W5 Void Mage | T5 | 180 | ~17.5 | Best stats (100%) |

W1 companions are ~47% power at endgame — viable for normal fights, weak for bosses. Investment (★, rare traits) and unique abilities keep them relevant.

---

## ★ Upgrade System (Post-MVP)

### Per-Type Upgrades

★ upgrades are **per companion type**, not per individual. Upgrading "Wolf Spirit" upgrades ALL your Wolf Spirits.

```yaml
companion_upgrades:  # per-TYPE, not per-instance
  wolf_spirit: 3      # ★★★
  goblin_deserter: 2  # ★★
```

### Upgrade Costs

| Star Level | Gold | Materials |
|---|---|---|
| ★→★★ | 100g | 3 common materials |
| ★★→★★★ | 300g | 5 common + 1 rare material |
| ★★★→★★★★ | 800g | 3 rare materials |
| ★★★★→★★★★★ | 2000g | 1 boss material |

### What Each Star Gives

| Star | Upgrade |
|---|---|
| ★ | Base companion (when first acquired) |
| ★★ | +stat boost, unlock 2nd ability |
| ★★★ | +stat boost, ability upgrade (stronger version) |
| ★★★★ | Visual evolution, +stat boost, unlock 3rd ability |
| ★★★★★ | Final form, all abilities maxed |

---

## Random Traits (Post-MVP)

Each companion rolls a **random trait** on acquisition. Base gear is fixed; trait is the only individual difference.

### Trait Rarity

| Rarity | Chance | Power |
|---|---|---|
| Common | 60% | Small bonus (+1 stat, minor utility) |
| Uncommon | 30% | Solid bonus (+2 stat, useful ability) |
| Rare | 10% | Strong bonus (unique mechanic) |

### Example Traits (Wolf Spirit)

```
Common:  [Hardy] +5 HP,  [Swift] +1 movement
Uncommon: [Loyal] takes hit for player once/combat,  [Feral] +2 damage -1 AC
Rare:    [Phantom Pack] summons 2 ghost wolves for 2 turns, once/combat
```

### Duplicates Allowed

Can have multiple of same type with different traits. Pick which to bring.

---

## Acquisition (MVP vs Post-MVP)

### MVP: Fixed Story Rewards

5 companions for W1, given through quests/story. No RNG, no catching.

| Name | Class | Role | Acquisition |
|---|---|---|---|
| **Kira** | Fighter | Tank | Story — joins in Zone 1 |
| **Torvin** | Cleric | Healer | Quest — "The Wounded Priest" |
| **Shade** | Ranger | Ranged DPS | Found in side dungeon |
| **Mara** | Wizard | Control/AoE | Recruit at town (500g) |
| **Grik** | Fighter | Melee DPS | Quest — "The Deserter" (goblin) |

### Post-MVP: Multiple Methods

| Method | What | CHA Relevant? |
|---|---|---|
| Quest reward | Named NPCs with story | No |
| Recruit (gold) | At town or dungeon NPC | Yes (discount) |
| Rescue | Found trapped in dungeons | No |
| Binding Stones (catching) | Weaken + throw stone on ANY enemy | Yes (catch bonus) |

### Binding Stone Catching (Post-MVP)

```
catch_chance = base_rate(20%) + hp_bonus(+40% at <25%) + stone_bonus + CHA_bonus(×5%) - tier_penalty

Stones: Crude (+0%), Standard (+10%), Greater (+20%), Master (+40%)
Catchable: Normal enemies, Elites (-20%), Champions (-40%), NOT bosses
```

### Re-summon at Town (Post-MVP)

After first acquiring a companion type, can summon new ones at Companion Shrine for gold. Rolls new trait. Cost doubles each time per type (200g → 400g → 800g → ...).

### Companion Variety (Humanoid Races)

Not strictly human — humanoid races for flavor:

```
Human:  Kira, Torvin, Shade, Mara
Goblin: Grik
Dwarf:  (W2 companion)
Elf:    (W3 companion)
Undead: (W4 — sentient skeleton knight)
```

---

## Companion Roster Across Worlds (~15-18 Total)

| World | Companions | Total |
|---|---|---|
| W1 | 5 new | 5 |
| W2 | 4 new | 9 |
| W3 | 3 new | 12 |
| W4 | 3 new | 15 |
| W5 | 2-3 new | 17-18 |

Early worlds give more (building roster). Late worlds give fewer but stronger.

---

## Death & KO System

### Companion KO

| Aspect | Rule |
|---|---|
| 0 HP | **KO'd — out for rest of run** |
| Recovery | Returns at town, fully healed (free) |
| Waypoint rest | Heals living companions. **NOT** KO'd ones. |
| Permanent death | **Never.** Companions always return at town. |
| Snowball risk | Losing companions makes run harder. Solo = very dangerous. |

### Player KO — 3-Turn Rescue Window

| Aspect | Rule |
|---|---|
| Player reaches 0 HP | KO'd — unconscious, 3-turn rescue window |
| Rescue by | Companion heal ability OR companion uses potion on you |
| Revive HP | 25% of max |
| Enemy hits downed player | Removes 1 turn from rescue window |
| No rescue in 3 turns | **Dead. Run over.** Death penalty applied. |
| Solo (no companions alive) | **Instant death.** No rescue window. |
| Cleric value | Has free healing → best rescuer |

### Enemy AI When Player Is Down

| Enemy Type | Behavior |
|---|---|
| Dumb enemies | Ignore downed player, attack companions |
| Smart enemies (Elite+) | 50% chance to attack downed player (-1 turn) |
| Boss | ALWAYS attacks downed player (ruthless) |

---

## Corpse & Body System

### Enemy Corpses

| Aspect | Rule |
|---|---|
| Enemy dies | Corpse on tile (lootable container) |
| Looting | Walk to corpse → interact → take items |
| Mid-combat looting | Possible (costs movement + action) |
| Post-combat | Auto-collect all remaining corpse loot |
| Corpse duration | Fades after looted, or 10 turns, or auto-collect at combat end |
| Boss corpse | Persists until manually looted (guaranteed drop) |

### Body-Related Class Abilities

| Class | Ability | Target | Effect | MVP? |
|---|---|---|---|---|
| Cleric | **Revivify** | KO'd companion body | Revive at 50% HP. Once/run. Adjacent. | **Yes** |
| Cleric | Consecrate | Area (3 tiles) | Destroy corpses, heal allies, block necromancy. | Post-MVP |
| Wizard | **Animate Dead** | Enemy corpse | Raise as skeleton ally, 5 turns. Once/combat. | Post-MVP |

### Revive Scroll (Any Class)

```
REVIVE SCROLL (consumable item)
  Effect:   Same as Cleric Revivify — revive KO'd companion at 50% HP
  Cost:     500g at shop (rare stock)
  Found:    Rare chest drop, quest reward
```

---

## Control System

### MVP: Direct Control

On each companion's turn in combat, control switches to them. Same UI as player turn (click to move, click to attack, pick ability).

```
Turn order:
  1. Player → you control (already built)
  2. Kira → you control Kira (same controls)
  3. Torvin → you control Torvin (same controls)
  4. Enemies → existing enemy AI
```

**Build cost: minimal** — reuse player control UI.

### Post-MVP: Auto Mode Toggle

Per-companion toggle between MANUAL (direct) and AUTO (AI):

```
Companion Bar:
  Kira    [MANUAL] / [AUTO: Tank]
  Torvin  [MANUAL] / [AUTO: Heal Priority]
```

| Mode | When To Use | Speed |
|---|---|---|
| All MANUAL | Boss fights | Slow, full control |
| All AUTO | Easy fights | Fast, AI handles |
| Mix | Normal fights | Medium |

### Preset Commands (Auto Mode)

**Universal (all classes):**

| Command | Behavior |
|---|---|
| Aggressive | Chase and attack nearest enemy |
| Defensive | Stay near player, only attack adjacent |
| Attack This | Focus specific enemy (click target) |
| Protect | Guard specific ally (click ally) |
| Hold | Don't move, attack in range |
| Fall Back | Retreat toward player |
| Free | Full AI — companion decides everything |

**Class-specific:**

| Class | Commands |
|---|---|
| Fighter | **Tank** (front line + taunt) |
| Cleric | **Heal Priority** (heal most wounded) / **Keep Alive** (focus one target) |
| Ranger | **Snipe** (max range + weakest target) / **Kite** (attack + keep distance) |
| Wizard | **Nuke** (AoE groups) / **Control** (debuff strongest) |

Commands persist until changed. Defaults: Fighter=Tank, Cleric=Heal Priority, Ranger=Snipe, Wizard=Nuke.

### Command for Escort NPCs Only

Escort/rescue NPCs use the command system (NOT direct control):

| NPC Type | Available Commands | AI Behavior |
|---|---|---|
| Scared Merchant | Follow, Hide, Run to Exit | Panicked, runs from enemies |
| Wounded Soldier | Follow, Hold, Attack, Fall Back | Can fight weakly, limps |
| Prisoner | Follow, Hide, Run to Exit | Unarmed, panics |
| Defector | Follow, Attack, Fall Back | Fights, but flees at 50% HP |

---

## Companion AI (Post-MVP)

Priority-based, per-class. Built when escort quests need it, then companions get AUTO mode for free.

### AI Priority Lists (Per Class)

**Fighter AI:**
1. If ally threatened and taunt available → taunt
2. If enemy in melee range → attack lowest HP
3. If enemy exists → move toward nearest
4. Default: follow player

**Cleric AI:**
1. If player KO'd → move to player and revivify (SAFETY OVERRIDE)
2. If any ally < 40% HP → heal lowest ally
3. If player < 60% HP → heal player
4. If enemy adjacent → attack
5. Default: stay near player

**Ranger AI:**
1. If enemy caster exists → target caster
2. If enemy in range and distance > 2 → attack lowest HP
3. If enemy adjacent → disengage and move back
4. If enemy exists → move to optimal range (3-4 tiles)
5. Default: follow player

**Wizard AI:**
1. If 3+ enemies grouped and AoE available → AoE
2. If elite/boss and debuff available → debuff strongest
3. If enemy in range → attack strongest
4. If enemy adjacent → escape (teleport/move away)
5. Default: stay behind allies

### Safety Overrides (Always Active)

- Player KO'd → Cleric moves to revive (top priority)
- Self HP < 15% → disengage and retreat
- Any ally HP < 10% AND has healing → emergency heal (even Aggressive Cleric)

---

## Item Use Rules

| Situation | Who Uses Items | How |
|---|---|---|
| Player uses potion on self | Player | Your action |
| Player heals companion | Player | Direct control on companion's turn |
| Companion heals self | Via direct control or Cleric heal | Player decides |
| Player is KO'd | Companion AI auto-uses potion on player | Safety override |
| Scrolls, throwables | Player only | Companions never use scrolls |

**Core rule: Your items, your choice.** In direct control mode, YOU decide when companions use potions. In auto mode, only the "save KO'd player" override uses items.

---

## Exploration Use

### Passive Abilities (Always Active)

| Companion Class | Explore Passive | Effect |
|---|---|---|
| Fighter | **Brute Force** | Can bash open locked doors/chests (STR check) |
| Cleric | **Divine Sense** | Detect hidden enemies/traps in 2-tile radius |
| Ranger | **Scout** | +2 sight radius (more fog revealed) |
| Wizard | **Arcane Eye** | Detect secret doors/hidden rooms in 3-tile radius |

### Active Exploration Actions (Click Companion → Click Object)

| Action | Who Can Do It | Stat Check |
|---|---|---|
| Bash door | Fighter | STR |
| Pick lock | Ranger | DEX |
| Detect traps | Ranger/Cleric | WIS |
| Disarm trap | Ranger | DEX |
| Identify item | Wizard | INT |
| Read inscription | Wizard/Cleric | INT/WIS |
| Heal (out of combat) | Cleric | — |
| Move heavy object | Fighter | STR |
| Consecrate / remove curse | Cleric | WIS |

### Party Composition Affects Exploration

| Party | Explore Strength | Explore Weakness |
|---|---|---|
| Fighter + Cleric | Bash doors, detect/heal | No lockpick, noisy |
| Fighter + Ranger | Bash + lockpick + traps | No healing, no identify |
| Ranger + Wizard | Scout + secrets + identify | Squishy, no bash |
| Cleric + Wizard | Detect + identify + heal | Weak melee, no lockpick |

### Fog of War

Player only reveals fog. Companions exist in revealed tiles only. Exception: Ranger passive adds +2 sight radius.

### Traps

Companions immune to traps (MVP). Add trap triggering post-MVP when AI is smarter.

---

## Party Buffs

### Class Auras (Unique Per Class, Don't Stack)

| Class | Aura Name | Effect |
|---|---|---|
| Fighter | Battle Presence | Party +1 AC |
| Cleric | Blessed Aura | Party +10% healing received |
| Ranger | Keen Eyes | Party +1 sight range, +10% trap detection |
| Wizard | Arcane Ward | Party +1 save vs magic |

Auras don't stack with duplicates. One per class type. Diverse party = more auras.

### Party Size Bonus

| Size | Bonus |
|---|---|
| **Solo (0 companions)** | Lone Wolf: +15% damage, +2 AC |
| 1 companion | Pack: +5% XP |
| 2 companions | Squad: +5% XP, +5% gold |
| 3 companions | Warband: +5% XP, +5% gold, +5% drop rate |

Lone Wolf intentionally strong — solo is harder, deserves combat buff. But loses resource bonuses.

---

## Companion Shrine (Town)

### MVP: Simple Roster Menu

```
COMPANION ROSTER:
  Slot 1: [Kira - Fighter]     [Change]
  Slot 2: [Torvin - Cleric]    [Change]
  Slot 3: 🔒 Requires CHA 14+
```

### Post-MVP: Full Shrine

```
COMPANION SHRINE:
  ── MANAGE ACTIVE ──
  Slot 1: Kira (Fighter) "Kira"         [Change]
  Slot 2: Torvin (Cleric) "Torvin"      [Change]
  Slot 3: 🔒 (requires CHA 14+)

  ── UPGRADE TYPES ── (post-MVP)
  Fighter (Kira type) ★★★☆☆ → ★★★★ [800g + 3 materials]  [Upgrade]

  ── SUMMON NEW ── (post-MVP)
  Wolf Spirit [200g] — rolls new trait  [Summon]

  ── RELEASE ── (post-MVP)
  Companion [Trait] — remove from roster  [Release]
```

---

## Misc Rules

| Topic | Decision |
|---|---|
| Dialog | Bark only (combat lines) for MVP. Banter post-MVP. |
| Initiative | Companions act right after player in turn order. |
| Cross-world | Global roster — bring anyone anywhere. |
| Carry items | **No.** Player inventory only. |
| Status effects | Yes — same system as player and enemies. |
| Town visibility | Not visible (MVP). Tavern hangout (post-MVP). |
| XP | No separate XP. Auto-match player level. |
| Enemy targeting | Yes — enemies can target companions. |
| Companion KO in explore | N/A — only KO'd in combat. |

---

## Conjured Summons (Post-MVP)

Separate from companions. Temporary spell creatures for Wizard/Cleric.

| | Companion | Conjured Summon |
|---|---|---|
| Source | Story/quest/recruit/catch | Class ability (spell) |
| Duration | Entire run | N turns |
| Scaling | Player level + CHA | Spellcasting stat (INT/WIS) |
| Slot usage | Uses companion slots | **Does NOT use companion slots** |
| Max | 2-3 (CHA-based) | 1 at a time |
| Control | Direct | AI only |

### Spell Summon Examples

| Class | Summon | Stat | Duration | Role |
|---|---|---|---|---|
| Wizard | Conjure Skeleton | INT | 5 turns | Melee DPS, fragile |
| Wizard | Conjure Elemental | INT | 4 turns | AoE damage, self-destructs |
| Cleric | Spirit Guardian | WIS | 4 turns | Support, heals + damages adjacent |
| Cleric | Angelic Protector | WIS | 3 turns | Tank, taunts + shields |

Max party on field: 3 companions + 1 conjured summon = 4 allies.

---

## AI System Reuse

One AI system serves many purposes:

| Use Case | AI Type |
|---|---|
| Enemy combat | Already built (combat-ai.ts) |
| Companion auto mode | Same system, different targets |
| Escort NPCs | Companion AI with limited commands |
| Dungeon NPC allies | Temporary companion AI |
| Town NPCs | Simplified pathfind + idle |
| Neutral creatures | Flee AI |
| Traitor NPC | Starts companion AI → switches to enemy AI mid-fight |

Build order: enemy AI (done) → escort AI (with quests) → companion auto (free bonus).

---

## MVP Scope Summary

### Build

- ✓ Companion data in YAML (5 entries for W1)
- ✓ Level scaling formula (player level + tier)
- ✓ CHA mod applied to companion stats
- ✓ 2 active slots (3 at CHA 14+)
- ✓ Direct control (reuse player input system)
- ✓ Simple roster menu (pick active companions)
- ✓ 5 scripted acquisition moments in W1
- ✓ Companion KO → out for rest of run
- ✓ Player KO → 3-turn rescue window
- ✓ Corpses as loot containers
- ✓ Revivify (Cleric ability) + Revive Scroll
- ✓ Explore passives + skill checks
- ✓ Class auras + party size bonus
- ✓ Initiative: companions act right after player

### Skip (Post-MVP)

- ★ upgrade track
- Random traits
- Companion accessories
- Binding Stone catching
- Re-summon at town
- Conjured summons (Wizard/Cleric spells)
- Auto mode + AI commands
- Escort NPC command system
- Companion Shrine full UI
- Companion banter/dialog
- Town visibility
- Naming
- Class affinity bonuses
- Animate Dead (Wizard)
- Consecrate (Cleric)
- Enemy necromancers

---

## YAML Data Model

### Companion Definition (MVP)

```yaml
# companions.yaml
companions:
  kira:
    name: Kira
    race: human
    class: fighter
    role: tank
    tier: 1
    personality: "Stoic, reliable"
    acquisition: story  # joins in Zone 1
    scaling:
      base_hp: 14
      hp_per_level: 3
      base_damage: 1d6+2
      base_ac: 14
    abilities: [shield_bash, taunt, intercept]
    explore_passive: brute_force

  torvin:
    name: Torvin
    race: human
    class: cleric
    role: support
    tier: 1
    personality: "Kind, cautious"
    acquisition: quest  # "The Wounded Priest"
    scaling:
      base_hp: 12
      hp_per_level: 3
      base_damage: 1d6+1
      base_ac: 13
    abilities: [heal, shield_of_faith, revivify]
    explore_passive: divine_sense

  shade:
    name: Shade
    race: human
    class: ranger
    role: ranged_dps
    tier: 1
    personality: "Quiet, observant"
    acquisition: rescue  # found in side dungeon
    scaling:
      base_hp: 12
      hp_per_level: 3
      base_damage: 1d8+2
      base_ac: 13
    abilities: [aimed_shot, disengage, trap_sense]
    explore_passive: scout

  mara:
    name: Mara
    race: human
    class: wizard
    role: control
    tier: 1
    personality: "Sarcastic, smart"
    acquisition: recruit  # town, 500g
    scaling:
      base_hp: 8
      hp_per_level: 2
      base_damage: 1d4+1
      base_ac: 11
    abilities: [fireball, frost_nova, shield]
    explore_passive: arcane_eye

  grik:
    name: Grik
    race: goblin
    class: fighter
    role: melee_dps
    tier: 1
    personality: "Nervous, loyal"
    acquisition: quest  # "The Deserter"
    scaling:
      base_hp: 10
      hp_per_level: 3
      base_damage: 1d6+3
      base_ac: 12
    abilities: [sneak_strike, dirty_fighting, nimble_escape]
    explore_passive: goblin_knowledge
```

### Player Save State (MVP)

```yaml
companion_roster: [kira, torvin, shade, mara, grik]
active_companions: [kira, torvin]
```

### Post-MVP Additions

```yaml
# Per-type upgrades
companion_upgrades:
  kira_type: 3   # ★★★
  torvin_type: 2  # ★★

# Individual instances (when traits/catching added)
companion_instances:
  - type: wolf_spirit
    trait: loyal
    nickname: "Fenris"
  - type: wolf_spirit
    trait: feral
    nickname: null
```

---

## Open Questions

- Exact companion ability lists per class?
- How do companion abilities interact with player abilities (combos)?
- Companion dialog bark trigger conditions?
- How many companion accessories total? (~20-30 unique)
- Exact explore passive ranges/values?
- Should different races have minor stat differences?
- Companion-specific quest chains (loyalty missions)?
