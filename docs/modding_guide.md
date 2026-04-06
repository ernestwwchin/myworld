# Modding Guide

How to create mods for MyWorld RPG. Covers YAML data mods, JavaScript hooks, and restrictions.

### Game Loop

```
  EXPLORE MODE                    COMBAT MODE
  +-----------+    Enemy spots   +------------+
  | Move      |---------------->| Initiative |
  | Open door |                 | rolled     |
  | Hide      |    Victory /    +-----+------+
  | Interact  |<---Flee---------+     |
  +-----------+                       v
                              +-------+--------+
                              | Player Turn    |
                              | (Move + Action)|
                              +-------+--------+
                                      |
                              +-------v--------+
                              | Enemy Turn(s)  |
                              +-------+--------+
                                      |
                              +-------v--------+
                              | Next Round     |
                              | (repeat)       |
                              +----------------+

  HOOKS fire at: combat start/end, turn start/end,
  attack hit/miss, damage, hide, tile enter, flee
```

---

## Mod Tiers

| Tier | Skill Level | What You Can Do | JS Required? |
|------|-------------|----------------|--------------|
| **1. Data Mod** | Beginner | Add creatures, weapons, spells, classes, stages | No |
| **2. Tuning Mod** | Beginner | Change combat rules, fog, light, door behavior | No |
| **3. Hook Mod** | Intermediate | Add effects on combat events using built-in effect types | No (YAML only) |
| **4. Script Mod** | Advanced | Custom JS logic in hooks for complex behavior | Yes |

**Most mods should be Tier 1–3.** JS scripting (Tier 4) is for edge cases.

---

## Mod Folder Structure

```
data/
  mymod/
    meta.yaml          # Required: mod metadata + file list
    creatures.yaml     # Optional: new/override creatures
    weapons.yaml       # Optional: new/override weapons
    abilities.yaml     # Optional: new/override abilities + hooks
    classes.yaml       # Optional: new/override classes
    statuses.yaml      # Optional: new/override status effects
    rules.yaml         # Optional: override combat/fog/light tuning
  stages/
    mymod_dungeon/
      stage.yaml       # Map grid, encounters, lights, events
```

### meta.yaml

```yaml
id: mymod
name: "My Cool Mod"
author: "YourName"
version: "1.0.0"
description: "Adds new creatures and a dungeon."
loadOrder: 10          # Higher = loads later (overrides earlier mods)
enabled: true

includes:
  - creatures.yaml
  - weapons.yaml
  - abilities.yaml
```

### modsettings.yaml

```yaml
activeMap: mymod_dungeon

mods:
  - core          # Always load core first
  - mymod         # Your mod loads after, overrides core
```

---

## Tier 1: Data Mods (No JS)

### Add a Creature

```yaml
# data/mymod/creatures.yaml
creatures:
  dire_wolf:
    name: Dire Wolf
    icon: "🐺"
    cr: "1"
    xp: 200
    hp: 37
    ac: 14
    speed: 3
    sight: 6
    fov: 180
    stats: { str: 17, dex: 15, con: 15, int: 3, wis: 12, cha: 7 }
    skills: [perception, stealth]
    attack: { weaponId: bite, dice: "2d6+3", range: 1 }
```

### Add a Weapon

```yaml
# data/mymod/weapons.yaml
weapons:
  bite:
    name: Bite
    category: natural
    damageType: piercing
    damageDice: "2d6+3"
    range: 1
    properties: []
```

### Add a Stage

```yaml
# data/stages/mymod_dungeon/stage.yaml
name: "Wolf Den"
floor: B1F
globalLight: dark

grid:
  - "##########"
  - "#........#"
  - "#..##..#.#"
  - "#........#"
  - "#...##...#"
  - "#........#"
  - "##########"

playerStart: { x: 1, y: 1 }

encounters:
  - { creature: dire_wolf, x: 5, y: 3, facing: 180, group: wolves }
  - { creature: dire_wolf, x: 7, y: 5, facing: 90,  group: wolves }

lights:
  - { x: 4, y: 3, radius: 3, level: dim }
```

---

## Tier 2: Tuning Mods (No JS)

Override rules without changing code:

```yaml
# data/mymod/rules.yaml
combat:
  playerMovePerTurn: 6       # Default: 5
  dashMoveBonus: 5            # Default: 4
  fleeMinDistance: 4           # Default: 6 (easier to flee)
  enemySightScale: 1.0        # Default: 0.85 (enemies see further)

fog:
  radius: 10                  # Default: 7 (see further)
  exploredAlpha: 0.4          # Default: 0.62 (explored areas brighter)

light:
  darkSightPenalty: 5         # Default: 3 (darkness is more dangerous)
```

