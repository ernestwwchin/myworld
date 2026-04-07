# Remote Debug Bridge

Backend-to-frontend debug interface using SSE + curl. Requires `DEBUG_TOOLS=1`.

## Starting the Server

```bash
DEBUG_TOOLS=1 node server.js
```

Open the game in a browser at `http://localhost:3000`. The frontend auto-connects to the SSE channel.

Verify connection:
```bash
curl -s http://localhost:3000/_debug/clients
# → {"connected":1}
```

## Sending Commands

All commands go through a single endpoint:

```bash
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"<COMMAND>","args":{...}}'
```

Optional `"timeout": 15000` (ms, max 30000) to override the default 10s wait.

---

## Command Reference

### Read State

| Command | Args | Returns |
|---------|------|---------|
| `getState` | — | `mode`, `playerTile`, `playerHP`, `playerAP`, `playerMoves`, `diceWaiting`, `combatGroup`, `enemies`, etc. |
| `getLogs` | `limit` (default 50) | Last N debug log events |
| `getFlags` | — | All game flags (serialized) |

```bash
# Get full game state
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"getState"}'

# Get last 10 log events
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"getLogs","args":{"limit":10}}'

# Pretty-print state summary
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"getState"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)['result']
print(f'Mode:{d[\"mode\"]} Pos:({d[\"playerTile\"][\"x\"]},{d[\"playerTile\"][\"y\"]}) HP:{d[\"playerHP\"]}/{d[\"playerMaxHP\"]} AP:{d[\"playerAP\"]} Moves:{d[\"playerMoves\"]} DiceWait:{d[\"diceWaiting\"]}')
"
```

### Actions

| Command | Args | Description |
|---------|------|-------------|
| `move` | `x`, `y` | Pathfind + move player to tile (bypasses onTap) |
| `tap` | `x`, `y` | Simulate a full click at tile (goes through onTap pipeline) |
| `tapEnemy` | `enemyIndex` | Simulate click on enemy by index in `enemies[]` |
| `selectAction` | `action` | Select combat action: `attack`, `dash`, `hide`, `flee` |
| `attack` | `enemyIndex` | Direct attack (bypasses selectAction + tap) |
| `endTurn` | — | End player turn |

```bash
# Move player to tile (3, 5)
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"move","args":{"x":3,"y":5}}'

# Simulate full click at tile (10, 2) — triggers whatever onTap would do
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"tap","args":{"x":10,"y":2}}'

# Select Attack action then tap enemy tile
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"selectAction","args":{"action":"attack"}}'

# Direct attack enemy index 0
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"attack","args":{"enemyIndex":0}}'
```

### UI Control

| Command | Args | Description |
|---------|------|-------------|
| `dismissPopups` | — | Close all open popups, reset `diceWaiting` |
| `dismissDice` | — | Dismiss dice overlay (triggers `_handleDiceDismiss`) |
| `screenshot` | — | Returns base64 PNG data URL of canvas |

```bash
# Dismiss all popups
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"dismissPopups"}'
```

### Event System

| Command | Args | Description |
|---------|------|-------------|
| `setFlag` | `key`, `value` | Set a game flag |
| `runEvent` | `id`, `data` | Fire a named event trigger |
| `startDialog` | `id` | Start a dialog tree |

```bash
# Set a flag
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"setFlag","args":{"key":"core.tutorial_done","value":true}}'
```

### Eval (Arbitrary JS)

Executes any JS expression with access to `scene`, `Flags`, `EventRunner`, `DialogRunner`.

```bash
# Check enemy positions
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"eval","args":{"expr":"scene.enemies.filter(e=>e.alive).map(e=>({type:e.type,pos:[e.tx,e.ty]}))"}}'

# Force enter combat with enemy 0
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"eval","args":{"expr":"(scene.enterCombat([scene.enemies[0]]), \"ok\")"}}'

# Set global light to bright
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"eval","args":{"expr":"(scene.globalLight=\"bright\", scene.updateFogOfWar(), \"bright\")"}}'

# Check DOM element state
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"eval","args":{"expr":"document.getElementById(\"action-bar\").className"}}'
```

---

## Architecture

```
┌──────────────┐    POST /_debug/exec     ┌──────────────┐
│   Terminal    │ ───────────────────────► │   Server     │
│   (curl)     │                          │  (Express)   │
│              │ ◄─────────────────────── │              │
│              │    JSON response          │              │
└──────────────┘                          └──────┬───────┘
                                                 │ SSE /_debug/channel
                                                 ▼
                                          ┌──────────────┐
                                          │   Browser    │
                                          │ (debug-      │
                                          │  logger.js)  │
                                          │              │
                                          │ POST /_debug/│
                                          │   response   │
                                          └──────────────┘
```

1. **curl** sends `POST /_debug/exec` with `{cmd, args}`
2. **Server** assigns an ID, pushes command to browser via **SSE**
3. **Browser** (`_execDebugCmd`) executes the command on `GameScene`
4. **Browser** posts result back to `POST /_debug/response`
5. **Server** resolves the pending promise, returns result to **curl**

## Typical Test Session

```bash
# 1. Start server
DEBUG_TOOLS=1 node server.js &

# 2. Open browser, wait for connection
sleep 3
curl -s http://localhost:3000/_debug/clients  # {"connected":1}

# 3. Get initial state
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" -d '{"cmd":"getState"}'

# 4. Set bright light (so enemies can spot player)
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"eval","args":{"expr":"(scene.globalLight=\"bright\", scene.updateFogOfWar(), \"bright\")"}}'

# 5. Force combat
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" \
  -d '{"cmd":"eval","args":{"expr":"(scene.enterCombat([scene.enemies[0]]), \"ok\")"}}'

# 6. Wait for turn setup, then select attack
sleep 2
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" -d '{"cmd":"selectAction","args":{"action":"attack"}}'

# 7. Attack first combat enemy
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" -d '{"cmd":"attack","args":{"enemyIndex":0}}'

# 8. Check state after attack
sleep 2
curl -s -X POST http://localhost:3000/_debug/exec \
  -H "Content-Type: application/json" -d '{"cmd":"getState"}'
```

## Files

| File | Role |
|------|------|
| `server.js` (lines 118–206) | SSE channel, exec endpoint, response collection |
| `js/systems/debug-logger.js` (lines 109–297) | SSE client, command executor (`_execDebugCmd`) |
| `js/game.js` (line 200) | `initDebugBridge()` call in `create()` |
