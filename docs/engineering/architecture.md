---
tags: [myworld, engineering, architecture]
---

# Architecture & Module Design

Patterns for extracting and organizing game systems. Read when refactoring or creating new modules.

## Module extraction pattern

Every system module is a mixin exported from its own file:

```typescript
export const GameScene[Name]System = {
  publicMethod(this: GameScene) {
    // Uses `this` to access GameScene state
  },

  _privateHelper(this: GameScene) {
    // Prefix with underscore
  }
};

// At bottom of file, augment the GameScene interface:
declare module '@/game' {
  interface GameScene extends typeof GameScene[Name]System {}
}
```

- File: `src/systems/[name]-system.ts`
- Assembled in `src/game.ts` via `Object.assign(GameScene.prototype, ...)`
- Methods access scene state through `this` (bound at call time)

## System integration points

```
Fog System ↔ Sight System         Visibility affects detection
Combat System ↔ Movement System   Position affects combat
UI System ↔ All Systems            Displays reflect state
Ability System ↔ Combat System     Apply effects in combat
EventRunner ↔ Movement System     Tile triggers on player step
EventRunner ↔ DialogRunner         Events open dialog trees
Flags ↔ EventRunner/DialogRunner   Shared state store
```

## Event runner / dialog runner / flags (standalone, not mixin)

Three standalone objects (not GameScene mixins):

| Object | File | Pattern |
|--------|------|---------|
| `Flags` | `src/systems/flags.ts` | Global singleton, no scene ref |
| `EventRunner` | `src/systems/event-runner.ts` | Singleton, receives scene via `init(scene)` |
| `DialogRunner` | `src/systems/dialog-runner.ts` | Singleton, receives scene via `init(scene)` |

Wired in `create()`:

```typescript
EventRunner.init(this, ModLoader._modData?._stageEvents || []);
DialogRunner.init(this, ModLoader._modData?._stageDialogs || {});
```

Movement system fires triggers:

```typescript
EventRunner.onPlayerTile(next.x, next.y);
```

## Adding a new module

1. Create `src/systems/[name]-system.ts` with the mixin pattern above.
2. Import and add to `Object.assign(GameScene.prototype, ...)` in `src/game.ts`.
3. Remove extracted methods from `game.ts`; add a `declare module '@/game'` augmentation block.
4. Add a sandbox unit test under `tests/unit/sandbox/[name]-system.test.js` (see [testing.md](testing.md)).
5. Run `npm test` to confirm contracts and unit suites still pass.

## Performance considerations

- Minimize DOM manipulation in game loops.
- Use object pooling for frequently created sprites.
- Cache expensive calculations (visibility, pathfinding).
- Batch sprite updates instead of individual changes.
- Use dirty flags to avoid unnecessary recalculations.

## Phaser event patterns

```typescript
// Emit
this.emit('player_moved', { from: oldPos, to: newPos });
this.emit('combat_started', { enemies: engagedEnemies });

// Listen
this.events.on('player_moved', this.updateFogOfWar, this);
```
