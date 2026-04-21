# Game Parameters Reference (Source of Truth)

Status: authoritative
Date: 2026-04-21
Source: consolidated from all brainstorm files

**When brainstorm files conflict with this file, this file wins.**

---

## 1. Character Creation

### 27-Point Buy (5e Standard)

| Score | Cost | Modifier |
|---|---|---|
| 8 | 0 | -1 |
| 9 | 1 | -1 |
| 10 | 2 | +0 |
| 11 | 3 | +0 |
| 12 | 4 | +1 |
| 13 | 5 | +1 |
| 14 | 7 | +2 |
| 15 | 9 | +2 |

Range: 8-15 at creation. **Hard cap: 20** (5e standard). No stat can exceed 20 from any source.

### Stat Effects

| Stat | Combat | Exploration | Economy |
|---|---|---|---|
| **STR** | Melee attack/damage | Inventory slots (10+mod), bash doors, move objects | — |
| **DEX** | AC (light/med), ranged attack/damage, initiative | Trap disarm, lockpick, stealth | — |
| **CON** | HP per level, concentration | Resist bad potions/fountains | — |
| **INT** | Spell damage (Wizard) | Examine items (free hint), identify, read inscriptions | — |
| **WIS** | Perception, spell saves, spell damage (Cleric) | Resist bad scrolls, sense curses, shrine ID, detect traps | — |
| **CHA** | — | Dialog checks (persuade, intimidate) | Shop discount, companion stats, reputation gain |

### Inventory Slots

```
Base: 10 slots
STR 8-9  (-1): 9 slots
STR 10-11 (0): 10 slots
STR 12-13 (+1): 11 slots
STR 14-15 (+2): 12 slots
STR 16-17 (+3): 13 slots
STR 18-20 (+4): 14 slots
```

---

## 2. Level Progression

### XP Curve

| Level | XP to Next | Cumulative | Expected World | Proficiency |
|---|---|---|---|---|
| 1 | 300 | 0 | W1 start | +2 |
| 2 | 600 | 300 | W1 | +2 |
| 3 | 900 | 900 | W1 boss | +2 |
| 4 | 1,200 | 1,800 | W2 | +2 |
| 5 | 1,500 | 3,000 | W2 boss | +3 |
| 6 | 2,000 | 4,500 | W3 | +3 |
| 7 | 2,500 | 6,500 | W3 boss | +3 |
| 8 | 3,000 | 9,000 | W4 | +3 |
| 9 | 4,000 | 12,000 | W4 boss | +4 |
| 10 | — | 16,000 | W5 (cap) | +4 |

- ~2 levels gained per world
- Death penalty: lose 50% of XP progress toward next level (never de-level)
- XP source: enemy kills only

### HP per Level

| Class | Hit Die | Level 1 Formula | Per Level After |
|---|---|---|---|
| Fighter | d10 | 10 + CON mod | d10 (avg 5.5) + CON mod |
| Ranger | d8 | 8 + CON mod | d8 (avg 4.5) + CON mod |
| Cleric | d8 | 8 + CON mod | d8 (avg 4.5) + CON mod |
| Wizard | d6 | 6 + CON mod | d6 (avg 3.5) + CON mod |

### HP at Key Levels (Suggested Stats)

| Class | Level 1 | Level 5 | Level 10 |
|---|---|---|---|
| Fighter (CON 14) | 12 | 42 | 80 |
| Ranger (CON 12) | 9 | 31 | 59 |
| Cleric (CON 14) | 10 | 36 | 69 |
| Wizard (CON 10) | 6 | 20 | 38 |

### Milestones (Permanent, Non-Respecable)

| Milestone | Trigger | Bonus |
|---|---|---|
| 1st | W1 boss killed | +2 to any stat |
| 2nd | W3 boss killed | +2 to any stat |
| 3rd | W5 boss killed | +2 to any stat |

Total: +6 across full game. Applied as separate layer on top of point-buy. Hard cap 20 still applies.

---

## 3. Classes

### Overview

| Class | Primary | Secondary | Hit Die | Equipment |
|---|---|---|---|---|
| **Fighter** | STR | CON | d10 | All weapons, all armor, shields |
| **Ranger** | DEX | WIS | d8 | Light+finesse+ranged, light+medium armor |
| **Cleric** | WIS | CON | d8 | Blunt+staff, medium+heavy armor, shields |
| **Wizard** | INT | DEX | d6 | Staff only, no armor, no shields |

### Suggested Starting Arrays

| Class | STR | DEX | CON | INT | WIS | CHA | Total |
|---|---|---|---|---|---|---|---|
| Fighter | 15 | 10 | 14 | 8 | 10 | 10 | 27 pts |
| Ranger | 10 | 15 | 12 | 8 | 14 | 8 | 27 pts |
| Cleric | 12 | 10 | 14 | 8 | 15 | 8 | 27 pts |
| Wizard | 8 | 14 | 10 | 15 | 12 | 8 | 27 pts |

### Equipment Restrictions (Hard)

| Class | Weapons Allowed | Armor Allowed | Shield |
|---|---|---|---|
| Fighter | All | Light, Medium, Heavy | Yes |
| Ranger | Dagger, Shortsword, Longbow, Shortbow, Crossbow (light+finesse+ranged) | Light, Medium | No |
| Cleric | Mace, Thunder Maul, Pulsar Hammer, Quarterstaff, Ether Rod, Void Staff (blunt+staff) | Medium, Heavy | Yes |
| Wizard | Quarterstaff, Ether Rod, Void Staff (staff only) | None | No |

### Class Abilities (MVP)

**Fighter:**

