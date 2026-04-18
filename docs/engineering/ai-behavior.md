---
tags: [myworld, docs]
---

# AI Behavior Design — MyWorld RPG

## Overview

Each entity (enemy, NPC) runs through a **state machine** with per-entity private state.
The scene calls `doEnemyTurn(enemy)` each combat turn and `wanderEnemies()` / `checkSight()`
during explore mode.

---

## Entity State Fields

Every enemy/NPC object carries these runtime fields (set at spawn time):

| Field | Type | Description |
|---|---|---|
| `alive` | bool | Is the entity alive? |
| `inCombat` | bool | Is the entity in the current combat group? |
| `aiState` | string | Current AI state (see below) |
| `lastSeenPlayerTile` | {x,y} | Last tile where player was confirmed visible |
| `searchTurnsRemaining` | number | Turns left to search before giving up |
| `patrolPath` | [{x,y}] | Ordered waypoints for PATROL state (optional) |
| `patrolIndex` | number | Current waypoint index |
| `homePosition` | {x,y} | Spawn tile — return here after SEARCH gives up |

---

## AI States

```
IDLE ──────► ALERT ──────► COMBAT
  ▲             │ (player lost)    │ (player dead / fled)
  │             ▼                  ▼
PATROL ◄─── SEARCH ◄──────── SEARCH
                │ (timer 0)
                ▼
              RETURN (walk home)
```

### IDLE
- Entity stands still, plays look-around animation or random emote.
- Transitions to ALERT when player enters sight+LOS range.
- Example creatures: sleeping guards, seated NPCs.

### PATROL
- Entity follows a list of `patrolPath` waypoints in order (looping).
- Pauses briefly at each waypoint (emote / look-around).
- Transitions to ALERT when player enters sight+LOS range.
- If `patrolPath` is empty, falls back to random wander (current behaviour).
- Example creatures: goblin guard walking a corridor.

### ALERT
- Entity has spotted the player. Triggers `enterCombat`.
- All group members are also alerted.
- Transition: immediately moves to COMBAT on same frame.

### COMBAT
- Active turn-based combat. Entity uses its `availableActions` list.
- Action priority (default):
  1. **Attack** if adjacent to player and HP > flee threshold.
  2. **Move toward player** if not adjacent, using BFS.
  3. **Flee** if HP ≤ flee threshold (e.g. 25%).
- Transition to SEARCH when `playerHidden = true`.
- Transition to RETURN when all enemies in group die (or combat exits).

### SEARCH
- Player successfully hid. Entity moves toward `lastSeenPlayerTile`.
- `searchTurnsRemaining` counts down each turn THE ENTITY TAKES (not global).
- On arrival at last-known tile: pauses 1 turn, looks around, then gives up.
- Hearing radius: if player moves within 2 tiles during search, entity re-alerts.
- Transition to COMBAT if player becomes visible again.
- Transition to RETURN when `searchTurnsRemaining` reaches 0.

### RETURN
- Entity walks back to its `homePosition` (spawn tile).
- On arrival: reverts to PATROL or IDLE.
- During RETURN, entity can be re-alerted if player walks into sight again.

---

## Action System

Each creature in `creatures.yaml` may define an `ai:` block:

```yaml
goblin:
  ai:
    profile: aggressive         # aggressive | cautious | patrol | idle | mining
    fleeHpPercent: 0            # flee when HP% ≤ this (0 = never flee)
    searchTurns: 4              # turns to search after player hides
    patrolPath: []              # list of {x, y} waypoints (optional)
    availableActions:           # ordered by priority
      - attack
      - move_toward_player
    hearingRadius: 2            # tiles — re-alert during SEARCH if player this close
```

### Built-in Action IDs

| Action ID | Description |
|---|---|
| `attack` | Melee attack if adjacent |
| `move_toward_player` | BFS move toward player (or lastSeenTile in SEARCH) |
| `move_patrol` | Step to next patrol waypoint |
| `move_random` | Random wander step |
| `flee_from_player` | BFS move away from player |
| `search_area` | Spiral/sweep search pattern around lastSeenTile |
| `return_home` | BFS move toward homePosition |
| `idle_look` | Stand still, rotate facing, play emote |
| `mine` | Play mining animation on adjacent WALL/CHEST tile |

---

## Loopholes & Known Bugs

### CRITICAL

