# Battle System Rules And Conditions

This document describes the current combat behavior implemented in the game.

## 1. Combat Entry

Combat starts when one of these happens:

- Player is spotted during explore mode.
- Player manually engages an enemy from the enemy popup.

BG3-style engage opener rule:

- Engage first attempts to move to melee adjacency in explore mode.
- An opener attack is resolved before combat mode starts.
- If opener misses, combat does not start.
- If opener lands, combat starts immediately after hit resolution.

On entry:

- Movement tween/path is canceled and player is snapped to last completed tile.
- Mode switches to turn-based combat UI.
- Initiative order is rolled for all participants (player + alerted enemies).

## 2. Alerting Rules

Alerting is built from initial trigger enemies, then expanded by rules.

### 2.1 Direct sight alert

Any alive enemy can be alerted if:

- Player is within that enemy sight range, and
- line of sight is clear.

### 2.2 Scripted group alert

If any triggered enemy has a non-empty group value:

- all alive enemies with the same group are immediately alerted.

This is intended for scripted encounter behavior.

### 2.3 Room-based propagation

After initial alert set is built, additional enemies can join iteratively if they are:

- in the same room as any already alerted enemy, with a distance cap,
- in a side room connected by a door to an alerted enemy,
- directly side-adjacent (Manhattan distance 1) to an alerted enemy.

Propagation is iterative, so chain reactions are possible.

### 2.4 Large-room limit

Same-room propagation is capped by distance to avoid pulling very large rooms at once.

Config key:

- combat.roomAlertMaxDistance

## 3. Turn Structure

Initiative rule reminder:

- Order is based on initiative total (roll + Dexterity modifier), highest first.
- Surprise does not change initiative score.
- Surprised actors skip their first turn only.

### 3.1 Player turn resources

Each player turn starts with:

- 1 Action
- 6 Movement

### 3.2 Enemy turns

Enemies act in initiative order and try to:

- move toward player,
- attack if adjacent/in range.

## 4. Player Actions

### 4.1 Attack (1 Action)

- Requires available action.
- Requires target in attack range.
- Uses d20 attack roll vs target AC.
- Damage uses configured dice spec.
- Critical and miss handling is applied.

### 4.2 Dash (1 Action)

- Consumes action.
- Grants +6 movement for current turn.

### 4.3 Flee (1 Action, BG3-style gate)

Flee succeeds only if all conditions are true:

- player turn,
- action available,
- nearest alive combat enemy is at least fleeMinDistance tiles away,
- no alive combat enemy currently has line of sight to player (unless disabled by config).

On success:

- action is consumed,
- combat exits with flee result/state messaging.

Config keys:

- combat.fleeMinDistance
- combat.fleeRequiresNoLOS

## 5. Movement Rules In Combat

- Player cannot move through walls.
- Player cannot move onto alive enemy tiles.
- Move range is limited by remaining movement.
- Move reset returns player to turn start tile and restores movement if movement was spent.

## 6. Move & Attack Interaction

When selecting enemy popup Move & Attack:

- if a full route to adjacency is reachable this turn: move adjacent then attack,
- if not reachable: spend remaining movement to move closer on best path.

## 7. Dice Popup Input Lock

While dice popup is in tap-to-continue state:

- movement/input is blocked until dismiss.

## 8. Combat End Conditions

Combat exits when:

- all enemies in current combat group are dead (victory), or
- player successfully uses Flee (escape).

## 9. Data-Driven Controls

Core combat tuning values are loaded from data rules.

Current keys in rules data:

- combat.roomAlertMaxDistance
- combat.fleeMinDistance
- combat.fleeRequiresNoLOS

Group-based scripted encounters are defined via encounter group values in map encounter entries.