| Ability | Cooldown | Effect |
|---|---|---|
| Second Wind | 5 turns | Heal 1d10 + level |
| Shield Bash | 3 turns | 1d6 + push 1 tile + stun 1 turn (requires shield) |
| Cleave | 4 turns | Attack all adjacent enemies |
| Extra Attack | Passive | 2 attacks per turn (unlock at level 5) |
| Taunt | 3 turns | Force target to attack you for 2 turns |

**Ranger:**

| Ability | Cooldown | Effect |
|---|---|---|
| Aimed Shot | 3 turns | +5 to hit, +1d8 damage (ranged only) |
| Disengage | 2 turns | Move without provoking opportunity attacks |
| Trap Sense | Passive | +5 trap detection, can disarm |
| Hunter's Mark | 4 turns | +1d6 damage to marked target for 3 turns |
| Volley | 5 turns | Attack all enemies in 3×3 area (ranged) |

**Cleric:**

| Ability | Cooldown | Effect |
|---|---|---|
| Heal | 2 turns | Heal target 2d8 + WIS mod |
| Shield of Faith | 4 turns | Target gets +2 AC for 3 turns |
| Turn Undead | 4 turns | Undead in 3-tile radius flee for 2 turns |
| Revivify | 1/run | Revive KO'd companion at 50% HP (adjacent) |
| Spiritual Weapon | 5 turns | Summon weapon, attacks for 3 turns (1d8+WIS) |

**Wizard:**

| Ability | Cooldown | Effect |
|---|---|---|
| Fireball | 4 turns | 4d6 fire, 3×3 area, DEX save half |
| Frost Nova | 3 turns | 2d6 cold + frozen 1 turn, all adjacent |
| Shield | 3 turns | +5 AC until next turn (reaction) |
| Magic Missile | 2 turns | 3×(1d4+1) force, auto-hit |
| Teleport | 5 turns | Move to any visible tile within 8 |

### Explore Passives (Companion + Player)

| Class | Passive | Effect |
|---|---|---|
| Fighter | Brute Force | Bash open locked doors/chests (STR check) |
| Ranger | Scout | +2 sight radius, detect traps in 2-tile radius |
| Cleric | Divine Sense | Detect hidden enemies/traps in 2-tile radius |
| Wizard | Arcane Eye | Detect secret doors/hidden rooms in 3-tile radius |

### Class Auras (Party Buff, Don't Stack)

| Class | Aura | Effect |
|---|---|---|
| Fighter | Battle Presence | Party +1 AC |
| Cleric | Blessed Aura | Party +10% healing received |
| Ranger | Keen Eyes | Party +1 sight, +10% trap detection |
| Wizard | Arcane Ward | Party +1 save vs magic |

### Party Size Bonus

| Size | Bonus |
|---|---|
| Solo (0 companions) | Lone Wolf: +15% damage, +2 AC |
| 1 companion | Pack: +5% XP |
| 2 companions | Squad: +5% XP, +5% gold |
| 3 companions | Warband: +5% XP, +5% gold, +5% drop rate |

### Respec

| Type | Cost | What Changes |
|---|---|---|
| Stat + Skill | 200g | Redistribute 27 points + re-pick skills. Same class. |
| Class Change | 500g | New class. Incompatible gear unequipped. Stats redistributed. |

Milestones are NEVER respeced.

---

## 4. Combat Rules

### Attack Roll

```
d20 + proficiency + stat_mod + enhancement vs target_AC
  Melee: STR mod (or DEX mod for finesse weapons)
  Ranged: DEX mod
  Spell: INT mod (Wizard) or WIS mod (Cleric)
```

### Damage Roll

```
weapon_die + stat_mod + enhancement + ★_bonus
  ★ bonus: see equipment ★ table
```

### Critical Hit

Natural 20: roll damage dice twice (flat bonuses apply once).

### Initiative

```
d20 + DEX mod (highest goes first)
Turn order: Player → Companions (in slot order) → Enemies (by initiative)
```

### Action Economy

| Resource | Per Turn |
|---|---|
| Movement | 4 tiles (base) |
| Action | 1 (attack, ability, use item, interact) |
| Bonus Action | 1 (off-hand attack if dual wielding, some abilities) |
| Reaction | 1 (opportunity attack, Shield spell) |

### Off-Hand Attack (Dual Wield)

- Requires `light` property on off-hand weapon
- Bonus action: attack with off-hand
- Damage: weapon die only (no stat mod, no enhancement)
- Off-hand weapon uses full item rules (★, slots, synthesis, abilities)

### Opportunity Attack

Move away from adjacent enemy → they get 1 free attack.
Disengage ability avoids this.

---

## 5. Equipment

### Weapon Families

| Family | Weapon | Damage | Properties | Start Slots | Max Slots |
|---|---|---|---|---|---|
| **Long Blade** | Longsword | 1d8 | versatile | 2 | 5 |
| | Beam Saber | 1d10 | versatile | 3 | 5 |
| | Plasma Edge | 1d12 | versatile | 4 | 5 |
| **Short Knife** | Dagger | 1d4 | finesse, light | 2 | 5 |
| | Vibro Knife | 1d6 | finesse, light | 3 | 5 |
| | Phase Blade | 1d8 | finesse, light | 4 | 5 |
| **Great Blade** | Greatsword | 2d6 | two-handed, heavy | 4 | 7 |
| | Gravity Blade | 2d8 | two-handed, heavy | 5 | 7 |
| | Annihilator | 2d10 | two-handed, heavy | 6 | 7 |
| **Blunt** | Mace | 1d6 | bludgeoning | 2 | 5 |
| | Thunder Maul | 1d8 | bludgeoning | 3 | 5 |
| | Pulsar Hammer | 1d10 | bludgeoning, two-handed | 4 | 7 |
| **Staff** | Quarterstaff | 1d6 | versatile | 2 | 5 |
| | Ether Rod | 1d8 | versatile | 3 | 5 |
| | Void Staff | 1d10 | two-handed | 4 | 7 |
| **Bow** | Shortbow | 1d6 | ranged (6 tiles) | 2 | 5 |
| | Longbow | 1d8 | ranged (8 tiles) | 3 | 5 |
| | Crossbow | 1d10 | ranged (6 tiles), loading | 3 | 5 |

