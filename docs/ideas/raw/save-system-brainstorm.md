# Save System Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decisions (MVP)

- **Single save slot** (one character)
- **localStorage** storage
- **Auto-save only** (no manual save)
- **Reset Game** wipes everything (confirm twice)
- **Export/Import JSON** for backup
- **Quit mid-run** resumes at zone entrance

---

## What Gets Saved

### Persistent (Never Lost)

| Data | Example |
|---|---|
| Character class | Fighter |
| Stat allocation (27-point buy) | STR 15, DEX 10, etc. |
| Milestone bonuses | +2 STR (from W1 boss) |
| Level + total XP | Level 4, 3200 XP |
| Skill choices | Extra Attack, Shield Bash, Cleave |
| Equipped gear | Longsword ★3, Chain Mail |
| Stash contents | Items in town storage |
| Stash gold | Gold in bank |
| Companion roster | Kira, Torvin, Shade unlocked |
| Companion ★ upgrades | Kira type ★★★ (post-MVP) |
| World unlocks | W1 complete, W2 accessible |
| Reputation | Rep 12 |
| Town upgrades | Blacksmith level 2 |
| World quests completed | "The Deserter" done |
| Flags / story progress | Goblin Warlord defeated |

### Per-Run (Lost on Death/Extract)

| Data | Example |
|---|---|
| Current zone | W1 Zone 3 |
| Carried inventory | 6/10 slots used |
| Carried gold | 340g |
| Active companions + HP | Kira 30/45, Torvin full |
| KO'd companions | Shade KO'd |
| Map state | Fog revealed, doors opened |
| Active contracts | Kill 10 goblins (7/10) |
| Active world quests | "Poison the Well" in progress |
| Cooldown states | Shield Bash 2 turns left |
| Run seed | For deterministic map gen |

---

## Auto-Save Triggers

| Trigger | What Saves |
|---|---|
| Enter new zone | Full run state |
| Return to town | Full persistent + run cleared |
| Kill boss | Persistent state |
| Extract at waypoint | Persistent (stash deposit) |
| Quit game mid-zone | Resume point at zone entrance |

---

## Quit Mid-Run

```
IN DUNGEON → Quit Game:
  "Your progress will be saved at the start of this zone."
  > Quit (saves)

NEXT SESSION → Resume:
  "You were in W1 Zone 3. Resume?"
  > Resume (start at Zone 3 entrance, same run state)
  > Abandon Run (return to town, treated as death penalty)
```

---

## Settings UI

```
SETTINGS:
  > Export Save (download .json file)
  > Import Save (upload .json file)
  > Reset Game → "Are you sure?" → "This will erase ALL progress. Confirm?" → Wipe
```

---

## Save Data Structure

```yaml
# Full save file
version: 1

character:
  name: "Player1"
  class: fighter
  level: 4
  xp: 3200
  stats:
    base: { str: 15, dex: 10, con: 14, int: 8, wis: 10, cha: 10 }
    milestones: [{ stat: str, amount: 2 }]
  skills: [extra_attack, shield_bash, cleave]
  equipped:
    weapon: { id: longsword, star: 3, enhancement: 1, abilities: [keen], buc: uncursed }
    armor: { id: chain_mail, star: 2, enhancement: 0, buc: uncursed }
    shield: { id: kite_shield, star: 1 }
    accessory_1: null
    accessory_2: null

stash:
  gold: 1200
  items:
    - { id: shortsword, star: 5, enhancement: 2, abilities: [flame] }
    - { id: healing_potion, count: 3 }

companions:
  roster: [kira, torvin, shade, mara, grik]
  active: [kira, torvin]

progression:
  worlds_unlocked: [w1, w2]
  worlds_completed: [w1]
  reputation: 12
  world_quests_completed: [the_deserter, wounded_priest]
  flags: { goblin_warlord_defeated: true }
  town_upgrades: { blacksmith: 2, alchemist: 1 }

run:
  active: true
  world: w1
  zone: zone_3
  seed: 48291
  carried_inventory:
    - { id: healing_potion, count: 2 }
    - { id: rusty_dagger, star: -1 }
  carried_gold: 340
  companion_state:
    kira: { hp: 30, max_hp: 45, status: active }
    torvin: { hp: 45, max_hp: 45, status: active }
    shade: { hp: 0, max_hp: 38, status: ko }
  contracts: [{ id: kill_goblins, progress: 7, target: 10 }]
  map_state: { fog: [], doors_opened: [] }
  cooldowns: { shield_bash: 2 }
```

---

## Post-MVP

| Feature | When |
|---|---|
| 3 character slots | When players want alt builds |
| Cloud save | When/if accounts exist |
| Ironman mode | Optional challenge (one save, deleted on load) |
| Manual save at town | If players request it |

---

## Open Questions

- Save file versioning for migrations when data format changes?
- Max localStorage size concern (~5-10MB, should be plenty)?
- Encrypt save to prevent easy editing? (Probably not worth it for single player)
