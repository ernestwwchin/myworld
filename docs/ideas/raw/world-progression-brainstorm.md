# World Progression Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decisions

- **Kill world boss → next world unlocks** (simple, clear)
- **Everything persistent carries between worlds** (level, gear, stash, companions)
- **One run = one world** (pick at The Gate, run zones, extract or die)
- **One town** that grows with progression
- **Can backtrack** to earlier worlds (for farming, missed quests)
- **Enemies don't scale** — W1 is always W1 difficulty
- **Reduced returns** in lower worlds (XP/gold less efficient)
- **No URL routing** — single page, Phaser scene transitions

---

## World Unlock

| Unlock | Requirement |
|---|---|
| W1 | Always available (starting world) |
| W2 | Kill W1 boss (Goblin Warlord) |
| W3 | Kill W2 boss |
| W4 | Kill W3 boss |
| W5 | Kill W4 boss |

---

## What Carries Between Worlds

| Carries Over | Always |
|---|---|
| Level + XP | ✓ |
| Stats + milestones | ✓ |
| Skills | ✓ |
| Equipped gear | ✓ |
| Stash (items + gold) | ✓ |
| Companion roster + upgrades | ✓ |
| Reputation | ✓ |
| Town upgrades | ✓ |
| Completed world quests | ✓ |
| Story flags | ✓ |

No resets between worlds. Same character, growing stronger.

---

## Backtracking

All unlocked worlds accessible from town via The Gate.

```
THE GATE (Town):
  > W1: Goblin Invasion (Completed ✓)
  > W2: The Underdark (New!)
  > W3: 🔒 (Defeat W2 boss)
```

### Why Go Back?

- Farm specific materials (companion upgrades)
- Complete missed world quests
- Contracts (quest board may offer older world contracts)
- Level up if underleveled for next world

### Reduced Returns

W1 at player level 8: XP reduced, loot still Common tier. W2 is always more efficient for progression.

---

## World Difficulty Curve

| World | Expected Level | Enemy HP Range | Enemy Damage | Gold/Kill |
|---|---|---|---|---|
| W1 | 1-3 | 8-30 | 1d6+1 to 1d8+3 | 5-15g |
| W2 | 3-5 | 20-60 | 1d8+2 to 1d10+5 | 10-25g |
| W3 | 5-7 | 40-100 | 1d10+3 to 2d8+5 | 20-40g |
| W4 | 7-9 | 60-150 | 2d6+4 to 2d10+6 | 30-60g |
| W5 | 9-10 | 80-200 | 2d8+5 to 2d12+8 | 50-100g |

---

## Run Flow

```
1. Town: prepare (shop, stash, companions, contracts)
2. The Gate: pick world
3. Enter world: Zone 1 → Zone 2 → ... → Boss
4. Extract OR die → back to town
5. Repeat
```

One run = one world. Come back to town between worlds.

---

## Town: One Hub, Growing

One town across all worlds. The Gate leads to all unlocked worlds.

```
TOWN FACILITIES:
  - Blacksmith (upgrade gear)
  - Alchemist (potions/scrolls)
  - Companion Shrine (manage roster)
  - Quest Board (contracts)
  - Stash (storage)
  - Shop (buy/sell)
  - Respec NPC (200g/500g)
  - The Gate (portal to worlds)
```

### Town Upgrades

| Trigger | Town Change |
|---|---|
| W1 complete | Blacksmith level 2 (better upgrades) |
| W2 complete | Alchemist level 2 (better potions), new shop stock |
| W3 complete | Companion Shrine expanded |
| W4 complete | Enchanter unlocked (new NPC) |
| W5 complete | Everything maxed |
| Reputation milestones | Better contract offerings |
| World quests | Some unlock town NPCs/features |

---

## First Clear vs Re-Run

| | First Clear | Re-Run |
|---|---|---|
| Boss available | Yes | Yes (re-fight for loot) |
| Milestone reward | Yes (+2 stat) | **No** (already claimed) |
| World quests | Available | Only uncompleted ones |
| Zone layout | Seeded (new each run) | New seed each run |
| Contracts | From quest board | Fresh selection |
| Why do it | Progression | Farm gold/XP/materials, complete quests |