### Armor Families

| Family | Armor | AC | Start Slots | Max Slots |
|---|---|---|---|---|
| **Light** | Leather | 11 + DEX | 2 | 4 |
| | Synth Weave | 12 + DEX | 3 | 4 |
| | Phase Suit | 13 + DEX | 3 | 4 |
| **Medium** | Chain Shirt | 13 + DEX (max +2) | 2 | 4 |
| | Scale Mail | 14 + DEX (max +2) | 3 | 4 |
| | Titan Plate | 15 + DEX (max +2) | 3 | 4 |
| **Heavy** | Ring Mail | 14 | 2 | 4 |
| | Splint | 17 | 3 | 4 |
| | Fortress Plate | 18 | 3 | 4 |

### Shield Families

| Family | Shield | AC Bonus | Start Slots | Max Slots |
|---|---|---|---|---|
| **Light** (no penalty) | Buckler | +1 | 1 | 3 |
| | Force Buckler | +1 | 2 | 3 |
| | Phase Guard | +1 | 3 | 3 |
| **Heavy** (stealth penalty) | Kite Shield | +2 | 1 | 3 |
| | Tower Shield | +2 | 2 | 3 |
| | Aegis Barrier | +2 | 3 | 3 |

### Build Comparison (Max Slots)

| Build | Weapon | Off-hand | Armor | Total |
|---|---|---|---|---|
| 1H + Shield | 5 | 3 | 4 | 12 |
| Dual Wield | 5 | 5 | 4 | 14 (most, double investment) |
| Two-Handed | 7 | — | 4 | 11 (fewest, highest base damage) |

### Enhancement (+N)

- Range: +0 to +3
- Adds to attack roll AND damage
- **Drop-only** (not upgradeable at Blacksmith)
- Very rare (+1 uncommon, +2 rare, +3 very rare)
- Synthesis: sums both weapons' +N, **capped at +3**

### Refinement (★)

- Range: ★-15 to ★15
- Adds bonus DAMAGE (weapons) or DR/DEX save (armor/shields)
- Upgraded at Blacksmith (gold)
- Synthesis: sums both items' ★, capped at ★-15 to ★15
- Affected by events, curses, traps, rust monsters

#### ★ Weapon Damage Bonus

| ★ Range | Bonus Damage |
|---|---|
| ★-15 | -1d10 |
| ★-14 to ★-12 | -1d8 |
| ★-11 to ★-9 | -1d6 |
| ★-8 to ★-6 | -1d4 |
| ★-5 to ★-3 | -1 |
| ★-2 to ★2 | +0 |
| ★3 to ★5 | +1 |
| ★6 to ★8 | +1d4 |
| ★9 to ★11 | +1d6 |
| ★12 to ★14 | +1d8 |
| ★15 | +1d10 |

#### ★ Heavy Gear → Damage Reduction (DR)

Same table as weapon damage, but applied as DR. Heavy armor + heavy shield DR stacks.

#### ★ Light/Medium Gear → DEX Save Bonus

| ★ Range | DEX Save Bonus |
|---|---|
| ★-15 | -5 |
| ★-14 to ★-12 | -4 |
| ★-11 to ★-9 | -3 |
| ★-8 to ★-6 | -2 |
| ★-5 to ★-3 | -1 |
| ★-2 to ★2 | +0 |
| ★3 to ★5 | +1 |
| ★6 to ★8 | +2 |
| ★9 to ★11 | +3 |
| ★12 to ★14 | +4 |
| ★15 | +5 |

#### Blacksmith ★ Costs

| ★ Range | Gold per ★ Level |
|---|---|
| ★0 to ★5 | 50-100g |
| ★6 to ★10 | 200-400g |
| ★11 to ★15 | 500-1000g |

Full ★0→★15: ~3,500-5,000g per piece. Player's 3 deep pieces: ~12,000-15,000g total.

### Ability Slots

| Tier | Effect Level | Trade-off | Found in |
|---|---|---|---|
| Basic | Small (+1d4 element, +1 AC, heal 1 on kill) | None | W1-W2 |
| Advanced | Strong (+resist, +vampiric, +crit range) | Yes (-vuln, -AC, -HP) | W2-W4 |
| Superior | Strong (same power) | None | W4-W5 (rare) |

### Synthesis

Requires: Synthesis Hammer (consumable) OR Dungeon Anvil (one-use)

| Attribute | Transfers? |
|---|---|
| +N | Yes (sum, capped at +3) |
| ★ | Yes (sum, capped at ★-15 to ★15) |
| Abilities | Yes (fill empty slots, overflow = pick, rest lost) |
| Slots | No (target keeps its own) |
| Base type | No (target keeps its own) |
| Unique locked ability | Yes (becomes unlocked on target) |

Synthesis Hammer sources per run: ~2-4 total (shop 1, floor drop ~1, boss 1, anvil ~1).

### Accessories (Simple, No Growth)