**[BUG-1] `searchTurnsRemaining` never decrements (game.js active code)**
- `tryHideAction` sets `searchTurnsRemaining = 4` per enemy.
- `advanceEnemyTurn` in `game.js` does NOT decrement it.
- `doEnemyTurn` in `game.js` does NOT decrement it.
- **Result:** enemies search forever when `playerHidden = true`.
- **Fix:** Enemy decrements its own `searchTurnsRemaining` at the START of its turn.

**[BUG-2] `ai.js` is dead code — mixin never applied**
- `EnemyAI` object is defined in `ai.js` but `Object.assign(GameScene.prototype, EnemyAI)`
  is never called.
- Both `game.js` and `ai.js` define `doEnemyTurn`, `doEnemyAttack`, `advanceEnemyTurn`,
  `wanderEnemies`, `checkSight`, `animEnemyMove`.
- **Result:** `ai.js` has no effect. `game.js` versions run.
- **Fix:** Add `Object.assign(GameScene.prototype, EnemyAI)` after the class definition
  in `game.js`, and remove the duplicate methods from `game.js`.

**[BUG-3] Player alpha not reset on `exitCombat`**
- If player was hiding (`playerHidden = true`, `player.alpha = 0.4`) and combat
  ends for any reason (all enemies die, flee), `exitCombat` never calls
  `player.setAlpha(1)` or resets `playerHidden`.
- **Result:** Player stays semi-transparent in explore mode.
- **Fix:** Add `this.playerHidden = false; this.player.setAlpha(1);` in `exitCombat`.

### Moderate

**[BUG-4] `afterMove` in game.js can attack a hidden player**
- In game.js's `doEnemyTurn`, when the enemy arrives at `lastSeenPlayerTile` and is
  adjacent, `afterMove` calls `doEnemyAttack` without checking `playerHidden`.
- `ai.js` correctly guards this with `if (this.playerHidden) { this.advanceEnemyTurn(); return; }`.
- **Fix:** Guard `afterMove` with `if (this.playerHidden) { this.advanceEnemyTurn(); return; }`.

**[BUG-5] `wanderEnemies` does not check doors**
- Enemies wander through closed/locked doors during explore mode.
- `game.js` wander loop only checks `MAP[ny][nx] === TILE.WALL`.
- **Fix:** Also check `MAP[ny][nx] === TILE.DOOR && this.isDoorClosed(nx, ny)`.

**[BUG-6] `animEnemyMove` facing direction wrong for multi-step paths**
- `const fdx = step.x - enemy.tx` computes direction from the enemy's ORIGINAL tile
  for ALL animation steps (since `enemy.tx` is only updated when the full move completes).
- Steps 2, 3, etc. show wrong facing direction.
- **Fix:** Track previous step position inside the recursive animation function.

**[BUG-7] BFS in SEARCH mode blocks on current player tile, not target tile**
- The path-building loop has `if(t.x === this.playerTile.x && t.y === this.playerTile.y) break`.
- When searching (target = lastSeenTile ≠ current player tile), this may cut the path
  short if the player happened to move onto a tile that sits between enemy and lastSeenTile.
- **Fix:** Only apply the player-tile block when NOT searching (`!this.playerHidden`).

### Design Gaps (Not Bugs, But Needed)

**[DESIGN-1] No formal `aiState` per entity**
- Current system: `inCombat` (bool) + `searchTurnsRemaining` (number) only.
- Cannot represent PATROL, RETURN, IDLE, MINING, etc.
- **Planned fix:** Add `aiState` field and handle each state in `doEnemyTurn` / `wanderEnemies`.

**[DESIGN-2] No patrol waypoints**
- Enemies wander randomly; no way to define a patrol route.
- **Planned fix:** `patrolPath` + `patrolIndex` per creature in YAML.

**[DESIGN-3] Player always goes first (initiative = 999)**
- Turn order only uses initiative rolling for enemies.
- D&D 5e: player rolls DEX check vs. enemies at combat start.
- **Planned fix:** Roll `1d20 + dex_mod` for player too.

**[DESIGN-4] No enemy flee / morale**
- Enemies fight to the death regardless of HP.
- **Planned fix:** `fleeHpPercent` in YAML `ai:` block triggers FLEE state.

**[DESIGN-5] No hearing mechanic**
- Enemies only detect player via sight.
- Player moving fast/using metal armor should make noise.
- **Planned fix:** `hearingRadius` in `ai:` block; checked during SEARCH when player moves.

**[DESIGN-6] No way to configure per-creature actions**
- All enemies use identical behavior (move-toward → attack).
- **Planned fix:** `availableActions` list in YAML `ai:` block.