---

## Power Curve Across Full Game

```
W1 (first clear): Level 1→3
  +2 stat milestone
  5 companions unlocked
  ~1000g earned
  Common-Uncommon gear

W2 (first clear): Level 3→5
  (no milestone — next at W3 boss)
  4 more companions
  ~2000g earned
  Uncommon-Rare gear

W3 (first clear): Level 5→7
  +2 stat milestone
  3 more companions
  ~3000g earned
  Rare gear

W4 (first clear): Level 7→9
  (no milestone — next at W5 boss)
  3 more companions
  ~4000g earned
  Rare-Boss tier gear

W5 (first clear): Level 9→10
  +2 stat milestone (final)
  2-3 more companions
  ~5000g earned
  Best gear in game
  GAME COMPLETE
```

---

## Death in Any World

Same penalty regardless of world:

| What's Lost | Rule |
|---|---|
| 50% XP progress to next level | Never lose a level |
| Carried inventory | Lost (equipped gear kept) |
| 30% carried gold | Lost |
| Active contracts | Failed |
| Companion KO state | All return at town |
| World quest progress | Kept (resume next run) |

---

## Enemy Scaling

**No scaling.** W1 enemies are always W1 difficulty.

Returning to W1 at level 10 = stomping goblins. That's the reward for being powerful.

Exception (post-MVP): bounty contracts might spawn level-scaled targets.

---

## Test Stages ≠ Worlds

| | Game Worlds | Test Stages |
|---|---|---|
| Purpose | Player content | Automated testing |
| Visible at The Gate | Yes | **No** |
| Part of progression | Yes (W1→W5) | No |
| Mod | `01_goblin_invasion`, etc. | `00_core_test` |
| Loaded by default | Yes | No (disabled) |

Test stages are invisible to the player. Dev/CI only.

---

## URL & Navigation

### No URL Routing

Single page app. All navigation via Phaser scene transitions.

| URL | Purpose |
|---|---|
| `myworld.com/` | Game. Loads save. Resumes. |
| `?debug=1` | Debug overlay |
| `?seed=N` | Force run seed |
| `?stage=X` | Jump to stage (dev) |
| `?mod=X` | Enable specific mod |
| `?autoplay=1` | Autoplay mode |
| `?reset=1` | Clear save on load (dev) |

### Phaser Scene Flow

```
MainMenuScene → (new game / continue)
  ↓
CharacterCreateScene → (first time only, 27-point buy)
  ↓
TownScene → (hub: shop, stash, gate, shrine, board)
  ↓ (via The Gate)
GameScene → (dungeon: explore, combat, zones)
  ↓ (extract / die / boss kill)
TownScene → (back to hub)
```

Browser refresh → reload from save → resume.

---

## Post-W5 (Post-MVP)

| Option | Description |
|---|---|
| Challenge maps | Shiren-style hand-crafted hard content |
| Endless mode | Harder re-runs with scaling difficulty |
| New Game+ | Restart with some carry-over |

MVP: game ends at W5 boss. Credits. Post-game content deferred.

---

## World Themes (Sketch)

| World | Name | Biome | Boss |
|---|---|---|---|
| W1 | Goblin Invasion | Forest → caves → warren | Goblin Warlord |
| W2 | (TBD) | Underground / dark | TBD |
| W3 | (TBD) | Jungle / ruins | TBD |
| W4 | (TBD) | Volcanic / fortress | TBD |
| W5 | (TBD) | Void / endgame | TBD |

---

## Open Questions

- W2-W5 world themes and boss identities?
- Exact XP reduction formula for lower-world farming?
- Do town upgrades cost gold or are they automatic on world clear?
- How does The Gate look visually? (Portal hub?)
- Can you run multiple worlds in sequence without returning to town?
- New Game+ design (if implemented)?