| Accessory | Effect |
|---|---|
| Ring of Haste | +1 movement |
| Ring of Sight | +2 vision range |
| Ring of Strength | +1 STR |
| Ring of Evasion | +1 DEX saves |
| Ring of Protection | +1 AC |
| Ring of Regeneration | Heal 1 HP/turn |
| Ring of Greed | +10% gold find |
| Ring of Stealth | Enemies detect 1 tile later |
| Amulet of Vitality | +5 max HP |
| Amulet of Warding | +1 AC |
| Amulet of Greed | +20% gold find |
| Amulet of Stealth | Enemies detect 1 tile later |
| Amulet of Clarity | Immune to confusion |
| Amulet of Warmth | Immune to freeze |
| Amulet of Warding | +1 saves |
| Amulet of Light | +1 vision |

### BUC (Blessed / Uncursed / Cursed)

| State | Weapon Effect | Armor Effect | Consumable Effect |
|---|---|---|---|
| Blessed | +1 damage | +1 AC | Enhanced |
| Uncursed | Normal | Normal | Normal |
| Cursed | -1 to-hit, can't unequip | -1 AC, can't unequip | Reduced/reversed |

---

## 6. Companions

### W1 Roster (MVP)

| Name | Race | Class | Role | Acquisition | base_hp | hp/level | base_damage | base_ac |
|---|---|---|---|---|---|---|---|---|
| Kira | Human | Fighter | Tank | Story (Zone 1) | 14 | 3 | 1d6+2 | 14 |
| Torvin | Human | Cleric | Support | Quest: "Wounded Priest" | 12 | 3 | 1d6+1 | 13 |
| Shade | Human | Ranger | Ranged DPS | Found in side dungeon | 12 | 3 | 1d8+2 | 13 |
| Mara | Human | Wizard | Control/AoE | Recruit at town (500g) | 8 | 2 | 1d4+1 | 11 |
| Grik | Goblin | Fighter | Melee DPS | Quest: "The Deserter" | 10 | 3 | 1d6+3 | 12 |

### Companion Scaling Formula

```
HP     = base_hp + (player_level × hp_per_level) + ★_bonus + (CHA_mod × 2)
Damage = base_die + (player_level / 4) + ★_bonus + CHA_mod
```

### Tier by World

| Tier | World | base_hp | hp/level | base_die |
|---|---|---|---|---|
| T1 | W1 | 14 | 3 | 1d6 |
| T2 | W2 | 20 | 4 | 1d8 |
| T3 | W3 | 28 | 5 | 1d10 |
| T4 | W4 | 36 | 5 | 1d10+2 |
| T5 | W5 | 44 | 6 | 1d12 |

### CHA Effects on Companions

| CHA | Mod | Companion HP | Companion Damage | Slots | Shop Discount |
|---|---|---|---|---|---|
| 8 | -1 | -2 HP | -1 damage | 2 | +10% prices |
| 10 | 0 | +0 | +0 | 2 | Normal |
| 12 | +1 | +2 HP | +1 damage | 2 | -5% |
| 14 | +2 | +4 HP | +2 damage | **3** | -10% |
| 16 | +3 | +6 HP | +3 damage | 3 | -15% |

### Companion KO Rules

| Situation | Result |
|---|---|
| Companion reaches 0 HP | KO'd — out for rest of run |
| At waypoint rest | Heals LIVING companions only. KO'd stay KO'd. |
| Return to town | All companions return, fully healed |
| Permanent death | Never. Companions always come back at town. |

### Player KO — 3-Turn Rescue Window

| Situation | Result |
|---|---|
| Player 0 HP | KO'd — 3-turn rescue timer |
| Companion heals/uses potion on player | Revived at 25% HP |
| Enemy hits downed player | -1 turn from timer |
| Timer reaches 0 | Dead. Run over. Death penalty. |
| Solo (no companions alive) | Instant death. No rescue window. |

### Companion Equipment

- **Innate gear**: auto-scales with level (player never manages)
- **1 Companion Accessory slot**: player equips (role-shifting items)
- No shared equipment between player and companions

### Roster Across Worlds

| World | New Companions | Running Total |
|---|---|---|
| W1 | 5 | 5 |
| W2 | 4 | 9 |
| W3 | 3 | 12 |
| W4 | 3 | 15 |
| W5 | 2-3 | 17-18 |

---

## 7. Enemies

### Power Curve (By World)

| World | AC | HP | To-Hit | Damage | XP/Kill | Gold/Kill |
|---|---|---|---|---|---|---|
| W1 early | 12-13 | 7-15 | +3-4 | 1d6 (3.5) | 25-35 | 5-10g |
| W1 late | 14-15 | 20-35 | +5 | 1d8+2 (6.5) | 50-75 | 10-20g |
| W2 | 15-16 | 30-50 | +6-7 | 2d6 (7) | 50-100 | 10-25g |
| W3 | 16-18 | 50-80 | +7-8 | 2d8 (9) | 100-200 | 20-40g |
| W4 | 18-19 | 70-100 | +8-9 | 3d6 (10.5) | 150-300 | 30-60g |
| W5 | 19-21 | 90-130 | +9-11 | 3d8 (13.5) | 200-500 | 50-100g |

### W1: Goblin Invasion — Enemy Roster

