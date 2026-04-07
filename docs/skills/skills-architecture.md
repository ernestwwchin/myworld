# Skills: Architecture & Module Design

Patterns for extracting and organizing game systems. Load when refactoring or creating new modules.

## Module Extraction Pattern

Every system module follows this structure:

```javascript
const GameScene[Name]System = {
  publicMethod() {
    // Uses `this` to access GameScene state
  },

  _privateHelper() {
    // Prefix with underscore
  }
};

Object.assign(GameScene.prototype, GameScene[Name]System);
```

- File: `js/systems/[name]-system.js`
- Loaded via `<script>` tag in `index.html` after `game.js`
- Methods access scene state through `this` (bound at call time)

## System Integration Points

```
Fog System ↔ Sight System        Visibility affects detection
Combat System ↔ Movement System  Position affects combat
UI System ↔ All Systems           Displays reflect state
Ability System ↔ Combat System    Apply effects in combat
EventRunner ↔ Movement System    Tile triggers on player step
EventRunner ↔ DialogRunner        Events open dialog trees
Flags ↔ EventRunner/DialogRunner  Shared state store
```

## Event System (Standalone, not mixin)

Three standalone objects (not GameScene mixins):

| Object | File | Pattern |
|--------|------|---------|
| `Flags` | `js/systems/flags.js` | Global singleton, no scene ref |
| `EventRunner` | `js/systems/event-runner.js` | Singleton, receives scene via `init(scene)` |
| `DialogRunner` | `js/systems/dialog-runner.js` | Singleton, receives scene via `init(scene)` |

These load **before** `game.js` (Flags must exist for ModLoader). Wired in `create()`:
```javascript
EventRunner.init(this, ModLoader._modData?._stageEvents || []);
DialogRunner.init(this, ModLoader._modData?._stageDialogs || {});
```

Movement system fires triggers:
```javascript
if (typeof EventRunner !== 'undefined') EventRunner.onPlayerTile(next.x, next.y);
```

## Adding a New Module

1. Create `js/systems/[name]-system.js` with the pattern above
2. Add `<script>` tag in `index.html` (after `game.js`, before UI)
3. Remove extracted methods from `game.js`, add comment pointing to module
4. Add test file `tests/test-[name]-system.js`
5. Run `node tests/run-tests.js`

## Performance Considerations

- Minimize DOM manipulation in game loops
- Use object pooling for frequently created sprites
- Cache expensive calculations (visibility, pathfinding)
- Batch sprite updates instead of individual changes
- Use dirty flags to avoid unnecessary recalculations

## Event Patterns

```javascript
// Emit
this.emit('player_moved', { from: oldPos, to: newPos });
this.emit('combat_started', { enemies: engagedEnemies });

// Listen
this.events.on('player_moved', this.updateFogOfWar, this);
```