---

## Tier 3: Hook Mods (YAML Effects, No JS)

Use built-in effect types in ability hooks. No JS needed.

### Available Hook Points

| Hook | When It Fires | Context Variables |
|------|--------------|-------------------|
| `on_combat_start` | Combat begins | `player`, `enemies`, `mode` |
| `on_combat_end` | Combat ends | `player`, `reason` |
| `on_turn_start` | Start of any turn | `player`, `turnNumber`, `actor` |
| `on_turn_end` | End of any turn | `player`, `actor` |
| `on_attack` | Any attack resolves | `player`, `target`, `roll`, `total`, `isCrit` |
| `on_attack_hit` | Attack hits | `player`, `target`, `damage`, `isCrit` |
| `on_attack_miss` | Attack misses | `player`, `target`, `roll`, `total` |
| `on_attacked` | Player is attacked | `player`, `attacker`, `damage`, `isCrit` |
| `on_damage_taken` | Player takes damage | `player`, `damage`, `source`, `remainingHp` |
| `on_enemy_defeated` | Enemy killed | `player`, `enemy`, `xp` |
| `on_hide_attempt` | Player tries to hide | `player`, `success`, `stealthRoll` |
| `on_hidden_break` | Hidden state breaks | `player`, `reason` |
| `on_tile_enter` | Player enters tile | `player`, `tile`, `tileType` |
| `on_enemy_spotted` | Enemy sees player | `player`, `enemy`, `distance` |
| `on_flee` | Player flees combat | `player` |

### Built-In Effect Types

| Type | Description | Parameters |
|------|-------------|------------|
| `log` | Show status message | `message` (string, supports `{var}` templates) |
| `status_apply` | Apply status effect | `target`, `statusId`, `duration` |
| `modify_stat` | Temporarily change stat | `target`, `stat`, `bonus`, `duration` |
| `damage` | Deal damage | `target`, `dice`, `type` |
| `heal` | Restore HP | `target`, `dice` |
| `spawn_effect` | Visual effect | `effectId`, `position` |
| `flash_banner` | Show banner text | `text`, `style` |

### Example: Adrenaline Rush on Combat Start

```yaml
# In abilities.yaml
adrenaline_rush:
  name: "Adrenaline Rush"
  hooks:
    on_combat_start:
      effects:
        - type: log
          message: "Adrenaline surges through your veins!"
        - type: modify_stat
          target: player
          stat: speed
          bonus: 1
          duration: 2
        - type: status_apply
          target: player
          statusId: adrenaline
          duration: 3
```

### Example: Counter-Attack Passive

```yaml
riposte_passive:
  name: "Riposte"
  requiresClass: Fighter
  requiresLevel: 3
  hooks:
    on_attacked:
      condition: "!isCrit && damage > 0"    # Simple expression (no JS function needed)
      effects:
        - type: log
          message: "You riposte for bonus damage!"
        - type: damage
          target: attacker
          dice: "1d8"
          type: piercing
```

---

## Tier 4: Script Mods (Advanced JS)

For behavior that can't be expressed with built-in effects.

### JS Hook API

Hook functions receive a **`mod` helper object** — not the raw game scene. This is the only API available to script mods.

```js
function(context, mod) {
  // context — event-specific read-only data (roll, target, damage, etc.)
  // mod     — locked-down helper with allowed methods only
}
```

> **`scene` is NOT exposed.** Modders cannot access Phaser, DOM, or game internals directly.

### Mod API — Allowed Methods

```js
// ── Display ──
mod.showStatus(message)                // Show status bar text
mod.showFloat(target, text, color)     // Floating number on actor ('player' or enemy ref)
mod.showBanner(text, style)            // Full-screen banner ('combat' | 'explore')

// ── Read Game State ──
mod.getPlayerHP()                      // → { current, max }
mod.getPlayerTile()                    // → { x, y }
mod.getPlayerStat(stat)                // → number (e.g., mod.getPlayerStat('str') → 16)
mod.getPlayerLevel()                   // → number
mod.getMode()                          // → 'explore' | 'combat' | 'explore_tb'
mod.isPlayerTurn()                     // → boolean
mod.getPlayerMoves()                   // → number (remaining movement)
mod.getPlayerAP()                      // → number (0 or 1)
mod.isPlayerHidden()                   // → boolean
mod.getEnemies()                       // → array of { type, hp, maxHp, ac, alive, tile }
mod.getCombatGroup()                   // → array (enemies in current fight)

// ── Modify Game State ──
mod.healPlayer(amount)                 // Heal player (clamped to max)
mod.damagePlayer(amount, type)         // Deal damage to player
mod.damageEnemy(enemy, amount, type)   // Deal damage to enemy
mod.setPlayerMoves(value)              // Set remaining movement
mod.setPlayerAP(value)                 // Set action points (0 or 1)
mod.setPlayerHidden(bool)             // Set hidden state
mod.applyStatus(target, statusId, duration)  // Apply status effect
mod.removeStatus(target, statusId)     // Remove status effect

// ── Dice ──
mod.roll(count, sides)                 // Roll dice: mod.roll(1, 20) → 1-20
mod.rollDamage(spec, isCrit)           // Roll damage: mod.rollDamage("2d6+3", false)
mod.abilityMod(score)                  // Modifier: mod.abilityMod(16) → 3

// ── Logging ──
mod.log(category, message)             // Debug log (visible in dev console)
```