| Enemy | HP | AC | To-Hit | Damage | XP | Gold | AI |
|---|---|---|---|---|---|---|---|
| Goblin | 7 | 12 | +3 | 1d6 (3.5) | 25 | 2d4 | basic |
| Goblin Archer | 8 | 13 | +4 | 1d6+1 (4.5) | 35 | 2d4 | ranged |
| Goblin Scout | 10 | 13 | +4 | 1d6+1 (4.5) | 35 | 2d6 | basic |
| Wolf | 11 | 12 | +3 | 1d6+1 (4.5) | 30 | 0 | brute |
| Spider | 8 | 13 | +3 | 1d4+2 (4.5) | 40 | 0 | basic |
| Goblin Shaman | 12 | 12 | +3 | 1d6 (3.5) | 50 | 3d6 | support |
| Goblin Warrior | 15 | 14 | +4 | 1d8 (4.5) | 50 | 2d6 | basic |
| Goblin Trapper | 10 | 13 | +4 | 1d6+1 (4.5) | 45 | 2d6 | ranged |
| Hobgoblin | 20 | 15 | +5 | 1d8+2 (6.5) | 75 | 3d6 | basic |
| Cave Spider | 16 | 14 | +4 | 1d8+1 (5.5) | 60 | 0 | basic |
| Goblin Chief | 35 | 15 | +5 | 2d6 (7) | 150 | 5d6 | basic |

### Spider Poison

- On-hit: CON save DC 12, fail = poisoned 3 turns (-1 to attack rolls)

### Goblin Shaman Abilities

- Heal Ally: ally below 50% HP → heal 2d6, cooldown 3
- Fire Bolt: no healing needed → 1d8 fire, cooldown 2

### Elite / Champion System

| Type | HP Mult | To-Hit | Damage | Drop Bonus | Spawn Rate |
|---|---|---|---|---|---|
| Normal | 1× | — | — | Normal | 80% |
| Elite | 2× | +2 | +1d6 | +1 rarity tier | 15% |
| Champion | 3× | +3 | +2d6 | Guaranteed rare | 5% |

### Champion Special Abilities (Random Roll)

| Ability | Effect |
|---|---|
| Berserker | Enrage at 50% HP (double attacks) |
| Shielded | DR 5 until shield broken (targeted attack) |
| Summoner | Spawn 2 minions at 50% HP |
| Cursed | On-hit: ★-1 to target's weapon |
| Draining | On-hit: target loses XP progress |
| Regenerating | Heal 10% HP/turn unless fire applied |
| Teleporting | Blink to random tile each turn |
| Reflecting | 50% chance to reflect spell damage |

### AI Tiers

| Tier | Behavior | Used By |
|---|---|---|
| Basic | Move toward nearest, attack adjacent | Goblins, zombies |
| Ranged | Keep distance, shoot, flee if approached | Archers, mages |
| Brute | Charge straight line, heavy hit, slow | Ogres, wolves |
| Support | Heal/buff allies, stay behind front line | Shamans, priests |
| Boss | Phase-based script | World bosses |

---

## 8. Bosses

### Overview

| Boss | World | HP | AC | Phases | Legendary Actions/Round |
|---|---|---|---|---|---|
| Goblin Warlord | W1 | 150 | 16 | 3 | 2 |
| Shadow Lord | W2 | 300 | 18 | 3 | 2 |
| Crystal Titan | W3 | 500 | 19 | 3 | 3 |
| Void Dragon | W4 | 750 | 20 | 3 | 3 |
| Final Boss | W5 | 1000 | 21 | 3 | 3 |

### Boss Universal Rules

- Immune to: stun, fear, charm
- Smart targeting: prioritizes healers, finishes downed players
- Enrage timer: +2 damage/round after round 20
- Cannot leave boss arena once fight starts
- Pre-boss: rest/inventory/companion swap opportunity

### Boss Guaranteed Drops

- 1× Synthesis Hammer
- 1× Slot Chisel
- 1× weapon (from boss weapon table)
- 1× boss material (companion upgrades)
- Gold: 200-500g (scales by world)
- Stat milestone: +2 to any stat (W1, W3, W5 bosses only)

### W1 Boss: Goblin Warlord (Detailed)

**Phase 1 — "The Commander" (150-90 HP)**
- Fights with sword+shield (AC 18)
- Summons 2 Goblins from side doors every 3 turns
- Starts with 2 Hobgoblin guards
- Legendary: War Cry (+1 damage to allies) or Dodge (+2 AC)

**Phase 2 — "No More Games" (90-45 HP, triggers at 60%)**
- Throws shield, grabs greataxe: AC 16→14, damage 2d10+5
- Multi-attack: 2 attacks per turn
- Kicks braziers → 3 random fire tiles (2d6/turn)
- Charges lowest-HP target
- Legendary: Charge (move 4 + attack) or Battlecry (WIS DC 13 fear)

**Phase 3 — "Berserk" (45-0 HP, triggers at 30%)**
- +2 damage all attacks, 6 tiles movement
- 3 actions per round (2 attacks + 1 legendary)
- Ground Slam: 1-tile AoE, 2d8, knockback
- Relentless: CON DC 15, success = revive at 1 HP (once)

---

## 9. Economy

### Income Per Run

| World | Enemies | Chests | Contracts | Boss | Gear Sales | **Run Total** |
|---|---|---|---|---|---|---|
| W1 | ~400g | ~160g | ~200g | ~350g | ~200g | **~1,300g** |
| W2 | ~700g | ~300g | ~400g | ~600g | ~400g | **~2,400g** |
| W3 | ~1,000g | ~500g | ~600g | ~900g | ~600g | **~3,600g** |
| W4 | ~1,400g | ~700g | ~900g | ~1,200g | ~800g | **~5,000g** |
| W5 | ~1,800g | ~900g | ~1,200g | ~1,500g | ~1,000g | **~6,400g** |

### Full Game Gold Flow

| Phase | Runs | Income | Spending | Running Savings |
|---|---|---|---|---|
| W1 | ~3 | ~3,900g | ~1,430g (consumables, Mara, blacksmith, ID) | ~2,400g |
| W2 | ~3 | ~7,200g | ~3,200g (consumables, respec, blacksmith, town) | ~7,600g |
| W3 | ~2 | ~7,200g | ~4,800g (consumables, blacksmith, companion ★, town) | ~12,000g |
| W4 | ~2 | ~10,000g | ~8,000g (consumables, blacksmith, companion ★, town) | ~17,000g |
| W5 | ~2 | ~12,800g | varies | 5,000-20,000g |

### Shop Prices — Consumables

| Item | Buy | Sell | BUC Blessed | BUC Cursed |
|---|---|---|---|---|
| Healing Potion | 25g | 8g | Heal 4d8 (instead of 2d8) | Heal 1d4 |
| Greater Healing | 100g | 33g | Heal 8d8 | Heal 2d8 |
| Antidote | 20g | 7g | Cure all status | Half duration cure |
| Identify Scroll | 30g | 10g | ID all items | Un-ID one known |
| Blessing Scroll | 75g | 25g | — | — |
| Remove Curse Scroll | 100g | 33g | — | — |
| Revive Scroll | 500g | 165g | Revive at 75% HP | Revive at 10% HP |
| Bomb | 80g | 27g | 5d6 fire | 1d6 fire |
| Smoke Bomb | 50g | 17g | — | — |

### Shop Prices — Tools & Equipment

| Item | Buy | Sell |
|---|---|---|
| Slot Chisel | 100g (1st), 200g, 400g, 800g (scaling per run) | 50g |
| Synthesis Hammer | 500g (1 per world) | 250g |
| Common weapon | 100g | 25g |
| Uncommon weapon | 300g | 75g |
| Rare weapon | 1,000g | 250g |

### Vendor Buy/Sell Ratio: 25-33%

### CHA Price Modifier

| CHA | Mod | Buy Price | Sell Price |
|---|---|---|---|
| 8 | -1 | +10% | -5% |
| 10 | 0 | Normal | Normal |
| 12 | +1 | -5% | +5% |
| 14 | +2 | -10% | +5% |
| 16 | +3 | -15% | +10% |

### Town Upgrades (MVP: 4 Facilities × 3 Levels)

| Upgrade | Cost | Effect |
|---|---|---|
| Blacksmith Lv 2 | 500g | Better ★ upgrade options |
| Blacksmith Lv 3 | 2,000g | Can add ability slots (500g each) |
| Alchemist Lv 2 | 500g | Better potions available |
| Alchemist Lv 3 | 2,000g | Custom potion brewing |
| Shop Lv 2 | 1,000g | Rare items in stock |
| Shop Lv 3 | 3,000g | Rotating rare stock |
| Companion Shrine Lv 2 | 1,000g | ★ upgrades unlocked |
| Companion Shrine Lv 3 | 3,000g | Re-summon + trait reroll |
| **Total** | **~13,000g** | |

Unlock model: world clear auto-unlocks facility Lv 1 (free). Upgrading costs gold.

### Blacksmith Services

| Service | Cost |
|---|---|
| ★ refinement | 50-1000g per ★ level (see ★ cost table) |
| Add ability slot | 500g (requires Blacksmith Lv 3) |
| Reforge (reroll ★) | 300g (risky) |

Note: +N enhancement is **drop-only**. Cannot be upgraded at Blacksmith.

### Economy Feel Targets

| World | Feel | Player Behavior |
|---|---|---|
| W1 | **Tight** | Every potion purchase matters |
| W2 | **Budgeting** | Afford consumables + 1 upgrade per run |
| W3 | **Comfortable** | Afford most things, invest in town |
| W4 | **Flush** | Town upgrades flowing, buying rare items |
| W5 | **Rich** | Luxury sinks (enchanting, rare stock, ★★★★★) |

---

## 10. Consumables

### Potions (Color-Shuffled Per Save)

| Potion | Effect | Throw Effect |
|---|---|---|
| Healing | Heal 2d8 HP | Heal target 2d8 |
| Greater Healing | Heal 4d8 HP | Heal target 4d8 |
| Strength | +2 STR this run | -2 STR on target (run) |
| Haste | +1 movement 10 turns | — |
| Invisibility | Invisible 5 turns | — |
| Resistance | Random element resist this run | — |
| Antidote | Cleanse poison/curse | Cleanse target |
| Poison | 2d6 damage + poisoned 3 turns | 2d6 + poisoned on target |
| Confusion | Random movement 5 turns | Confuse target |
| Weakness | -2 STR this run | -2 STR on target |
| Blindness | Vision = 1 tile, 10 turns | Blind target |
| Rust | ★-2 equipped weapon | ★-2 target's weapon |
| Amnesia | Un-ID one known potion | — |
| Fire | 2d6 fire to self | 2d6 fire to target + lights tile |
| Ice | Frozen 2 turns | Freeze target 2 turns |
| Levitation | Float over traps | Float target |
| Shrink | Halve your damage | Halve target's damage |

### Scrolls (Name-Shuffled Per Save)

| Scroll | Effect |
|---|---|
| Identify | Reveal all stats on one item (not BUC) |
| Insight | Reveal BUC on one item |
| Blessing | Bless one item (cursed→uncursed or uncursed→blessed) |
| Remove Curse | Remove cursed status from equipped item |
| Fire | 3d6 fire to all enemies in room |
| Lightning | 4d6 to single target |
| Ice | 2d6 cold + freeze all in 3×3 |
| Teleport | Move to random tile on floor |
| Swap | Swap position with target enemy |
| Mapping | Reveal entire floor layout |
| Protection | Party DR 1 for this floor |
| Enchant | ★+1 to equipped weapon |