**That's it.** No other methods or properties are available. The engine creates the `mod` object per hook call and passes only these functions.

### NOT Available (Enforced)

Modders **cannot** access:

- `window`, `document`, `fetch` — no browser/network access
- `scene`, `this` — no direct game scene
- `Phaser` — no rendering engine
- `setTimeout` / `setInterval` — no timers
- Any global variable not listed above

### Example: Vampiric Strike

```yaml
vampiric_strike:
  name: "Vampiric Strike"
  requiresClass: Fighter
  requiresLevel: 5
  hooks:
    on_attack_hit:
      fn: |
        const healAmount = Math.floor(context.damage / 2);
        mod.healPlayer(healAmount);
        mod.showFloat('player', `+${healAmount}`, '#2ecc71');
        mod.showStatus(`Vampiric Strike heals you for ${healAmount} HP!`);
```

### Example: Giant Slayer Passive

```yaml
giant_slayer:
  name: "Giant Slayer"
  hooks:
    on_attack:
      condition: "target && target.hp > 30"
      fn: |
        context.damageBonus = (context.damageBonus || 0) + 10;
        mod.showStatus('Giant Slayer: +10 damage vs large foe!');
```

### Example: Thorns Aura (Damage Attacker)

```yaml
thorns_aura:
  name: "Thorns Aura"
  hooks:
    on_attacked:
      fn: |
        const thornsDmg = mod.roll(1, 4);
        mod.damageEnemy(context.attacker, thornsDmg, 'piercing');
        mod.showStatus(`Thorns deals ${thornsDmg} damage back!`);
```

---

## Naming Conventions for Mods

| Category | Convention | Example |
|----------|-----------|---------|
| Mod folder | `snake_case` | `data/my_expansion/` |
| YAML keys (IDs) | `snake_case` | `dire_wolf`, `vampiric_strike` |
| Display names | Title Case | `"Dire Wolf"`, `"Vampiric Strike"` |
| Hook names | `snake_case` with `on_` prefix | `on_attack_hit`, `on_combat_start` |
| Status IDs | `snake_case` | `poisoned`, `burning`, `slowed` |
| Damage types | lowercase | `fire`, `radiant`, `necrotic`, `slashing` |
| Stat abbreviations | lowercase 3-letter | `str`, `dex`, `con`, `int`, `wis`, `cha` |
| Stage folders | `snake_case` | `data/stages/wolf_den/` |

---

## YAML Shorthand Reference

These string formats are parsed by the engine:

| Pattern | Example | Parsed To |
|---------|---------|-----------|
| Dice | `"2d6+3"` | `{ count: 2, sides: 6, bonus: 3 }` |
| Dice + type | `"1d8 fire"` | `{ dice: "1d8", type: "fire" }` |
| Stats | `"8/14/10/10/8/8"` | `{ str:8, dex:14, con:10, int:10, wis:8, cha:8 }` |
| Cost | `"1 action"` | `{ action: 1 }` |
| Save | `"CON 12"` | `{ stat: "con", dc: 12 }` |

Everything else uses structured YAML objects.

---

## Mod Load Order

1. `core` always loads first.
2. Mods load in array order from `modsettings.yaml`.
3. Later mods override earlier ones (last wins).
4. Stage YAML (`data/stages/`) overrides map definitions from mods.

```yaml
# modsettings.yaml
mods:
  - core              # Base game (always first)
  - expansion_pack    # Adds new creatures + weapons
  - balance_tweaks    # Overrides combat rules (loads last, wins)
```

---

## Testing Your Mod

```bash
npm start                    # Start server
# Open http://localhost:3000  — play with your mod active

npm test                     # Run automated tests
# Open http://localhost:3000/test — browser-based tests
```

### Debug Mode

```bash
DEBUG_TOOLS=1 npm start
```

Check `/_debug/config` to verify your mod loaded. Use the dev console (backtick key `` ` ``) in-game to inspect state.