### Throwables (Always Identified)

| Throwable | Effect | Range | Buy |
|---|---|---|---|
| Bomb | 3d6 fire, 3×3 AoE | 5 tiles | 80g |
| Smoke Bomb | Block vision 3 turns, 3×3 | 5 tiles | 50g |
| Caltrops | 1d6 + slow on step | 4 tiles | 40g |
| Net | Restrained 2 turns (STR save) | 4 tiles | 60g |
| Holy Water | 3d6 radiant to undead | 5 tiles | 75g |
| Acid Flask | ★-1 to target's armor/weapon | 4 tiles | 100g |

### Stack Limits

| Type | Base Max | With Upgrades (Tier 3) |
|---|---|---|
| Potions | 5 | 8 |
| Scrolls | 5 | 8 |
| Throwables | 3 | 5 |
| Synthesis Hammers | 3 (no upgrade) | — |
| Slot Chisels | 3 (no upgrade) | — |

### Drop Rates (Per Zone)

| Item Type | Drop Chance | Amount per Drop |
|---|---|---|
| Potion | ~30% | 1-2 |
| Scroll | ~20% | 1-3 |
| Throwable | ~10% | 1-2 |
| Synthesis Hammer | ~3% | 1 |
| Slot Chisel | ~10% | 1 |

---

## 11. Run Structure

### Zone Layout (W1: Goblin Invasion)

```
TOWN → Zone 1: Greenwood Path (140×100)
         ├── [Abandoned Mine] (side, normal)
         └── [Forgotten Cellar] (side, challenge)
       → BRANCH:
         A: Zone 2A: Goblin Outpost (110×80)
            ├── [Mushroom Grotto] (side, challenge)
            → Zone 3A: Warren Entrance (90×70)
               └── [Prison Cells] (side, normal)
         B: Zone 2B: Dark Hollow (110×80)
            ├── [Cursed Shrine] (side, challenge)
            → Zone 3B: Bone Tunnels (90×70)
               └── [Crypt] (side, normal)
       → CONVERGE: Zone 4: Deep Warren (90×70)
       → Zone 5: Warlord's Throne (50×40, fixed)
```

5 main zones + 4 accessible side dungeons per run.

### Waypoints

| Action | Effect |
|---|---|
| Fast Travel | TP to any other activated waypoint in this world |
| Stash (deposit only) | Bank items safely — survives death |
| Short Rest | Heal 50% HP, once per waypoint per run |
| Extract | End run, return to town, must restart world |

### Side Dungeons

| Type | Level Reset | Death Penalty | Retry |
|---|---|---|---|
| Normal | No | Full run death | Re-enter (progress resets) |
| Challenge (Shiren-style) | Yes (level 1, empty) | No penalty, lose dungeon items | Unlimited, new seed each attempt |

### Encounters Per Zone

| Zone | Expected Level | Enemy Groups | Elite Chance | Champion Chance |
|---|---|---|---|---|
| Greenwood Path | 1 | 4-6 | 5% | 0% |
| Goblin Outpost / Dark Hollow | 1-2 | 5-7 | 10% | 2% |
| Warren Entrance / Bone Tunnels | 2 | 5-7 | 10% | 3% |
| Deep Warren | 2 | 6-8 | 15% | 5% |
| Warlord's Throne | 2-3 | 1 (boss) | — | — |

---

## 12. World Progression

### Unlock

| World | Requirement | Theme |
|---|---|---|
| W1 | Always available | Goblin Invasion (forest → caves → warren) |
| W2 | Kill W1 boss | TBD (underground/dark) |
| W3 | Kill W2 boss | TBD (jungle/ruins) |
| W4 | Kill W3 boss | TBD (volcanic/fortress) |
| W5 | Kill W4 boss | TBD (void/endgame) |

### What Carries Between Worlds: Everything Persistent

Level, XP, stats, milestones, skills, equipped gear, stash, companion roster, reputation, town upgrades, world quests completed, story flags.

### Backtracking

All unlocked worlds accessible. Reduced XP/gold returns in lower worlds. No enemy scaling.

---

## 13. Death Penalty

| What | Rule |
|---|---|
| XP | Lose 50% progress to next level (never de-level) |
| Carried inventory | **Lost** (all items in inventory) |
| Carried gold | Lose **30%** |
| Equipped gear | **Kept** (weapon, armor, shield, ring, amulet) |
| Stash | **Safe** (items + gold deposited at waypoint) |
| Character level | Kept |
| Permanent buffs | Kept (milestones, stat shrines, heart crystals) |
| ★ on equipped gear | Kept |
| Curses on character | Kept (not cleansed by death) |
| Active contracts | Failed |
| World quest progress | Kept (resume next run) |
| Companion KO state | All return at town |

### Waypoint Deposit Strategy

Deposit gold/items at waypoints (deposit only, no withdrawal). Reduces death penalty exposure. Smart players deposit frequently.

---

## 14. Identification System

### Shuffle Scope: Per Save File

Color/name mappings persist across runs within the same save. Knowledge survives death.

### Equipment ID

```
Unidentified: "Long Blade ?"
Identified:   "Longsword +2 ★5 (3 slots) [Fire][ ][ ]"
BUC revealed: "Longsword +2 ★5 (3 slots) [Fire][ ][ ] cursed"
```

### Consumable ID

```
One identified → all of that appearance identified (class-based)
"Blue Potion ?" → identify one → all "Blue Potion" = "Healing Potion"
```

### ID Methods

| Method | Reveals | Risk | Cost |
|---|---|---|---|
| Equip weapon | All stats + BUC | Cursed = stuck (WIS DC 12) | Free |
| Drink potion | Type + BUC | Harmful: CON save DC 10-18 | Potion consumed |
| Read scroll | Type + BUC | Harmful: WIS save DC 10-18 | Scroll consumed on fail |
| Scroll of Identify | Stats + abilities (not BUC) | None | Scroll consumed |
| Scroll of Insight | BUC only | None | Scroll consumed |
| Sage NPC (town) | Everything | None | 50g per item |
| INT examine | Hint ("harmful/beneficial/???") | None | Free action |

---

## 15. Traps

| Trap | Hidden? | Detection DC | Trigger | Effect | Disarm DC |
|---|---|---|---|---|---|
| Pressure Plate | Yes | WIS 12 | Step on | Arrow 1d8 or pit 1d6+prone | DEX 12 |
| Tripwire | Yes | WIS 14 | Step on | Alarm or net (restrained 2 turns) | DEX 10 |
| Poison Dart | Yes | WIS 13 | Step adjacent | 1d4 + poisoned 3 turns | N/A |
| Floor Spikes | Yes | WIS 15 | Step on | 2d6 piercing | DEX 14 |
| Rune Trap | No (visible) | Always | Step on | 2d8 elemental | INT 14 |
| Collapsing Floor | No (visible) | Always | Step on | Fall 2d6 | DEX check to jump |
| Alarm Crystal | No (visible) | Always | Enter room | All enemies alerted | Break or sneak DEX 13 |
| Mimic | Yes | WIS 16 | Open | Surprise 2d8 + grapple | WIS check |

### Trap Class Bonuses

| Class | Bonus |
|---|---|
| Ranger | +5 detection, can disarm with Thieves' Tools |
| Wizard | Detect Rune Traps at range, dispel with INT |
| Fighter | Resist trap damage (CON save for half) |
| Cleric | Detect Mimics (WIS bonus), cure poison |

---

## 16. Save System

- Single save slot (MVP)
- localStorage
- Auto-save only (enter new zone, return to town, kill boss, extract)
- Quit mid-zone → resume at zone entrance
- Export/Import JSON backup
- Reset Game (double confirm)

---

## Appendix: XP Per Enemy (W1)

| Enemy | XP | Kills to Level 2 (300 XP) |
|---|---|---|
| Goblin | 25 | 12 |
| Goblin Archer | 35 | 9 |
| Wolf | 30 | 10 |
| Spider | 40 | 8 |
| Goblin Shaman | 50 | 6 |
| Goblin Warrior | 50 | 6 |
| Hobgoblin | 75 | 4 |
| Goblin Chief | 150 | 2 |
| Goblin Warlord (boss) | 500 | — |

W1 run (all zones): ~40 enemies × 35 XP avg = ~1,400 XP. Enough for level 1→3 in ~1.5 runs (before death penalty).

## Appendix: Damage Verification

### Player DPR at Key Points

```
Level 1 Fighter (STR 15, Longsword, no ★):
  Attack: d20 + 2(prof) + 2(STR) = +4 vs AC 12 = 65% hit
  Damage: 1d8 + 2 = 6.5 avg
  DPR: 6.5 × 0.65 = 4.2

Level 3 Fighter (STR 15, Longsword +1, ★5):
  Attack: d20 + 2 + 2 + 1 = +5 vs AC 14 = 55% hit
  Damage: 1d8 + 2 + 1 + 1(★5) = 8.5 avg
  DPR: 8.5 × 0.55 = 4.7
  With Extra Attack (level 5): 4.7 × 2 = 9.4

Level 5 Fighter (STR 17 w/milestone, Beam Saber +2, ★10):
  Attack: d20 + 3(prof) + 3(STR) + 2 = +8 vs AC 16 = 60% hit
  Damage: 1d10 + 3 + 2 + 1d6(★10) = 12 avg
  DPR: 12 × 0.60 × 2(Extra Attack) = 14.4
  + Companion Kira: ~6 DPR
  + Companion Torvin: ~4 DPR (healer, occasional attacks)
  Party DPR: ~24

Level 10 Fighter (STR 20, Plasma Edge +3, ★15):
  Attack: d20 + 4(prof) + 5(STR) + 3 = +12 vs AC 20 = 60% hit
  Damage: 1d12 + 5 + 3 + 1d10(★15) = 16.5 avg
  DPR: 16.5 × 0.60 × 2 = 19.8
  + 2-3 companions: ~15-20 DPR
  Party DPR: ~35-40
```

### Boss TTK (Turns to Kill)

| Boss | HP | Party DPR (est.) | Turns | With Adds/Phases |
|---|---|---|---|---|
| Goblin Warlord | 150 | ~15 | ~10 | ~15 (adds + phase transitions) |
| Shadow Lord | 300 | ~24 | ~13 | ~18 |
| Crystal Titan | 500 | ~30 | ~17 | ~22 |
| Void Dragon | 750 | ~35 | ~21 | ~28 |
| Final Boss | 1000 | ~40 | ~25 | ~33 |

Target: boss fights last 15-30 turns. Feels epic, not tedious.

### Economy Verification

```
W1 first run income: ~1,300g
W1 first run spending:
  3 Healing Potions: 75g
  2 Identify Scrolls: 60g
  1 Antidote: 20g
  ★ upgrade (★0→★3): ~200g
  Total: ~355g
  
Net after W1 run 1: ~945g
Net after W1 run 2: ~2,245g
Net after W1 run 3: ~3,545g (minus Mara 500g = ~3,045g)

Can afford: Blacksmith Lv2 (500g) + some ★ work
Cannot afford: everything at once → must prioritize → good tension
```
