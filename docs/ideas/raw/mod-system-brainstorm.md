# Mod System Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decisions

- **4-tier mod system**: Data → Tuning → Event Hooks → JS Scripts
- **Ability inheritance**: `extends:` + `override:` for base templates → abilities
- **Items reference abilities**: scrolls `casts:`, potions `casts:`, weapons `weapon_abilities:[]`
- **~25 engine primitives** (hardcoded TS): everything else is YAML composition
- **Eval+call execution**: YAML strings are JS function bodies, `this` = runner with all engine methods
- **Two runners**: EventRunner (actions: dealDamage, applyStatus) + BoostRunner (stats: ac, str, advantage)
- **on_* event hooks**: `on_hit:`, `on_kill:`, etc. — JS pipe strings, 15 triggers for W1
- **Statuses with stackId/priority**: BG3-style mutual exclusion, boosts as JS pipe string
- **Status source tracking**: every instance stores who applied (aura cleanup, kill credit, boost context)
- **Auras are statuses**: `auraRadius` + `auraApply` fields, engine manages spatial lifecycle
- **Resources vs Statuses**: engine pools (action, spell slots) separate from actor effects
- **Trigger-time evaluation**: rules evaluate at cast time, not pre-baked onto abilities
- **Core game uses mod format**: all core abilities use the same YAML format modders use
- **Engine-vs-Mod boundary**: engine = dumb plumbing (rendering, spatial, lifecycle); mods = game content
- **Two building blocks**: abilities + statuses compose almost all mechanics; engine only special-cases rendering/audio
- **onTick always at turn start**: matches BG3 (BURNING/BLEEDING/HASTE). No tickAt field needed W1
- **roll: sets this.hits**: eval+call JS, roll functors set `this.hits = true/false`, engine branches to onHit/onMiss
- **Simple damage types**: resistance=0.5x, vulnerability=2x, immunity=0x. Binary per type, no stacking, no magical distinction
- **W1 action economy**: action + bonus action + movement. Reactions deferred post-W1
- **W1 AI profiles**: basic (chase+melee), ranged (keep distance), support (heal/buff allies). Brute/boss deferred
- **Concentration deferred**: W1 spells are duration-gated only, no save-on-damage or one-at-a-time

---

## Engine-vs-Mod Boundary

**Principle: the engine is dumb plumbing. Mods make the game fun.**

The engine (TypeScript in `src/`) handles **infrastructure that mods can't or
shouldn't do**: rendering, spatial queries, input, turn sequencing, persistence,
and runner execution. Everything that makes the game *interesting* — abilities,
statuses, creatures, items, rules — lives in YAML mods (`public/data/`).

### Decision Checklist: Where Does This Code Go?

```
  Does it touch pixels, audio, or hardware?
    YES → Engine (rendering, sound, input, camera)
    NO  ↓

  Does it manage turn order, mode transitions, or save/load?
    YES → Engine (turn loop, mode-combat, mode-explore, persistence)
    NO  ↓

  Does it provide a runner method that YAML calls?
    YES → Engine (EventRunner.dealDamage, BoostRunner.ac, etc.)
    NO  ↓

  Does it check spatial relationships (range, LOS, adjacency)?
    YES → Engine (aura range, movement, fog, sight)
    NO  ↓

  Does it define WHAT happens (damage, statuses, buffs, behavior)?
    YES → Mod YAML (abilities, statuses, creatures, items, rules)
    NO  ↓

  Does it define WHEN something triggers (on hit, on kill, on tick)?
    YES → Mod YAML (on* hooks, timing slots)
    NO  → Probably engine
```

### Engine Responsibilities (TypeScript)

| Category | What Engine Does | What It Does NOT Do |
|---|---|---|
| **Runners** | Execute eval+call, expose `this` API | Define what any ability does |
| **Turn loop** | Sequence turns, reset resources, check win/lose | Decide what actions exist |
| **Status lifecycle** | Apply/remove/tick/stack/expire, track `source` | Define what any status does |
| **Boost derivation** | Run BoostRunner, cache `actor.derived`, emit `statsChanged` | Define what any boost does |
| **Aura spatial** | Range check, auto-apply/remove child, draw circle | Define aura effects |
| **Damage pipeline** | Roll dice, apply resistance/vulnerability, subtract HP | Define damage types or amounts |
| **Rendering** | Sprites, overlays, circles, float text, HP bars | Define visual style per ability |
| **Audio** | Play sound on event hooks | Define which sounds map to what |
| **Persistence** | Save/load run state, status instances, inventory | Define item/status schemas |
| **Input** | Tap → tile → action routing, hotbar clicks | Define which abilities are available |

### Mod Responsibilities (YAML)

| Category | What Mods Define | What They Don't Touch |
|---|---|---|
| **Abilities** | Name, cost, timing slots (onCast/roll/onHit/onMiss) | Turn sequencing, input routing |
| **Statuses** | Duration, stacking, boosts, on* hooks, aura fields | Status lifecycle engine |
| **Creatures** | Stats, abilities, AI profile, loot, resistances | Pathfinding, sprite rendering |
| **Items** | Name, type, onUse hook, boosts, equip slots | Inventory UI layout |
| **Rules** | Combat rules (flee distance, crit range), world config | Turn loop mechanics |
| **Stages** | Grid, encounters, events, dialogs, transitions | Map rendering, fog system |
| **Classes** | Ability pools, stat progression, features | Leveling engine |
| **Loot tables** | Drop pools, weights, gold ranges | Loot roll engine |

### The Rendering/Audio Boundary

**Rule: if a field affects what the player sees or hears, it's engine-known data
on the YAML def — not buried in a JS body.**

| Visual/Audio Need | YAML Field (mod-defined) | Engine Reads To... |
|---|---|---|
| Aura circle on map | `auraRadius: 3` | Draw translucent circle overlay |
| Ability range on hover | `range: 6` | Draw targeting circle |
| AOE shape | `aoe: { shape: sphere, radius: 4 }` | Draw AOE preview overlay |
| Projectile | `projectile: arrow` | Animate tween from source to target |
| Status icon | `icon: "🔥"` | Render in status bar + portrait |
| Sound on cast | `sound: cast_fire` | Play audio clip |
| Sound on hit | `hitSound: impact_blunt` | Play audio clip on damage |
| Float text color | (engine decides by damage type) | Map fire→orange, poison→green |

Mods declare *what* to show. Engine decides *how* to show it.

### Examples: Right vs Wrong Placement

```
# WRONG — game logic in engine TS
// mode-combat.ts
if (ability.id === 'fireball') {
  dealDamage(target, rollDice('8d6'), 'fire');
  applyStatus(target, 'burning', 2);
}

# RIGHT — game logic in mod YAML, engine just runs it
# 00_core/abilities.yaml
fireball:
  roll: savingThrow("dex", 15)
  onHit: |
    dealDamage("8d6", "fire")
    applyStatus(target, "burning", 2)
  onMiss: |
    dealDamage("4d6", "fire")


# WRONG — rendering in mod YAML
haste:
  onApply: |
    drawCircle(self, 3, "blue")     // NO — mods don't touch rendering

# RIGHT — engine reads data field, renders automatically
haste:
  auraRadius: 3                      // engine draws circle from this
  boosts: |                          // engine caches derived stats
    ac(2)
    multiplyMovement(2)
```

---

## Battle System Execution Flow

The complete order-of-operations for the combat loop. Each numbered step shows
what the engine does **today** (✅) and where trigger hooks should fire (🔶 PLANNED).

### Player Control States

What the player can and cannot do at each phase of combat.

```
  ┌─────────────────────────────────────────────────────────────┐
  │                    EXPLORE MODE                              │
  │                                                              │
  │  Player CAN:                                                 │
  │    • Move freely (tap tile / tap-hold path)                  │
  │    • Open doors, loot chests, interact                       │
  │    • Use items (potions — no cost, anytime)                  │
  │    • Click enemy to engage (opener attack)                   │
  │                                                              │
  │  Player CANNOT:                                              │
  │    • Attack without engaging (no "attack" button)            │
  │    • Use combat abilities                                    │
  │                                                              │
  │  AUTO-TRIGGERS:                                              │
  │    • Walk into enemy sight → enterCombat() immediately       │
  │      ⚠️ Movement does NOT stop — player snaps to last tile   │
  │    • If hidden: stealth contest first, combat only if broken │
  │    • events.yaml tile triggers fire on each step             │
  └─────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │                    COMBAT: PLAYER TURN                       │
  │                                                              │
  │  Player CAN (simultaneously, any order):                     │
  │    • Move up to playerMoves tiles (5 base)                   │
  │      └── Move before action, after action, or split          │
  │    • Use 1 Action (playerAP = 1):                            │
  │      ├── Attack (tap enemy in range)                         │
  │      ├── Dash (+4 movement, consume action)                  │
  │      ├── Hide (stealth roll, consume action)                 │
  │      ├── Flee (distance + LOS check, consume action)         │
  │      └── Use ability (from hotbar, consume action)           │
  │    • Use items (potions heal directly — NO action cost)      │
  │    • End turn voluntarily (even with movement/AP remaining)  │
  │                                                              │
  │  Player CANNOT:                                              │
  │    • Take more than 1 action (no bonus action system yet)    │
  │    • Move beyond budget (overlay shows range)                │
  │    • Attack after AP spent (buttons grayed, pointerEvents    │
  │      disabled)                                               │
  │                                                              │
  │  IMPORTANT: Moving into new enemy sight does NOT halt turn.  │
  │  New enemies join on turn END via _checkForNewEnemiesAfterMove
  │  (re-rolls initiative, adds to combatGroup).                 │
  └─────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │                    COMBAT: ENEMY TURN                        │
  │                                                              │
  │  Player CAN:                                                 │
  │    • Tap screen — input is processed but silently rejected   │
  │      (isPlayerTurn() returns false → no effect)              │
  │    • ⚠️ No visual "input locked" indicator                   │
  │                                                              │
  │  Player CANNOT:                                              │
  │    • Move, attack, use abilities, use items                  │
  │    • Interact with action buttons (disabled via CSS)         │
  │                                                              │
  │  NOTE: Enemy movement tweens do NOT lock input — taps just   │
  │  get rejected by the isPlayerTurn() guard.                   │
  └─────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │                    COMBAT: DICE POPUP                        │
  │                                                              │
  │  Shown on: critical hit (nat 20) or fumble (nat 1)          │
  │                                                              │
  │  Player CAN:                                                 │
  │    • Click/tap to dismiss popup                              │
  │                                                              │
  │  Player CANNOT:                                              │
  │    • Do ANYTHING else — complete input block                 │
  │    • diceWaiting flag intercepts all taps → _handleDiceDismiss
  │    • Auto-dismiss timer exists as fallback                   │
  └─────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │                    FLEE REQUIREMENTS                         │
  │                                                              │
  │  Both must be true (rules.yaml configurable):                │
  │    1. Distance ≥ fleeMinDistance (6) from nearest enemy      │
  │    2. No enemy has line of sight to player tile              │
  │       (fleeRequiresNoLOS: true by default)                   │
  │                                                              │
  │  Player must use movement to reach a "safe" tile first,      │
  │  THEN use Flee action. Green overlay shows safe positions.   │
  │  Failed flee: lose AP, keep remaining movement.              │
  └─────────────────────────────────────────────────────────────┘
```

#### Items in Combat — Gap vs 5e/BG3

| Feature | 5e/BG3 | Current Engine | Gap |
|---|---|---|---|
| Potion = Action | ✅ Costs Action (BG3: Bonus Action) | ❌ Free, no cost | Need action/bonus action cost |
| Scroll = Action | ✅ Costs Action | ⚠️ Via `useAbility` → checks AP | Partially works |
| Throw = Action | ✅ Costs Action | ❌ Not implemented | Need throwable system |
| Use item on enemy turn | ❌ Not allowed | ❌ Rejected by isPlayerTurn() | Correct |

#### Movement Alert — Gap vs 5e/BG3

| Feature | 5e/BG3 | Current Engine | Gap |
|---|---|---|---|
| Move into enemy sight | Combat starts | ✅ enterCombat() immediately | Working |
| Enemies join mid-combat | On their turn / alert | ✅ On turn end, re-roll init | Working |
| Opportunity Attack (leave melee) | ✅ Reaction | ❌ No OA system | Missing |

### Actions as Abilities (Design Decision)

**Current state:** Attack, Dash, Hide, Flee are hardcoded `selectAction()` cases.

**Problem:** This breaks the mod system. Modders can't:
- Give Rogues "Cunning Action: Dash" (bonus action Dash)
- Give Monks "Step of the Wind" (bonus action Dash + Disengage)
- Add "Disengage" at all (it doesn't exist)
- Create new action types (Shove, Help, Dodge, Ready)
- Override Dash to give different movement bonus per class

**Proposed fix:** All actions should be abilities defined in YAML:

```yaml
# 00_core/abilities.yaml
abilities:
  # ── Standard Actions (available to all, cost 1 Action) ──

  attack:
    name: "Attack"
    type: action                           # costs 1 Action
    actionCost: action                     # action | bonus_action | reaction | free
    class: [all]
    uiGroup: common                        # common = always-visible tray | hotbar = class bar
    description: "Make one melee or ranged attack."
    tags: [weapon, attack]
    # Attack logic is engine-native — ability just declares availability

  dash:
    name: "Dash"
    type: action
    actionCost: action
    class: [all]
    uiGroup: common
    description: "Double your movement for this turn."
    onCast: |
      grantResource("movement", 5)

  hide:
    name: "Hide"
    type: action
    actionCost: action
    class: [all]
    uiGroup: common
    description: "Attempt to become hidden."
    onCast: |
      stealthRoll("enemy_perception")

  disengage:
    name: "Disengage"
    type: action
    actionCost: action
    class: [all]
    uiGroup: common
    description: "Your movement doesn't provoke opportunity attacks."
    onCast: |
      applyStatus(self, "disengaged", 1)

  dodge:
    name: "Dodge"
    type: action
    actionCost: action
    class: [all]
    uiGroup: common
    description: "Attacks against you have disadvantage."
    onCast: |
      applyStatus(self, "dodging", 1)

  shove:
    name: "Shove"
    type: action
    actionCost: action
    class: [all]
    uiGroup: common
    range: 1
    description: "Push target 1 tile or knock prone."
    tags: [melee, strength]
    roll: contest("str", "str")
    onHit: |
      forcePush(1)

  help:
    name: "Help"
    type: action
    actionCost: action
    class: [all]
    uiGroup: common
    range: 1
    description: "Grant advantage on next ally's attack."
    onCast: |
      applyStatus(target, "helped", 1)     # ⏳ needs ally targeting

  # ── Class-Specific Overrides ──

  cunning_action_dash:
    name: "Cunning Action: Dash"
    extends: dash
    actionCost: bonus_action               # Rogue gets it as bonus action!
    class: [rogue]
    uiGroup: hotbar                        # class override → shows on hotbar
    requiresLevel: 2

  cunning_action_hide:
    name: "Cunning Action: Hide"
    extends: hide
    actionCost: bonus_action
    class: [rogue]
    uiGroup: hotbar
    requiresLevel: 2

  cunning_action_disengage:
    name: "Cunning Action: Disengage"
    extends: disengage
    actionCost: bonus_action
    class: [rogue]
    uiGroup: hotbar
    requiresLevel: 2

  step_of_the_wind:
    name: "Step of the Wind"
    extends: dash
    actionCost: bonus_action
    class: [monk]
    uiGroup: hotbar
    requiresLevel: 2
    uses: ki
    onCast: |
      grantResource("movement", 5)
      applyStatus(self, "disengaged", 1)
```

**Action economy (needs engine work):**

```
  PLAYER TURN RESOURCES (5e):
  ├── 1 Action       → Attack, Dash, Hide, Dodge, Disengage, Shove, Help, Cast Spell
  ├── 1 Bonus Action → Class abilities (Cunning Action, Offhand Attack, Healing Word)
  ├── 1 Reaction     → Opportunity Attack, Shield spell, Counterspell (on others' turns)
  ├── Movement       → Speed tiles, freely split around actions
  └── Free Actions   → Drop item, speak, open unlocked door
```

| Feature | Current Engine | Needed |
|---|---|---|
| Action (1/turn) | ✅ playerAP = 1 | Working |
| Bonus Action (1/turn) | ❌ Missing | Add playerBonusAP = 1 (W1 — decided) |
| Reaction (1/round) | ❌ Missing | Add playerReaction = 1, reaction window |
| Free Action | ❌ Missing | Add for trivial interactions |
| `actionCost` field on abilities | ❌ Missing | Route ability to correct resource pool |

### uiGroup Enum (6 Groups)

Every ability declares `uiGroup:` — a fixed enum that controls where it renders
and when it's available. The engine collects abilities per group and feeds them
to the appropriate UI surface.

```
  ┌─────────────────────────────────────────────────────────────┐
  │                       UI LAYOUT                              │
  │                                                              │
  │  ┌─── HOTBAR (bottom panel) ────────────────────────────┐   │
  │  │                                                       │   │
  │  │  [common row]  ⚔Atk  💨Dash  🕶Hide  🏳Flee  ...    │   │
  │  │  [class tab]   🗡2nd Wind  🎯Sneak Atk               │   │
  │  │  [spell tab]   🔥Fire Bolt  💥Fireball                │   │
  │  │  [equip tab]   ⚔Pommel Strike  ⚔Cleave               │   │
  │  │  [item tab]    🧪Heal Pot  📜Scroll                   │   │
  │  │                                                       │   │
  │  └───────────────────────────────────────────────────────┘   │
  │                                                              │
  │  ┌─── CONTEXT MENU (on tap entity) ────────────────────┐    │
  │  │                                                      │    │
  │  │  🚪 Open Door                                        │    │
  │  │  🔓 Lockpick (Rogue, DC 15)                          │    │
  │  │  💪 Break Door (STR check)                           │    │
  │  │  🔍 Check for Traps (Perception)                     │    │
  │  │                                                      │    │
  │  └──────────────────────────────────────────────────────┘    │
  └─────────────────────────────────────────────────────────────┘
```

| `uiGroup` | Mode | Source | Lifecycle | UI Surface | Examples |
|---|---|---|---|---|---|
| `common` | Combat | Everyone | Always present | Hotbar common row | Attack, Dash, Hide, Flee, Disengage, Dodge, Shove |
| `class` | Combat | Class + level | Permanent once learned | Hotbar class tab | Second Wind, Sneak Attack, Wild Shape |
| `spell` | Combat | Class + spell slots | Permanent, slot-gated | Hotbar spell tab | Fire Bolt, Fireball, Healing Word |
| `equipment` | Both | Equipped gear | Swap gear = swap abilities | Hotbar equip tab | Pommel Strike, Cleave, Shield Bash |
| `item` | Both | Inventory consumables | Consumed on use | Hotbar item tab | Healing Potion, Scroll of Fireball |
| `explore` | Explore | Context-sensitive | Shows near valid target | Context menu popup | Lockpick, Break Door, Disarm Trap, Steal, Persuade |

**Resolution order:** When player taps an entity or opens hotbar, engine collects
abilities per group, filters by class/level/condition/targetKind, then renders.

### Explore Actions & Context Menu (Design Decision)

**Current state:** 4 hardcoded entity classes (Door, Chest, FloorItem, Interactable),
each with a fixed `getMenuOptions()` that returns static actions. Tap tile →
adjacency check → auto-pathfind → collect options → show vertical HTML menu.
No skill checks, no class-conditional actions, no trigger hooks.

**Problem:** Modders can't:
- Give Rogues "Lockpick" (DEX + proficiency vs lock DC)
- Give Fighters "Break Door" (STR check)
- Add "Detect Magic" to see hidden traps/loot (Wizard)
- Add "Persuade" to NPC interactions (Bard/Charisma check)
- Add "Steal" to NPCs (Rogue + Sleight of Hand)
- Hook into interactions (trap on chest open, ambush on door open)

**Proposed fix:** Two-sided matching — entities declare what they are,
explore abilities declare what targets they work on. Engine matches at tap time.

#### Architecture: Entity + Ability Matching

```
  PLAYER TAPS ENTITY TILE
  │
  1. ✅ Get entities at tile (existing: _entityTileIndex["x,y"])
  2. ✅ Adjacency check: dist > 1.5 → auto-pathfind or "move closer"
  3. 🔶 NEW: For each entity at tile:
  │     │
  │     ├── Get entity.kind (door | chest | npc | trap | floor_item | ...)
  │     ├── Get entity.state (locked, trapped, open, ...)
  │     │
  │     ├── Collect ENTITY DEFAULT ACTIONS:
  │     │   └── entity.getMenuOptions(scene) [existing, keep as fallback]
  │     │       e.g., door: [{ label: "Open Door", action: "toggle" }]
  │     │
  │     ├── 🔶 Collect MATCHING EXPLORE ABILITIES:
  │     │   └── For each ability where uiGroup == 'explore':
  │     │       ├── targetKind includes entity.kind?
  │     │       ├── class/level requirements met?
  │     │       ├── tool/item requirements met? (thieves_tools in inventory?)
  │     │       ├── condition evaluates true? ("target.locked == true")
  │     │       └── Yes to all → add to menu
  │     │
  │     └── Merge: explore abilities FIRST (richer), then entity defaults
  │         └── Deduplicate by action id (explore ability overrides default)
  │
  4. 🔶 TRIGGER: on_context_menu_build { entities, abilities, menu }
  │   └── Modder can: add/remove options, reorder, add separators
  │
  5. If 1 action → auto-execute
     If N actions → show context menu at tap position
     If 0 actions → "Nothing to interact with"
  │
  6. Player selects action from menu
  │
  7. 🔶 TRIGGER: on_interact_attempt { source, target, ability, entityKind }
  │   └── Modder can: cancel, add DC modifier, spring trap early
  │
  8. Execute ability effects:
  │   ├── Skill check? → roll d20 + skill mod vs DC
  │   │   ├── 🔶 TRIGGER: on_skill_check { source, skill, dc, roll, total }
  │   │   │   └── Modder can: add bonus (Guidance), grant advantage
  │   │   ├── Success → on_interact_success
  │   │   └── Fail → on_interact_fail
  │   └── No check needed? → direct action (open unlocked door)
  │
  9. 🔶 TRIGGER: on_interact_success { source, target, ability, entityKind }
  │   └── Modder can: bonus loot, story flag, spawn enemy, quest progress
  │
  10.🔶 TRIGGER: on_interact_fail { source, target, ability, reason }
      └── Modder can: alert enemies, trigger trap, break tool
```

#### Explore Abilities YAML

```yaml
# 00_core/abilities.yaml — Explore Actions

abilities:

  # ── Universal (no skill check) ──

  open_door:
    name: "Open Door"
    uiGroup: explore
    targetKind: [door]
    condition: "target.locked == false and target.open == false"
    actionCost: free
    icon: "🚪"
    onCast: |
      interactEntity("toggle")

  close_door:
    name: "Close Door"
    uiGroup: explore
    targetKind: [door]
    condition: "target.open == true"
    actionCost: free
    icon: "🚪"
    onCast: |
      interactEntity("toggle")

  open_chest:
    name: "Open Chest"
    uiGroup: explore
    targetKind: [chest]
    condition: "target.locked == false and target.open == false"
    actionCost: free
    icon: "📦"
    onCast: |
      interactEntity("open")

  pickup_item:
    name: "Pick Up"
    uiGroup: explore
    targetKind: [floor_item]
    condition: "target.collected == false"
    actionCost: free
    icon: "💰"
    onCast: |
      interactEntity("pickup")

  talk:
    name: "Talk"
    uiGroup: explore
    targetKind: [npc]
    actionCost: free
    icon: "💬"
    onCast: |
      startDialog(target.dialogId)

  # ── Skill Check Actions (class/tool gated) ──

  lockpick:
    name: "Lockpick"
    uiGroup: explore
    targetKind: [door, chest]
    condition: "target.locked == true"
    requires:
      tool: thieves_tools                  # must have in inventory
    class: [rogue]                         # OR: proficiency: [thieves_tools]
    icon: "🔓"
    roll: skillCheck("dex", target.lockDc, "thieves_tools")
    onHit: |
      unlockEntity()
      logMessage("Click! The lock yields.")
      grantXp(25)
    onMiss: |
      logMessage("The lock holds firm.")

  break_door:
    name: "Break Door"
    uiGroup: explore
    targetKind: [door]
    condition: "target.locked == true"
    class: [all]                           # anyone can try
    icon: "💪"
    roll: skillCheck("str", target.breakDc)
    onHit: |
      destroyEntity()
      alertEnemies(5)
      logMessage("CRASH! The door splinters.")
    onMiss: |
      logMessage("The door doesn't budge.")
      alertEnemies(3)                      # even failure makes noise

  check_for_traps:
    name: "Check for Traps"
    uiGroup: explore
    targetKind: [door, chest, trap, floor_tile]
    class: [all]
    icon: "🔍"
    roll: skillCheck("wis", target.trapDc, "perception")
    onHit: |
      revealTrap(target)
      logMessage("You spot a trap mechanism!")
    onMiss: |
      logMessage("Seems safe...")          # false confidence

  disarm_trap:
    name: "Disarm Trap"
    uiGroup: explore
    targetKind: [door, chest, trap]
    condition: "target.trapDetected == true"   # must detect first
    requires:
      tool: thieves_tools
    class: [rogue]
    icon: "🔧"
    roll: skillCheck("dex", target.trapDc, "thieves_tools")
    onHit: |
      disarmTrap(target)
      grantXp(50)
    onMiss: |
      triggerTrap(target)
      logMessage("The trap springs!")

  # ── Class-Specific Explore Abilities ──

  detect_magic:
    name: "Detect Magic"
    uiGroup: explore
    targetKind: [chest, door, npc, trap, floor_tile]
    class: [wizard, sorcerer, cleric]
    icon: "✨"
    onCast: |
      revealMagic(3)
      logMessage("Arcane energy pulses...")

  persuade:
    name: "Persuade"
    uiGroup: explore
    targetKind: [npc]
    class: [all]
    icon: "🗣"
    roll: skillCheck("cha", target.persuadeDc, "persuasion")
    onHit: |
      setFlag(target.id + "_persuaded", true)
      startDialog(target.persuadeDialogId)
    onMiss: |
      startDialog(target.refuseDialogId)

  steal:
    name: "Steal"
    uiGroup: explore
    targetKind: [npc]
    class: [rogue]
    condition: "target.inventory != null"
    icon: "🤏"
    roll: skillCheck("dex", target.perceptionDc, "sleight_of_hand")
    onHit: |
      lootFrom(target.pocketLoot)
      logMessage("Your fingers find coin...")
    onMiss: |
      setFlag(target.id + "_hostile", true)
      enterCombat()
      logMessage("Hey! Thief!")
```

#### Entity YAML: What Targets Declare

Entities declare their `kind` and properties that explore abilities check:

```yaml
# stage.yaml
doors:
  - x: 10
    y: 5
    locked: true
    lockDc: 15                             # Lockpick DC
    breakDc: 20                            # Break Door DC (default: lockDc + 5)
    keyId: dungeon_key                     # Bypass: unlock with this key
    trapped: true                          # Has trap?
    trapDc: 14                             # Trap detection & disarm DC
    trapEffect: { damage: "2d6", type: fire, statusId: burned }

interactables:
  - x: 20
    y: 3
    kind: npc
    label: "Blacksmith Harg"
    dialogId: "harg_intro"
    persuadeDc: 12
    persuadeDialogId: "harg_discount"      # dialog on persuade success
    refuseDialogId: "harg_annoyed"         # dialog on persuade fail
    perceptionDc: 16                       # steal detection
    pocketLoot: npc_blacksmith_pocket      # loot table if steal succeeds
```

#### Explore Trigger Points (New)

```
  INTERACTION FLOW TRIGGERS
  │
  ├── on_context_menu_build      Before menu shows      Add/remove options
  ├── on_interact_attempt        Before action starts    Cancel, modify DC
  ├── on_skill_check             d20 rolled              Add bonus, advantage
  ├── on_interact_success        Action succeeded        Bonus loot, story flag
  ├── on_interact_fail           Action failed           Alert enemies, spring trap
  │
  ENTITY-SPECIFIC TRIGGERS (fire after generic ones)
  │
  ├── on_door_open               Door opened             Ambush, room reveal
  ├── on_door_break              Door destroyed          Noise alert, debris
  ├── on_chest_open              Chest opened            Mimic! Curse check
  ├── on_chest_loot              Loot resolved           Bonus items
  ├── on_trap_trigger            Trap fires              Damage, status, alert
  ├── on_trap_disarm             Trap disabled           XP, salvage parts
  ├── on_npc_interact            NPC interaction start   Change dialog tree
  ├── on_steal_attempt           Steal tried             Alert, faction rep
  ├── on_item_pickup             Floor item collected    Quest item check
  └── on_lock_picked             Lock opened             XP, quest progress
```

#### Skill Check System (Engine Work Needed)

```
  SKILL CHECK FLOW
  │
  1. Determine base: d20
  2. Add ability modifier: floor((stat - 10) / 2)
  3. Add proficiency bonus (if proficient in skill)
  4. Add tool bonus (if proficient with tool + have tool)
  5. 🔶 TRIGGER: on_skill_check → modders add bonus, advantage
  6. Check advantage/disadvantage (Guidance spell, Help action)
  7. Compare total vs DC
  8. Nat 20 = auto-success (not RAW 5e, but feels good)
  9. Nat 1 = possible complication (tool breaks, trap springs)
```

| Engine Feature | Status | Needed |
|---|---|---|
| d20 roll + stat mod | ✅ REAL | Used in attack/save, reuse |
| Skill proficiency list | ❌ Missing | Add to player: `skillProficiencies: [perception, stealth]` |
| Tool proficiency | ❌ Missing | Add to player: `toolProficiencies: [thieves_tools]` |
| Skill check function | ❌ Missing | `rollSkillCheck(actor, skill, dc, opts)` |
| `requires: { tool: X }` filter | ❌ Missing | Check inventory for tool item |
| Ability `condition:` eval on entity state | ⚠️ Partial | Condition eval exists but doesn't read entity props |
| `targetKind:` filter on abilities | ❌ Missing | Add to ability resolution |
| Entity properties (lockDc, trapDc, etc.) | ⚠️ Partial | Door has locked/keyId; need DCs |
| Context menu injection from abilities | ❌ Missing | New: merge entity defaults + explore abilities |

---

### Phase 1: Combat Entry

```
EXPLORE MODE — player moves, enemies patrol
  │
  ├─ Path A: Player clicks enemy (engage)
  │   ├── pathfind to adjacency
  │   ├── opener attack (advantage if hidden)
  │   │   ├── roll d20 (2d20 take best if stealth)
  │   │   ├── hit? → damage, apply on-hit statuses, loot
  │   │   └── miss/hit → enterCombat()
  │   └──────────────────────────────────┐
  │                                      │
  ├─ Path B: Enemy spots player          │
  │   ├── sight check (Euclidean dist)   │
  │   ├── stealth contest (if hidden)    │
  │   └── broken? → enterCombat()  ──────┤
  │                                      │
  ├─ Path C: Script trigger              │
  │   └── events.yaml { type: enterCombat } ─┤
  │                                      ▼
  │                            ┌─────────────────┐
  │                            │  enterCombat()   │
  │                            └────────┬────────┘
  │                                     │
  ▼                                     ▼

  1. ✅ mode = MODE.COMBAT
  2. ✅ Snap player to last completed tile
  3. ✅ _buildAlertedEnemySet()
     ├── Add scripted group allies (same group value)
     ├── Expand by room propagation (iterative BFS)
     └── Expand by hearing (nearby enemies hear combat noise)
  4. ✅ Mark all alerted enemies: inCombat = true
  5. ✅ rollInitiativeOrder()
     ├── Player: d20 + DEX mod
     ├── Each enemy: d20 + DEX mod
     └── Sort: init DESC → mod DESC → player wins ties
  6. 🔶 TRIGGER: on_combat_start { combatants[], surprise[] }
  7. ✅ UI: flash "COMBAT!", build initiative bar
  8. ✅ turnIndex = 0 → startNextTurn()
```

### Phase 2: Turn Loop

```
  ┌──────────────────────────────────────────────────┐
  │              startNextTurn()                       │
  │  ┌────────────────────────────────────────────┐   │
  │  │ Pre-checks (before any turn executes):     │   │
  │  │  • Filter dead enemies from turnOrder      │   │
  │  │  • All enemies dead? → exitCombat(victory) │   │
  │  │  • Floor changed?    → exitCombat(floor)   │   │
  │  │  • All abandoned?    → exitCombat(escape)  │   │
  │  └────────────────────────────────────────────┘   │
  │                      │                             │
  │          ┌───────────┴───────────┐                │
  │          ▼                       ▼                │
  │   ┌──────────┐           ┌───────────┐           │
  │   │ SURPRISED│           │ NOT SURP. │           │
  │   │ skip turn│           │           │           │
  │   │ "loses   │           │ who?      │           │
  │   │  turn!"  │           │           │           │
  │   └────┬─────┘      ┌────┴────┐                  │
  │        │             │         │                  │
  │        │       ┌─────▼───┐ ┌───▼──────┐          │
  │        │       │ PLAYER  │ │ ENEMY    │          │
  │        │       │ TURN    │ │ TURN     │          │
  │        │       └─────┬───┘ └───┬──────┘          │
  │        │             │         │                  │
  │        ▼             ▼         ▼                  │
  │   endTurn ←──── endTurn ←── endTurn               │
  │        │                                          │
  │        ▼                                          │
  │   turnIndex++ (wrap at end → new round)           │
  │        │                                          │
  │        └──────────────→ startNextTurn() ──────────┘
  └──────────────────────────────────────────────────┘
```

### Phase 3: Actor Turn (Unified — Player and Enemy)

Both player and enemy follow the **same turn pipeline**. The only difference is
step 5: player waits for human input, enemy runs AI. Everything else — aura
ticks, status ticks, resource reset, ability execution, end-of-turn cleanup —
is identical.

```
  TURN START — actorTurn(actor)
  │
  1. tickAuras(allActors)                                  [ENGINE]
  │   ├── For each actor with auraRadius status:
  │   │   ├── candidates = actorsWithinRadius(source, auraRadius)
  │   │   ├── Filter by auraTargets + eval(auraCondition)
  │   │   ├── In-range + no child? → applyStatus(child, -1, { source })
  │   │   └── Out-of-range + has child from this source? → removeStatusBySource()
  │   └── recalcBoosts() for any actor whose statuses changed
  │
  2. tickStatuses(actor, 'turn_start')                     [ENGINE]
  │   ├── For each status instance on actor:
  │   │   ├── skipTurn? → skip everything below, endTurn
  │   │   ├── saveToRemove? → roll save vs DC → success? removeStatus()
  │   │   ├── onTick? → eval+call via EventRunner          [MOD JS]
  │   │   │   └── runner.self = actor, runner.source = instance.source
  │   │   ├── remaining-- (skip if -1)
  │   │   └── remaining ≤ 0? → removeStatus() → eval onRemove  [MOD JS]
  │   └── recalcBoosts(actor) if any status removed
  │
  3. 🔶 HOOK: on_turn_start fires for passive abilities    [MOD JS]
  │   └── Equipment/class on_turn_start hooks via eval+call
  │
  4. Reset resources: actionPoint=1, bonusAction=1, movement=derived  [ENGINE]
  │   └── movement = actor.derived.movement (from recalcBoosts)
  │
  ─── 5. ACTION SELECTION (the ONLY difference) ───
  │
  │   ┌─── IF PLAYER ─────────────────────────────────────┐
  │   │ Show move range overlay, init action buttons       │ [ENGINE]
  │   │ Wait for human input (hotbar click / tap tile)     │
  │   │ → useAbility(abilityId, target)                    │
  │   └────────────────────────────────────────────────────┘
  │
  │   ┌─── IF ENEMY ──────────────────────────────────────┐
  │   │ Stealth detection: canSeePlayer? breakStealth()   │ [ENGINE]
  │   │ AI profile picks ability from creature YAML       │ [ENGINE reads MOD]
  │   │   ├── Check cooldowns, range, conditions           │
  │   │   └── Fallback: basic attack                       │
  │   │ Movement: BFS pathfind, budget from derived.move  │ [ENGINE]
  │   │ → useAbility(abilityId, target)                    │
  │   └────────────────────────────────────────────────────┘
  │
  │   useAbility() is the SAME for both:                   [ENGINE + MOD JS]
  │   ├── Validate: hasResource(ability.actionCost)
  │   ├── Validate: target in ability.range (actor.derived)
  │   ├── Deduct resource (actionPoint, bonusAction, etc.)
  │   ├── Execute timing slots via eval+call:              [MOD JS]
  │   │   ├── condition? → eval → false? abort, refund cost
  │   │   ├── onCast? → eval+call(EventRunner)
  │   │   ├── roll? → eval+call → sets hits = true/false
  │   │   ├── hits? → onHit: eval+call → damage, debuffs
  │   │   └── !hits? → onMiss: eval+call → half damage, log
  │   └── recalcBoosts if any status applied/removed
  │
  │   All abilities — Attack, Dash, Hide, Flee, Fireball,
  │   enemy spells — use this same path. No special cases.
  │
  TURN END
  │
  6. tickStatuses(actor, 'turn_end')                       [ENGINE]
  │   └── wearOff: turnEnd statuses removed here
  7. 🔶 HOOK: on_turn_end fires for passive abilities      [MOD JS]
  8. Clear resources, hide UI (player only)                [ENGINE]
  9. _checkForNewEnemiesAfterMove() (player only)          [ENGINE]
  10.turnIndex++ → startNextTurn()                          [ENGINE]
```

**Why unified?** The engine shouldn't know whether it's running a player or
enemy turn. Same `tickAuras` → `tickStatuses` → `useAbility` → `tickStatuses`
pipeline. The AI is just the "input device" for enemies, same as the hotbar is
the input device for the player. This keeps the engine simple and ensures mods
work identically on both sides — a status that works on the player works on
enemies, and vice versa.

Attack is just an ability — it uses the same `useAbility()` path. But the
attack ability has a `roll: attackRoll("melee")` timing slot that triggers the
engine's attack resolution pipeline. Each step annotated with who owns it.

```
  useAbility('attack', enemy)
  │
  ── PRE-ATTACK ──                                        [ENGINE]
  │
  1.  Validate: hasResource(actionCost), target in range
  2.  If hidden: _breakStealth() → reveal player
  3.  Deduct resource (actionPoint)
  │
  ── ABILITY CONDITION ──                                  [MOD JS]
  │
  4.  condition? → eval+call → false? abort, refund
  │
  ── CAST SLOT ──                                          [MOD JS]
  │
  5.  onCast? → eval+call(EventRunner) → pre-attack buffs
  │
  ── ROLL SLOT (attack-specific) ──                        [ENGINE reads MOD]
  │
  6.  roll: attackRoll("melee") or attackRoll("ranged")
  │   ├── Engine resolves: atkStat from weapon (STR/DEX/finesse)
  │   ├── statMod = floor((stat - 10) / 2)
  │   ├── profBonus = proficiency
  │   ├── Check actor.derived for advantage/disadvantage    [from BOOSTS]
  │   ├── Roll d20 (2d20 if adv/disadv)
  │   ├── atkTotal = d20 + statMod + profBonus + derived.attackBonus
  │   ├── isCrit = (d20 === 20); isFumble = (d20 === 1)
  │   ├── hits = isCrit || (!isFumble && atkTotal ≥ target.derived.ac)
  │   │                                                     [DERIVED AC]
  │   └── Set context: { d20, total, isCrit, isFumble, hits }
  │
  ── BRANCH: HIT or MISS ──
  │
  ├─── ON HIT ───────────────────────────────────────────┐
  │                                                       │
  7.  onHit: eval+call(EventRunner)                       │ [MOD JS]
  │   └── dealDamage(), applyStatus(), etc.               │
  │                                                       │
  ── DAMAGE PIPELINE ──                                   │ [ENGINE]
  │                                                       │
  8.  dealDamage(dice, type) inside onHit triggers:       │
  │   ├── Roll dice (crit = double dice count)            │
  │   ├── + actor.derived.damage bonus                    │ [from BOOSTS]
  │   ├── Check target.derived for resistance/vuln/immune │ [from BOOSTS]
  │   │   ├── resistance → dmg = floor(dmg / 2)          │
  │   │   ├── vulnerability → dmg = dmg × 2              │
  │   │   └── immunity → dmg = 0                          │
  │   ├── dmg = max(1, total) (unless immune)             │
  │   └── target.hp -= dmg                                │
  │                                                       │
  9.  applyStatus() inside onHit triggers:                │ [ENGINE]
  │   ├── stackId/stackPriority resolution                │
  │   ├── onReapply check (overwrite/stack/independent)   │
  │   ├── Set instance.source = attacker                  │
  │   ├── Run onApply: eval+call if defined               │ [MOD JS]
  │   └── recalcBoosts(target) → emit statsChanged        │ [ENGINE]
  │                                                       │
  ── VISUAL FEEDBACK ──                                   │ [ENGINE]
  │                                                       │
  10. Tween: flash enemy alpha                            │
  11. spawnFloat(dmg) — floating damage number            │
  12. Update enemy HP bar                                 │
  13. Log to combat log                                   │
  │                                                       │
  ── CHECK DEATH ──                                       │ [ENGINE]
  │                                                       │
  14. If target.hp ≤ 0:                                   │
  │   ├── target.alive = false                            │
  │   ├── 🔶 on_kill hook fires                           │ [MOD JS]
  │   ├── 🔶 on_death hook fires                          │ [MOD JS]
  │   ├── Aura cleanup: removeStatusBySource(target)      │ [ENGINE]
  │   │   └── If dead actor had auras, remove all children│
  │   ├── Tween out (500ms fade)                          │ [ENGINE]
  │   ├── handleEnemyDefeatLoot(enemy)                    │ [ENGINE reads MOD]
  │   │   └── Roll loot table from creature YAML           │
  │   ├── Grant XP (source gets kill credit via source)   │ [ENGINE]
  │   ├── checkLevelUp()                                  │ [ENGINE]
  │   └── All dead? → exitCombat() after 600ms            │ [ENGINE]
  │                                                       │
  └───────────────────────────────────────────────────────┘
  │
  ├─── ON MISS ──────────────────────────────────────────┐
  │                                                       │
  15. onMiss: eval+call(EventRunner)                      │ [MOD JS]
  │   └── e.g. half damage on save, log miss              │
  16. Tween: shake enemy sprite                           │ [ENGINE]
  17. spawnFloat("MISS" or "NAT 1!")                      │ [ENGINE]
  18. Log to combat log                                   │ [ENGINE]
  │                                                       │
  └───────────────────────────────────────────────────────┘
  │
  ── POST ──                                              [ENGINE]
  │
  19. If crit or nat1: show dice popup → wait dismiss
  20. _finishPlayerAction() → show move range
```

**Key change from old flow:** No hardcoded `selectAction('dash')` /
`selectAction('hide')` / `selectAction('flee')` cases. All abilities —
including Attack — go through `useAbility()` which executes timing slots
via eval+call. The engine only owns the *infrastructure* (roll resolution,
damage pipeline, status lifecycle, rendering). The *behavior* is in YAML.

### Phase 5: Combat Exit

```
  exitCombat(reason?)
  │
  1.  ✅ mode = MODE.EXPLORE
  2.  ✅ Break stealth if active
  3.  ✅ Clear sight overlays
  4.  ✅ Mark all enemies: inCombat = false
  5.  ✅ Clear: combatGroup, turnOrder, turnIndex
  6.  ✅ UI: hide dice, action bar, vignette
  7.  🔶 TRIGGER: on_combat_end { reason, xpGained, enemiesKilled[] }
  │   └── Modder can: bonus loot, story event, quest check
  8.  ✅ Log: "FLED" / "Enemies lost you" / "COMBAT OVER"
  9.  ✅ Redraw fog of war
  10. 🔶 TRIGGER: on_quest_check { event: 'combat_end', context }
  │   └── "Kill 5 goblins" progress, boss defeat flag
```

### Phase 7: Round Boundary

```
  When turnIndex wraps past end of turnOrder:
  │
  1. ✅ turnIndex = 0 (implicit — no explicit round counter)
  2. 🔶 TRIGGER: on_round_start { round: N }
  │   └── Before first turn of new round
  3. 🔶 TRIGGER: on_round_end { round: N-1 }
  │   └── After last turn of previous round
  │
  NOTE: Engine currently has no explicit round counter.
  Need to add: this.combatRound = 1 on enter, increment on wrap.
```

### Trigger Summary (Ordered by Execution)

Every trigger a modder can hook, in the order they fire during one full round:

```
  COMBAT ENTRY
  ├── on_combat_start

  ROUND N START
  ├── on_round_start

  FOR EACH ACTOR IN INITIATIVE ORDER:
  │
  │  TURN START
  │  ├── on_status_tick (turn_start)
  │  ├── on_turn_start
  │  │
  │  IF PLAYER TURN:
  │  │  ├── on_attack_declare
  │  │  ├── on_attack_roll_modifiers        ← add bonus/adv/disadv
  │  │  ├── on_attack_roll                  ← override hit/miss
  │  │  ├── on_hit / on_miss               ← branch
  │  │  ├── on_damage_roll                  ← modify damage
  │  │  ├── on_damage_dealt                 ← source-side read
  │  │  ├── on_damage_taken                 ← target-side read
  │  │  ├── on_status_applied               ← on-hit status
  │  │  ├── on_show_damage_fx               ← visual hook
  │  │  ├── on_kill → on_death              ← if lethal
  │  │  ├── on_level_up                     ← if XP threshold
  │  │  └── on_attack_complete              ← cleanup
  │  │
  │  IF ENEMY TURN:
  │  │  ├── on_enemy_ai_decide              ← override AI
  │  │  ├── on_move_start → on_tile_enter (×N) → on_move_end
  │  │  ├── (same attack triggers as player, source=enemy)
  │  │  └── on_player_death                 ← if lethal
  │  │
  │  TURN END
  │  ├── on_status_tick (turn_end)
  │  └── on_turn_end

  ROUND N END
  ├── on_round_end

  COMBAT EXIT
  ├── on_combat_end
  └── on_quest_check
```

### What's Real vs What Needs Building

| Layer | Status | Notes |
|---|---|---|
| Turn loop (startNextTurn → endTurn → advance) | ✅ REAL | Fully working today |
| Status ticking (turn_start, turn_end) | ✅ REAL | processStatusEffectsForActor() |
| Attack roll + damage | ✅ REAL | Full d20 + mods + crit/fumble |
| Initiative + surprise | ✅ REAL | d20 + DEX, sorted, surprised skip |
| Enemy AI (pathfind → chase → attack) | ✅ REAL | Simple but functional |
| `executeAbilityHook()` framework | ✅ REAL | Exists, condition eval works |
| Hook calls in game loop | ❌ MISSING | 0 calls to executeAbilityHook |
| Round counter (`combatRound`) | ❌ MISSING | Need to add |
| Reaction system | ❌ MISSING | No reaction window exists |
| Spell casting (separate from attack) | ❌ MISSING | Only melee/ranged attack |
| Damage types + resistance | ❌ MISSING | All damage is untyped |

---

## 4-Tier Mod Architecture

| Tier | What | Skill Needed | Power |
|---|---|---|---|
| **1: Data** | New creatures, weapons, items, stages | Beginner | Add content |
| **2: Tuning** | Override values, balance changes | Beginner | Modify numbers |
| **3: Event Hooks** | `on_*:` JS pipe strings | Intermediate | Custom mechanics |
| **4: JS Scripts** | `fn:` raw JavaScript blocks | Advanced | Anything |

### Tier 1-2: Pure YAML Data

```yaml
# Add new creature — just data
creatures:
  frost_spider:
    name: "Frost Spider"
    hp: 25
    ac: 12
    damage: "1d6+2"
    damage_type: cold

# Creature inheritance — extends parent, overrides specific fields
# Objects deep-merge (stats, ai, attack); scalars and arrays replace.
creatures:
  goblin_archer:
    extends: goblin               # inherits all goblin fields
    name: "Goblin Archer"
    attack: { weaponId: shortbow, dice: "1d6", range: 6 }

  goblin_warrior:
    extends: goblin
    name: "Goblin Warrior"
    hp: 12
    ac: 14
    attack: { weaponId: longsword, dice: "1d8+1", range: 1 }

# Circular extends detected and warned at load time.
# Missing parent warned but child still loads as-is.

# Override existing value — later mod wins
weapons:
  longsword:
    damageDice: "1d10+3"    # overrides core's 1d8+3
```

### Tier 3: Event Hooks (on_* / eval+call)

```yaml
# Most modders write this. YAML strings are JS function bodies.
# `this` = runner with all engine methods (dealDamage, applyStatus, etc.)

# Passive — hooks engine events
staff_of_frost:
  on_hit: |
    if (isDamageType("cold")) applyStatus("frozen", 1)

# Active ability — timing slots
fireball:
  actionCost: action
  spellSlot: 3
  onHit: |
    dealDamage("8d6", "fire")
    applyStatus("burning", 2)
```

### Tier 4: Raw JS (legacy — being replaced by eval+call)

> **Note:** The `window.ABILITY_HOOKS` approach below documents what exists in
> code today. The new design replaces this with the **eval+call** model
> (see "Ability Execution Model" section) where YAML strings ARE JS function
> bodies and `this` = runner. The `{ type: custom, fn: "..." }` event action
> remains useful for stage scripting in `events.yaml`.

Two JS hook mechanisms exist in the engine today:

#### 4a. Event System — `custom` action (✅ REAL)

Events in `events.yaml` can call any `window[fn]` function. The function receives
the full GameScene and the event step object.

```yaml
# events.yaml
events:
  - id: boss_phase_transition
    trigger: { event: "boss_hp_below_50" }
    steps:
      - { type: custom, fn: "onBossPhase2" }
```

```js
// mod-scripts.js — loaded via <script> tag or mod meta
window.onBossPhase2 = async function(scene, step) {
  // scene is the full GameScene — access everything
  const boss = scene.enemies.find(e => e.type === 'goblin_warlord');
  if (!boss || !boss.alive) return;

  // Modify boss stats mid-fight
  boss.ac = 14;
  boss.damageFormula = '2d10+5';

  // Spawn fire tiles
  for (let i = 0; i < 3; i++) {
    const tile = scene._randomFloorTile();
    // TODO: terrain effect system needed
  }

  // Show narrative
  scene.showStatus('The Warlord throws his shield and grabs his greataxe!');
};
```

**What `scene` exposes today:**

```js
// ── Player State ──
scene.playerTile            // { x: 10, y: 5 }
scene.playerHidden          // boolean
scene.PLAYER_STATS          // { hp, maxHp, ac, str, dex, con, int, wis, cha, level, ... }

// ── Enemies ──
scene.enemies               // Enemy[] — all enemies on map
scene.enemies[0].hp         // 7
scene.enemies[0].maxHp      // 7
scene.enemies[0].ac         // 12
scene.enemies[0].tx         // tile x
scene.enemies[0].ty         // tile y
scene.enemies[0].type       // "goblin"
scene.enemies[0].alive      // boolean
scene.enemies[0].stats      // { str: 8, dex: 14, ... }

// ── Map ──
scene.isWallTile(tx, ty)    // boolean
scene.tileData              // 2D array of tile types
scene._randomFloorTile()    // → { x, y } random walkable tile

// ── Combat ──
scene.mode                  // MODE.EXPLORE or MODE.COMBAT
scene.currentTurnIndex      // whose turn in initiative
scene.combatOrder           // turn order array

// ── UI ──
scene.showStatus(msg)       // show floating status text
scene.combatLog(msg)        // append to combat log

// ── Fog / Light ──
scene.tileLightLevel(x, y)  // 0=dark, 1=dim, 2=bright
scene.fogVisible[y][x]      // boolean — currently visible?
```

#### 4b. Ability Hook System — `window.ABILITY_HOOKS` (✅ REAL, underused)

Register JS hooks per trigger point. The hook system exists but `executeAbilityHook()`
is **defined but never called** from the game loop. Must be wired to combat/damage flow.

```js
// Register a hook on "on_hit" (once engine wires this trigger)
window.ABILITY_HOOKS = window.ABILITY_HOOKS || {};
window.ABILITY_HOOKS['on_hit'] = window.ABILITY_HOOKS['on_hit'] || [];

window.ABILITY_HOOKS['on_hit'].push({
  // Optional: only fire for a specific ability
  abilityId: 'poison_strike',

  // Condition — JS string (eval'd) or function
  condition: (ctx, scene) => ctx.roll?.isCrit === false,

  // Effects array — YAML-style objects
  effects: [
    { type: 'status_apply', target: 'enemy', statusId: 'poisoned' },
    { type: 'log', message: 'Poison courses through the wound!' },
  ],

  // OR: raw function for full control
  fn: (ctx, scene, ability, hook) => {
    const target = ctx.target;
    if (!target || !target.alive) return;

    // Roll CON save
    const saveRoll = Math.floor(Math.random() * 20) + 1;
    const saveMod = Math.floor((target.stats.con - 10) / 2);
    const saveTotal = saveRoll + saveMod;

    if (saveTotal < 12) {
      // Apply poison status
      scene.applyStatusToEnemy(target, 'poisoned', 3);
      scene.showStatus(`${target.name} fails CON save (${saveTotal} vs DC 12) — Poisoned!`);
    } else {
      scene.showStatus(`${target.name} resists poison (${saveTotal} vs DC 12)`);
    }
  }
});
```

**Hook context object `ctx`:**

```js
ctx = {
  // Source (attacker/caster)
  source: {
    hp: 22, maxHp: 22, ac: 16, level: 3, class: "fighter",
    str: 15, strMod: 2, dex: 10, dexMod: 0,
    con: 14, conMod: 2, int: 8, intMod: -1,
    wis: 10, wisMod: 0, cha: 10, chaMod: 0,
    proficiency: 2, alive: true
  },

  // Target (defender/recipient)
  target: {
    hp: 7, maxHp: 7, ac: 12, type: "goblin",
    str: 8, strMod: -1, dex: 14, dexMod: 2,
    con: 10, conMod: 0, alive: true
  },

  // Roll results (on_hit, on_miss, on_crit)
  roll: {
    d20: 17,           // natural roll
    total: 19,         // d20 + modifiers
    isCrit: false,     // natural 20
    isMiss: false,     // total < target.ac
    damage: 8          // damage dealt
  },

  // Combat state
  combat: {
    round: 3,
    turn: "source"
  },

  // Spatial
  distance: 1.0        // Euclidean tiles between source and target
};
```

#### Current State vs Planned

| Feature | Status | Notes |
|---|---|---|
| `{ type: custom, fn: "..." }` in events | ✅ REAL | Calls `window[fn](scene, step)` |
| `window.ABILITY_HOOKS[trigger]` | ✅ REAL (structure) | Hook system exists, but `executeAbilityHook()` is never called from combat loop |
| Condition eval (`new Function`) | ✅ REAL | String conditions work: `"source.level >= 3"` |
| Effect types: log, status_apply, modify_stat | ✅ REAL | Execute properly |
| Effect types: trigger_ability, spawn_effect, play_sound, counter_attack | ⚠️ STUB | Console.log only, not implemented |
| `fn:` callback on hooks/effects | ✅ REAL | Full JS function, receives (ctx, scene, ability, hook) |
| ~45 trigger points (on_hit, on_kill, etc.) | ⏳ PLANNED | Listed in brainstorm but not wired into game loop |

#### Engine Work Needed for Full Tier 4

| Priority | Work | Where |
|---|---|---|
| **P0** | Call `executeAbilityHook('on_hit', ctx)` in damage-system.ts after hit resolves | damage-system.ts |
| **P0** | Call `executeAbilityHook('on_kill', ctx)` after enemy dies | damage-system.ts |
| **P0** | Call `executeAbilityHook('on_turn_start', ctx)` at turn begin | mode-combat.ts |
| **P0** | Call `executeAbilityHook('on_combat_start', ctx)` when combat enters | mode-combat.ts |
| **P0** | Call `executeAbilityHook('on_damage_taken', ctx)` on player damage | damage-system.ts |
| **P1** | Wire remaining ~40 trigger points | various |
| **P1** | Implement stub effect types (spawn, counter, sound) | ability-system.ts |
| **P2** | Mod script loading from meta.yaml `scripts:` field | modloader.ts |
| **P2** | Sandboxed eval (prevent `window.location` etc.) | ability-system.ts |

---

## Ability Inheritance System

### Layer 1: Base Templates (Engine-Level)

Define default animation, FX, sound, and timing. Rarely touched by modders.

```yaml
base_templates:
  melee_attack:
    animation: swing
    fx: slash_basic
    sound: sword_hit
    miss_sound: sword_whoosh
    camera: shake_light
    timing:
      windup: 200
      impact: 100
      recover: 150

  spell_bolt:
    animation: cast_forward
    fx: projectile_magic
    sound: magic_cast
    hit_sound: magic_impact
    camera: follow_projectile
    timing:
      windup: 300
      travel: 250
      impact: 150

  spell_aoe:
    animation: cast_up
    fx: aoe_circle
    sound: magic_cast_big
    hit_sound: explosion
    camera: shake_medium
    timing:
      windup: 400
      expand: 300
      impact: 200

  spell_buff:
    animation: cast_touch
    fx: glow_up
    sound: magic_buff

  spell_heal:
    animation: cast_touch
    fx: heal_glow
    sound: heal_chime

  self_buff:
    animation: focus
    fx: aura_self
    sound: power_up

  summon:
    animation: cast_ground
    fx: summon_circle
    sound: summon_appear

  reaction_block:
    animation: block
    fx: shield_flash
    sound: shield_block

  reaction_counter:
    animation: counter_swing
    fx: slash_quick
    sound: counter_hit

  push_target:
    animation: shove
    fx: knockback_trail
    sound: impact_heavy
```

### Layer 2: FX Library

Pre-defined visual effects modders reference by name.

```yaml
fx_library:
  # Projectiles
  projectile_arrow:    { type: projectile, sprite: arrow, speed: 600 }
  projectile_fire:     { type: projectile, sprite: fireball_small, speed: 400, trail: flame }
  projectile_frost:    { type: projectile, sprite: ice_shard, speed: 500, trail: frost }
  projectile_lightning: { type: projectile, sprite: lightning_bolt, speed: 800, trail: electric }
  projectile_holy:     { type: projectile, sprite: holy_bolt, speed: 450, trail: sparkle }

  # Impacts
  slash_basic:         { type: impact, sprite: slash_white, duration: 200, shake: light }
  explosion:           { type: impact, sprite: explosion_fire, duration: 400, shake: heavy }
  explosion_frost:     { type: impact, sprite: explosion_ice, duration: 400, shake: medium }
  holy_burst:          { type: impact, sprite: radiant_burst, duration: 300 }

  # Auras / Buffs
  glow_up:             { type: buff, color: "#ffffff", duration: 400 }
  heal_glow:           { type: buff, color: "#44ff44", duration: 400 }
  aura_self:           { type: aura, color: "#ffcc00", radius: 1, pulse: true }
  shield_flash:        { type: buff, color: "#aaaaff", duration: 200 }

  # Status indicators
  status_poison:       { type: status_vfx, color: "#44aa44", particles: bubble_green }
  status_bleed:        { type: status_vfx, color: "#cc0000", particles: drip_red }
  status_burn:         { type: status_vfx, color: "#ff6600", particles: flame_small }
  status_frozen:       { type: status_vfx, sprite: ice_encase, color: "#aaddff" }
```

### Layer 3: Animation Library

```yaml
animations:
  swing:           { frames: 4, speed: 100, type: attack }
  thrust:          { frames: 3, speed: 80,  type: attack }
  shoot:           { frames: 4, speed: 120, type: attack }
  throw:           { frames: 3, speed: 100, type: attack }
  cast_forward:    { frames: 4, speed: 100, type: cast }
  cast_up:         { frames: 5, speed: 120, type: cast }
  cast_ground:     { frames: 4, speed: 100, type: cast }
  cast_touch:      { frames: 3, speed: 100, type: cast }
  block:           { frames: 2, speed: 60,  type: reaction }
  dodge:           { frames: 3, speed: 80,  type: reaction }
  focus:           { frames: 3, speed: 120, type: buff }
  death:           { frames: 4, speed: 150, type: death }
```

### Layer 4: Abilities (extends templates)

```yaml
# Simple: just inherits everything
strike:
  extends: melee_attack
  class: [fighter]
  type: cantrip
  damage: "weapon"

# Override FX
fire_bolt:
  extends: spell_bolt
  class: [wizard]
  type: cantrip
  override:
    fx: projectile_fire
    hit_sound: explosion
  scaling:
    level_1: { damage: "1d10" }
    level_5: { damage: "2d10" }
    level_10: { damage: "3d10" }

# Override animation + FX
fireball:
  extends: spell_aoe
  class: [wizard]
  type: spell
  level: 2
  override:
    hit_fx: explosion
    camera: shake_heavy
  rules:
    - when: "on_spell_cast"
      do: |
        dice = 7 + spell.slot_level
        enemies = get_enemies_in_radius(target.tile, 3)
        for enemy in enemies do
          dmg = roll_dice('{dice}d6')
          save = saving_throw(enemy, 'DEX', spell_dc)
          if save then dmg = floor(dmg / 2) end
          damage(enemy, dmg, 'fire')
        end

# Chain inheritance: modder extends fireball
greater_fireball:
  extends: fireball
  type: spell
  level: 3
  override:
    camera: shake_extreme
    hit_fx_scale: 1.5
  rules:
    - when: "on_spell_cast"
      do: |
        dice = 10 + spell.slot_level
        enemies = get_enemies_in_radius(target.tile, 4)
        for enemy in enemies do
          dmg = roll_dice('{dice}d6')
          save = saving_throw(enemy, 'DEX', spell_dc)
          if save then dmg = floor(dmg / 2) end
          damage(enemy, dmg, 'fire')
        end
        spawn_terrain('fire', target.tile, 4, 3)
```

### Inheritance Resolution

```
fire_bolt extends spell_bolt:

  spell_bolt (base):
    animation: cast_forward ───── KEEP (not overridden)
    fx: projectile_magic ──────── OVERRIDE → projectile_fire
    sound: magic_cast ─────────── KEEP
    hit_sound: magic_impact ───── OVERRIDE → explosion
    camera: follow_projectile ─── KEEP
    timing: { 300, 250, 150 } ── KEEP

  fire_bolt (final):
    animation: cast_forward       ← from spell_bolt
    fx: projectile_fire           ← overridden
    sound: magic_cast             ← from spell_bolt
    hit_sound: explosion          ← overridden
    + damage, scaling, tags       ← fire_bolt's own
```

---

## Items Reference Abilities

```
┌─────────────────────────────────────────┐
│              ITEM (YAML)                │
│                                         │
│  Scroll ──casts:──→ Ability (spell)     │
│  Potion ──casts:──→ Ability (effect)    │
│  Weapon ──weapon_abilities:──→ [Ability] │
│  Grenade ──throw_casts:──→ Ability      │
└─────────────────────────────────────────┘
```

```yaml
# Scroll: just reference the spell
scroll_fire_bolt:
  type: scroll
  casts: fire_bolt
  cast_level: 1
  consumed_on_use: true

# Potion: reference an effect ability
healing_potion:
  type: potion
  casts: potion_heal_effect
  consumed_on_use: true

# Weapon: grants abilities when equipped
longsword:
  type: weapon
  weapon_abilities: [pommel_strike, cleave]

# Throwable: different ability when thrown vs used
alchemist_fire:
  type: potion
  throwable: true
  casts: alchemist_fire_drink
  throw_casts: alchemist_fire_throw
```

---

## Engine Primitives (~25 Hardcoded Behaviors)

These require TypeScript code because they touch rendering, AI, sight, movement, or turn flow.
Everything else is YAML composition.

### Visual (3)

| Primitive | Code Touches | What It Does |
|---|---|---|
| `invisible` | sprite-system, sight-system, fog-system, combat-ai | Sprite alpha, remove from enemy sight |
| `phasing` | movement-system, collision | Walk through walls/enemies |
| `size_change` | sprite-system, damage-system | Enlarge/Reduce sprite scale |

### Sight (3)

| Primitive | Code Touches | What It Does |
|---|---|---|
| `blinded` | sight-system, fog-system, combat-ai | Sight radius = 0 |
| `darkvision` | sight-system, fog-system, light-system | Extended sight in dark |
| `truesight` | sight-system, entity-system | See invisible, hidden traps/doors |

### Movement (5)

| Primitive | Code Touches | What It Does |
|---|---|---|
| `immobilized` | movement-system, input-system | Speed = 0, can still act |
| `speed_modifier` | movement-system | +/- or multiply movement tiles |
| `forced_movement` | movement-system, damage-system, collision | Push/pull/knockback |
| `teleport` | movement-system, fog-system, camera-system | Instant reposition |
| `prone` | movement-system, damage-system, sprite-system | Costs movement to stand |

### Turn Flow (3)

| Primitive | Code Touches | What It Does |
|---|---|---|
| `stunned` | mode-combat, input-system, combat-ai | Skip turn, can't act/move/react |
| `incapacitated` | mode-combat, input-system | Can't act but can move |
| `extra_action` / `lose_action` | mode-combat, action-buttons | Action economy change |

### Damage (6)

| Primitive | Code Touches | What It Does |
|---|---|---|
| `advantage` / `disadvantage` | damage-system | Roll 2d20, take higher/lower |
| `resistance` / `vulnerability` / `immunity` | damage-system | Damage multiplier by type |
| `damage_over_time` | status-effect-system, damage-system | Tick damage each turn |
| `temp_hp` | damage-system, ui/side-panel | Absorb-first HP pool |
| `damage_shield` | damage-system | Absorb X then break |
| `reflect_damage` | damage-system | Damage back on hit |

### AI (3)

| Primitive | Code Touches | What It Does |
|---|---|---|
| `frightened` | combat-ai, movement-system | Must flee from source |
| `charmed` | combat-ai | Can't attack source |
| `taunted` / `controlled` | combat-ai, mode-combat | Must attack source / switch teams |

### Entity (3)

| Primitive | Code Touches | What It Does |
|---|---|---|
| `summon` | entity-system, mode-combat, sprite-system | Create entity on map |
| `terrain_effect` | entity-system, movement-system, damage-system | Create/modify tile effects |
| `concentration` | status-effect-system, damage-system | Lose spell on damage + failed save |

---

## Status Composition (from Boosts + Hooks)

Mod-defined statuses compose from `boosts` (JS pipe string for passive stat
modifiers via BoostRunner) and `on*` hooks (JS event handlers via EventRunner).
See "Status Effect Schema" section for full field reference, stacking model,
and BG3 comparison.

```yaml
statuses:
  # Simple: boosts only
  poisoned:
    duration: 3
    onReapply: independent
    boosts: |
      disadvantage("attacks")
      disadvantage("ability_checks")
    onTick: |
      dealDamage(self, "1d4", "poison")

  # Compound: boosts + lifecycle hooks
  haste:
    duration: 10
    stackId: haste_slow
    stackPriority: 10
    boosts: |
      ac(2)
      multiplyMovement(2)
      advantage("save_dex")
    onTick: |
      grantResource("action", 1)
    onRemove: |
      applyStatus(self, "lethargy", 1)

  restrained:
    duration: 1
    boosts: |
      movement(-99)                        # effectively 0
      disadvantage("attacks")
      disadvantage("save_dex")

  invisible:
    duration: 3
    boosts: |
      advantage("attacks")
    tags: [invisible]
    # breaks_on handled by on_hit / on_cast hooks on the ability, not status

  paralyzed:
    duration: 1
    skipTurn: true
    boosts: |
      autoFail("save_str")
      autoFail("save_dex")

  # Modder custom: same fields
  shadow_curse:
    duration: 5
    boosts: |
      movement(-1)
      disadvantage("save_wis")
    onTick: |
      dealDamage(self, "1d6", "necrotic")
    saveToRemove: { stat: con, dc: 14 }
```

---

## Ability Execution Model

How abilities, statuses, and passive rules work. Designed to be **YAML-declarative
first** — no scripting engine needed. YAML maps to TS method calls on the engine API.

### Design Principles

1. **00_core is the first mod** — we write abilities in the same format modders use
2. **YAML → method calls** — functor strings parsed to `{ fn, args }`, dispatched to engine
3. **No eval / no scripting for W1** — just declarative functor lists
4. **Conditions are optional** — only needed for reaction prompt gating (post-W1)
5. **Timing slots separate concerns** — when an effect fires is explicit, not buried in logic
6. **Two building blocks: abilities + statuses** — almost all game mechanics compose
   from these two primitives. Abilities trigger effects; statuses hold ongoing state
   (boosts, DOTs, auras). The engine only needs special handling where **rendering**
   (aura radius circle, range indicator, projectile animation, particle FX) or
   **audio** (hit sound, cast sound, ambient loop) must be shown to the player.
   Everything else is data.

### Timing Slots (Active Abilities)

Each active ability declares effects in **timing slots** — named phases of execution.

| Slot | When | Typical Use |
|---|---|---|
| `onCast` | Immediately on use, before any roll | Self-buffs, teleport, resource grants |
| `roll` | The check | `attackRoll(melee)`, `savingThrow(dex, 15)` |
| `onHit` | Roll succeeds (attack hits / save fails) | Damage, debuffs, knockback |
| `onMiss` | Roll fails (attack misses / save succeeds) | Half damage, log miss |
| `onTick` | Each turn while status active | DOT, regen, save-to-remove |
| `onRemove` | When status/concentration drops | Cleanup, revert boost |

```yaml
# Active ability — timing slots
fireball:
  name: "Fireball"
  actionCost: action
  spellSlot: 3
  range: 18
  aoe: { shape: sphere, radius: 4 }

  roll: savingThrow("dex", 15)

  onHit: |
    dealDamage("8d6", "fire")
    applyStatus("burning", 2)

  onMiss: |
    dealDamage("4d6", "fire")

dash:
  name: "Dash"
  actionCost: action
  class: [all]
  uiGroup: common

  onCast: |
    grantResource("movement", 5)
```

### Event Hooks (Passive Rules & Reactions)

Passive rules and reactions hook into **engine events** using `on_*` keys.
An ability can hook **multiple events**. Each hook has an optional `condition`
(for prompt gating) and a `do:` block (list of functors).

```yaml
# Passive — hooks multiple events, no cost
staff_of_frost:
  name: "Staff of Frost"
  type: equipment

  on_hit: |
    if (isDamageType("cold")) applyStatus("frozen", 1)

  on_damage_taken: |
    if (isDamageType("cold")) dealDamage(self, 0)    // immune (absorb)

# Reaction — hooks one event, costs reaction, shows prompt
shield_spell:
  name: "Shield"
  type: reaction
  cost: reaction
  prompt: true                              # show "Use Shield?" UI

  on_attack_roll:
    condition: isTarget(self)               # gate for prompt (post-W1)
    do: |
      hits = false
      logMessage("Shield blocks the attack!")

# Reaction — auto, no prompt (enemies always OA)
opportunity_attack:
  name: "Opportunity Attack"
  type: reaction
  cost: reaction
  prompt: false

  on_leave_melee_range:
    condition: isEnemy(mover) && !hasStatus(mover, "disengaged")
    do: |
      attackRoll("melee")
      if (isHit()) dealWeaponDamage()
```

### Functor Vocabulary (W1 — 20 Functions)

Flat camelCase, BG3-inspired naming. Default target is the ability's target.
First arg `self` redirects to caster/owner.

**Argument types:**
- **Dice string:** `2d6`, `1d8+3`, `4d6-2` — rolled by engine
- **Number:** `10`, `50` — fixed amount
- **String:** `fire`, `burning`, `movement` — enum/id value

```yaml
# ── Damage & Healing ──
dealDamage(dice, type)                     # dealDamage(2d6, fire) → target
dealDamage(self, dice, type)               # dealDamage(self, 1d4, necrotic) → caster
dealWeaponDamage()                         # equipped weapon damage → target
regainHitPoints(dice)                      # regainHitPoints(2d8) → target
regainHitPoints(self, dice)                # regainHitPoints(self, 1d6) → caster

# ── Status ──
applyStatus(id, duration)                  # applyStatus(burning, 2) → target
applyStatus(self, id, duration)            # applyStatus(self, haste, 3) → caster
removeStatus(id)                           # removeStatus(burning) → target
removeStatus(self, id)                     # removeStatus(self, cursed) → caster

# ── Resources ──
grantResource(type, amount)                # grantResource(movement, 5)
consumeResource(type, amount)              # consumeResource(action, 1)
  # type: movement | action | bonusAction | reaction

# ── Movement / Position ──
forcePush(distance)                        # knockback target
teleportSelf()                             # blink caster to target tile

# ── Entity Interaction ──
unlockEntity()                             # unlock door/chest
destroyEntity()                            # break door/object

# ── Combat ──
alertEnemies(radius)                       # noise alert nearby enemies

# ── Game State ──
grantXp(amount)                            # grantXp(50)
grantGold(amount)                          # grantGold(25)
setFlag(name, value)                       # setFlag(door_opened, true)

# ── UI / Feedback ──
logMessage(text)                           # combat log entry
floatText(text, color)                     # floating damage/status text
```

### Check Functions (W1 — 16 Functions)

Available on `this` — usable in `do:` blocks and `condition:` strings.
Since do blocks are JS, use normal `if`/`else`/ternary for branching.

```yaml
# Example — normal JS in a do: block
onHit: |
  dealDamage("2d6", "fire")
  if (isCrit()) dealDamage("2d6", "fire")              // bonus crit damage
  if (hasStatus(target, "wet")) dealDamage("1d6", "lightning")  // combo
  applyStatus("burning", 2)
```

```yaml
# Identity
isTarget(self)                   # am I the target?
isSource(self)                   # am I the attacker/caster?
isEnemy(actor)                   # is actor hostile to me?
isAlly(actor)                    # is actor friendly?

# Roll results (on_attack_roll, on_hit, on_miss only)
isHit()                          # did it hit?
isCrit()                         # nat 20?
isMiss()                         # did it miss?

# Attack type
isWeaponAttack()                 # weapon-based?
isMeleeAttack()                  # melee range?
isRangedAttack()                 # ranged?

# State
isAbleToReact(actor)             # has unused reaction?
hasStatus(actor, id)             # has this status?
stacks(actor, id)                # stack count (0 if not present, for onReapply: stack)
isDamageType(type)               # damage type check
hasHpBelow(actor, pct)           # HP below percentage?
isDead(actor)                    # is dead?
```

### Context Per Event Trigger (W1 — 15 Events)

Each event provides specific context variables to hooks:

```yaml
# ── Combat Lifecycle ──
on_combat_start:   { combatants[] }
on_combat_end:     { reason }
on_turn_start:     { actor }
on_turn_end:       { actor }

# ── Attack Flow ──
on_attack_roll:    { source, target, ability, d20, total, hits }
on_hit:            { source, target, ability, isCrit }
on_miss:           { source, target, ability }
on_kill:           { source, target }

# ── Damage ──
on_damage_dealt:   { source, target, amount, damageType }
on_damage_taken:   { source, target, amount, damageType }

# ── Movement ──
on_leave_melee_range:  { mover, hostile }
on_tile_enter:         { actor, tile }

# ── Status ──
on_status_applied: { source, target, status }
on_status_removed: { owner, status, reason }

# ── Explore ──
on_skill_check:    { actor, skill, dc, d20, total }
```

### Execution Model

```
  EVENT FIRES (e.g., on_attack_roll)
  │
  1. Collect all hooks that declare on_attack_roll:
  │   ├── Active status effects on source and target
  │   ├── Equipment passives on source and target
  │   ├── Class features / feats
  │   └── Reactions (cost: reaction)
  │
  2. Sort by priority (ascending, default 50)
  │
  3. For each hook:
  │   ├── Has cost? (reaction, charge) → can't afford? → skip
  │   ├── Ability-level condition? → evaluate → false? → skip
  │   │   └── condition is at ABILITY level, not per-event — gates prompt + cost BEFORE execution
  │   ├── prompt: true? → show "Use [ability]?" UI → player says no? → skip
  │   └── Run do: block → eval("(function(){" + yaml + "})")
  │       └── .call(runner) — `this` has all engine methods + context
  │
  4. All hooks run against SHARED context (no early cancellation)
  │   └── Each hook reads/writes same { hits, total, amount, ... }
  │
  5. Engine reads final context state after all hooks ran
```

### Implementation Path

```
  W1: YAML strings ARE JavaScript — eval + apply

  YAML:
    onHit:
      - dealDamage("2d6", "fire")
      - applyStatus("burning", 2)

  Engine (per functor string):
    const fn = eval("(function(){" + yamlString + "})")
    fn.call(runner)

  `this` inside the function IS the runner — so bare calls like
  dealDamage() resolve to this.dealDamage() automatically.

  class AbilityRunner {
    // `this` context — available as bare calls in YAML
    dealDamage(dice, type)    { /* damage system */ }
    applyStatus(id, dur)      { /* status system */ }
    regainHitPoints(dice)     { /* heal logic */ }
    grantResource(type, amt)  { /* resource system */ }
    logMessage(text)          { /* combat log */ }
    // ...20 methods total

    // Context properties — also on `this`
    source    // attacker / caster
    target    // defender / ability target
    self      // alias for source (BG3 SELF pattern)
    ability   // ability being used
    isCrit    // boolean (on_hit context)
    hits      // boolean (on_attack_roll context)
  }

  Why eval + call:
  ✓ No regex parser needed — JS does the parsing
  ✓ No dispatch table — method resolution is just `this`
  ✓ Modders write real JS expressions: if/ternary/math all work
  ✓ 00_core uses same format — we ARE the first mod

  Phase 1 (W1):     eval("(function(){" + yaml + "})").call(runner)
  Phase 2 (mods):   Same — trusted mods only, eval is fine
  Phase 3 (public): new Function() with frozen context (no globals leak)
```

### Status Effect Schema (Full)

Replaces current 3-field statuses (poisoned/sleep/burning) with moddable schema.
Designed after BG3's status system: `stackId` + `stackPriority` for mutual
exclusion, `onReapply` for self-stacking behavior, and derived stats via `boosts`.

#### Stacking & Grouping Model

**Two separate concerns:**

1. **Same status applied again** → `onReapply` decides (overwrite/stack/independent)
2. **Different status, same `stackId`** → `stackPriority` decides (higher wins)

##### `onReapply` — what happens when the same status id is applied to a target that already has it

| Value | Behavior | Data | UI | Example |
|---|---|---|---|---|
| `overwrite` (default) | Replace existing instance, reset duration | 1 entry, new duration | 1 icon, timer resets | `BURNING 🔥[3]` → reapply → `🔥[3]` |
| `stack` | Increment counter, `max(oldDur, newDur)` | 1 entry, counter + duration | 1 icon + `×N` badge, single timer | `HEAT 🔥×3 [5]` |
| `independent` | Push new instance, each has own timer | N entries, each own duration | N icons, each own countdown | `☠️[4] ☠️[2] ☠️[1]` |

Under the hood, `actor.statuses` is always an array of **instances**. Each
instance stores runtime state:

```js
{
  id: "burning",           // status def id
  def: STATUSES.burning,    // reference to YAML def
  remaining: 2,             // turns left (-1 = permanent)
  stacks: 1,                // counter for onReapply: stack
  source: enemy3,           // who applied this (for aura cleanup, kill credit, boosts)
}
```

`source` is set on every `applyStatus()` call. It enables:
- **Aura cleanup:** when aura parent removed → find all child instances where
  `source === auraBearer` → remove them
- **Kill credit:** DOT kills attribute XP to `source`, not the DOT target
- **Boost context:** `boosts: | saveAll(source.chaMod)` reads the applier's stats
- **Two-paladin overlap:** each paladin's aura child has different `source` →
  `stackId` competition picks winner; if winner's source dies, loser's takes over

`independent` just allows the same id to appear more than once. The tick loop
iterates the array, decrements each, removes expired ones, fires tick functors
for each. No special case needed.

##### `stackId` + `stackPriority` — mutual exclusion between different statuses

Statuses with the same `stackId` compete for the same "slot". Only one variant
(or group, for independent) can be active at a time. `stackPriority` determines
the winner.

**Resolution rule (on apply):**

```
apply(status, target):
  existing = target.statuses.filter(s => s.stackId === status.stackId)
  if (none)                                       → add normally
  if (new priority > existing priority)            → REPLACE: remove all existing, add new
  if (new priority < existing priority)            → BLOCKED: do nothing
  if (same priority, same status id)               → use onReapply (overwrite/stack/independent)
  if (same priority, different status id)           → REPLACE: last-applied-wins
```

**BG3 evidence — spell level upgrades use ascending priority:**

```
FALSE_LIFE_5:  stackPriority: 27, TemporaryHP(27)
FALSE_LIFE_6:  stackPriority: 32, TemporaryHP(32)
# Level 6 replaces level 5 (32 > 27). Level 5 cannot downgrade level 6 (27 < 32).

VAMPIRIC_TOUCH_4:  stackPriority: 4
VAMPIRIC_TOUCH_5:  stackPriority: 5
VAMPIRIC_TOUCH_6:  stackPriority: 6
# Same one-way upgrade pattern.
```

**BG3 evidence — Haste/Slow dominance:**

```
HASTE:  stackId: "HASTE", stackPriority: 10
SLOW:   stackId: "HASTE", stackPriority: 12

# Slow replaces Haste (12 > 10) ✓
# Haste cannot replace Slow (10 < 12) ✗ — BG3 tooltip confirms:
#   "Slowed creatures cannot be Hastened"
```

**Our examples:**

```yaml
# Mutual cancellation — same priority, last-applied-wins
bless:
  stackId: bless_bane
  stackPriority: 0
bane:
  stackId: bless_bane
  stackPriority: 0
# Cast Bless on Baned target → replaces (same priority, diff id, last wins)
# Cast Bane on Blessed target → replaces (same priority, diff id, last wins)

# One-way upgrade — ascending priority
poison:
  stackId: poison
  stackPriority: 0
  onReapply: independent          # multiple poison instances allowed
deadly_poison:
  stackId: poison
  stackPriority: 10
  onReapply: overwrite
# Deadly replaces all Poison instances (10 > 0)
# Poison cannot replace Deadly (0 < 10) → blocked
# Deadly on Deadly → overwrite (same id, same priority → use onReapply)

# Stacking buff — same id reapply increments counter
heat:
  stackId: heat
  stackPriority: 0
  onReapply: stack
# Heat ×1 → hit again → Heat ×2 → hit again → Heat ×3
# Passive reads stacks: if (stacks(target, "heat") >= 3) dealDamage("2d6", "fire")
```

#### Auras — Engine-Managed Radius Effects

An aura is **not a separate system** — it's a status with radius fields. The
engine handles the spatial query: each tick (or on movement), check which actors
are within `auraRadius` of the source, apply/remove the child status accordingly.

**BG3 pattern:** `AuraRadius: 3` + `AuraStatuses: "IF(Ally()):ApplyStatus(BUFF)"`.
The engine owns range-checking, the modder just declares fields.

**Why engine-managed?** Two reasons:
1. **Gameplay:** auto-apply/remove child status on enter/leave range. No modder scripting.
2. **Rendering:** the engine needs `auraRadius` to draw the translucent circle on the
   map — same as ability `range` draws a targeting circle on hover. Any field that
   affects what the player *sees* (radius circles, range indicators, projectile
   paths) must be engine-known data, not buried in a JS body.

```yaml
# Aura status — lives on the paladin
aura_of_protection:
  duration: -1
  auraRadius: 3                    # tiles — engine draws circle + checks range
  auraTargets: allies              # allies | enemies | all
  auraCondition: "not hasTag('inanimate')"  # optional JS condition on candidate
  auraApply: aura_prot_buff        # child status applied to in-range actors

# Child status — auto-applied/removed by engine
aura_prot_buff:
  duration: -1                     # engine-managed: removed when leaving range
  boosts: |
    saveAll(source.chaMod)         # source = the paladin bearing the aura

# Offensive aura — only affects frightened enemies
aura_of_conquest:
  duration: -1
  auraRadius: 3
  auraTargets: enemies
  auraCondition: "hasStatus('frightened')"
  auraApply: aura_conquest_dmg

aura_conquest_dmg:
  duration: -1
  onTick: |
    dealDamage(self, 5, "psychic")
```

**Aura fields on status def:**

| Field | Type | Default | Required | Purpose |
|---|---|---|---|---|
| `auraRadius` | number | — | Yes (if aura) | Range in tiles. Engine draws circle + checks distance |
| `auraTargets` | string | `all` | No | `allies` / `enemies` / `all` |
| `auraCondition` | JS string | — | No | Extra filter on candidate actors |
| `auraApply` | string | — | Yes (if aura) | Status id to apply to actors in range |

**Engine flow:**
```
each tick (or on any actor movement):
  for each actor with auraRadius:
    candidates = actorsWithinRadius(source, auraRadius)
    filter by auraTargets + auraCondition
    for each candidate in filtered:
      if not hasStatus(candidate, auraApply, source):
        applyStatus(candidate, auraApply, -1, { source })
    for each actor outside range with auraApply from this source:
      removeStatus(actor, auraApply, source)
```

**Rendering contract:** Any status with `auraRadius` → engine draws a translucent
circle on the map. Same pattern as ability `range` → targeting circle on hover.
The rule: **if a field affects what the player sees, it's engine-known data.**

#### Boosts — Passive Stat Modifiers

`boosts` is a **JS pipe string** — the same eval+call pattern as event hooks,
but run through a separate `BoostRunner` that exposes stat-modifier methods
instead of action methods. Stats are always **derived** from current active
sources, never snapshot-mutated.

**Rule: mutations are immediate, stats are derived, boosts are cached per
change (not per query).**

```yaml
haste:
  boosts: |                        # JS — runs via BoostRunner, cached
    ac(2)
    multiplyMovement(2)
    advantage("save_dex")
  onTick: |                        # JS — runs via EventRunner each turn
    grantResource("action", 1)
  onRemove: |                      # JS — runs via EventRunner on removal
    applyStatus(self, "lethargy", 1)
```

**BoostRunner API** — `this` context when `boosts: |` body executes:

```js
class BoostRunner {
  // Stat modifiers — additive
  ac(n)               // +n to AC
  str(n), dex(n), con(n), wis(n), int_(n), cha(n)  // +n to ability score
  maxHp(n)            // +n to max HP
  damage(n)           // +n to all outgoing damage
  movement(n)         // +n tiles movement
  save(stat, n)       // +n to specific save
  saveAll(n)          // +n to all saves

  // Multipliers
  multiplyMovement(m) // ×m movement (stacks multiplicatively)

  // Advantage / disadvantage — 5e cancel rules
  advantage(type)     // "attacks", "save_dex", "ability_checks", etc.
  disadvantage(type)

  // Special
  autoFail(type)      // auto-fail saves of this type
  immunity(damageType) // immune to damage type
  resistance(damageType)
  vulnerability(damageType)

  // Read-only context
  self                // the actor bearing this status/equipment
  source              // the actor who applied the status (for aura_prot_buff etc.)

  // Check functions
  hasHpBelow(pct)     // true if HP < pct% of max
  hasStatus(id)       // true if self has status id
  stacks(id)          // stack count for status id on self
}
```

**Derived stat recalculation — cached, fires on change:**

```js
recalcBoosts(actor) {
  const ctx = new BoostRunner(actor);
  for (const s of actor.statuses)
    if (s.def.boosts) eval("(function(){" + s.def.boosts + "}").call(ctx);
  for (const e of actor.equipment)
    if (e.def.boosts) eval("(function(){" + e.def.boosts + "}").call(ctx);
  actor.derived = ctx.result();    // { ac, movement, saves, advantages, ... }
}

// Triggers — recalc only when boost set changes:
applyStatus()   → recalcBoosts(target) → emit('statsChanged', target)
removeStatus()  → recalcBoosts(target) → emit('statsChanged', target)
equip()         → recalcBoosts(target) → emit('statsChanged', target)
unequip()       → recalcBoosts(target) → emit('statsChanged', target)
levelUp()       → recalcBoosts(target) → emit('statsChanged', target)
```

**Why not onApply/onRemove for stat mods?**

```
# BAD: snapshot approach — fragile, ordering bugs
onApply: target.ac += 2
onRemove: target.ac -= 2    ← what if something else modified AC in between?

# GOOD: derived approach — always consistent
boosts: | ac(2)              ← engine recalcs all active sources on change
```

**Two runners, same pattern:**

| Runner | `this` methods | Triggers | Purpose |
|---|---|---|---|
| `EventRunner` | `dealDamage`, `applyStatus`, `heal`, etc. | `onCast`, `onHit`, `onTick`, etc. | Actions that change game state |
| `BoostRunner` | `ac()`, `str()`, `advantage()`, etc. | Status/equipment change | Passive stat modifiers, result cached |

**Cascade safety:** Any event handler can mutate statuses mid-resolution
(tick1 removes BLEEDING via OnHeal, tick2 applies new status via onDamage).
Because each mutation triggers `recalcBoosts`, derived stats always reflect
current reality.

#### UI Integration

**Event-driven update — render only when boost set changes:**

```js
applyStatus(target, status)  → mutate → emit('statsChanged', target)
removeStatus(target, status) → mutate → emit('statsChanged', target)
equip(target, item)          → mutate → emit('statsChanged', target)

// UI listener
on('statsChanged', (actor) => {
  if (actor === player) {
    refreshSidePanel();       // re-derive all stats from active sources
    renderStatusIcons();      // re-render portrait status bar
  }
})
```

**Side panel — shows derived stat with boost diff:**

```
AC: 15 (+2)       ← base 13, HASTE boosts +2
Movement: 6 (×2)  ← base 3, HASTE doubles
STR: 10
```

When HASTE expires → `statsChanged` fires → panel immediately shows `AC: 13`.

**Status icon bar — per onReapply mode:**

```
overwrite:    [🔥 3]                    ← 1 icon, turns remaining
stack:        [🔥×3  5]                 ← 1 icon, ×N badge, turns remaining
independent:  [☠️4] [☠️2] [☠️1]        ← N icons, each own countdown
```

#### Status Examples

```yaml
statuses:
  # Pure label — no effect, just a flag for condition checks
  disengaged:
    id: disengaged
    label: "Disengaged"
    icon: "🏃"
    duration: 1
    wearOff: turnStart                     # removed at owner's next turn start
    tags: [movement]

  # Stat modifier via boosts — changes AC while active
  dodging:
    id: dodging
    label: "Dodging"
    icon: "🛡"
    duration: 1
    wearOff: turnStart
    boosts: |
      ac(2)

  # DOT — damage each tick
  poisoned:
    id: poisoned
    label: "Poisoned"
    icon: "🤢"
    duration: 3
    onReapply: independent                 # multiple poison stacks, each own timer
    onTick: |
      dealDamage(self, "1d4", "poison")
      floatText("🤢", "green")

  # DOT — overwrite, save to remove
  burning:
    id: burning
    label: "Burning"
    icon: "🔥"
    duration: 2
    onReapply: overwrite                   # reapply just resets timer
    stackId: burning
    onTick: |
      dealDamage(self, "1d6", "fire")
      floatText("🔥", "orange")
    saveToRemove: { stat: dex, dc: 12 }

  # Stacking debuff — passive reads count for bonus damage
  heat:
    id: heat
    label: "Heat"
    icon: "🌡"
    duration: 5
    onReapply: stack                        # counter goes up, timer = max
    stackId: heat

  # Buff with boosts + events
  haste:
    id: haste
    label: "Hastened"
    icon: "⚡"
    duration: 10
    stackId: haste_slow
    stackPriority: 10
    boosts: |
      ac(2)
      multiplyMovement(2)
      advantage("save_dex")
    onTick: |
      grantResource("action", 1)
    onRemove: |
      applyStatus(self, "lethargy", 1)

  # Dominates haste — same stackId, higher priority
  slow:
    id: slow
    label: "Slowed"
    icon: "🐌"
    duration: 10
    stackId: haste_slow
    stackPriority: 12                      # 12 > 10: replaces haste, blocks haste
    boosts: |
      ac(-2)
      multiplyMovement(0.5)
      disadvantage("save_dex")

  # Skip turn (stun)
  stunned:
    id: stunned
    label: "Stunned"
    icon: "⭐"
    duration: 1
    skipTurn: true

  # Permanent until town return
  cursed:
    id: cursed
    label: "Cursed"
    icon: "💀"
    duration: -1                           # -1 = permanent (never decays)
    wearOff: townReturn                    # removed on town return
    boosts: |
      str(-2)
      maxHp(-10)
    tags: [curse, magic]

  # Modder custom — compose from same fields
  berserking:
    id: berserking
    label: "Berserking"
    icon: "😡"
    duration: 3
    boosts: |
      damage(4)
      ac(-2)
    tags: [rage, buff]

  # Aura — engine-managed radius, child status to nearby actors
  aura_of_protection:
    id: aura_of_protection
    label: "Aura of Protection"
    icon: "🛡️"
    duration: -1
    auraRadius: 3                          # tiles — engine draws circle, checks range
    auraTargets: allies                    # allies | enemies | all
    auraCondition: "not hasTag('inanimate')"  # optional filter
    auraApply: aura_prot_buff              # child status applied to in-range actors

  aura_prot_buff:
    id: aura_prot_buff
    label: "Protected"
    icon: "✨"
    duration: -1                           # engine-managed: removed when leaving range
    boosts: |
      saveAll(source.chaMod)               # source = the paladin bearing the aura
```

#### Status Fields Reference

| Field | Type | Default | Required | Purpose |
|---|---|---|---|---|
| `id` | string | — | Yes | Lookup key |
| `label` | string | — | Yes | Display name |
| `icon` | string | — | No | Emoji or sprite key |
| `duration` | number | — | Yes | Turns. `-1` = permanent |
| `onReapply` | string | `overwrite` | No | `overwrite` / `stack` / `independent` |
| `stackId` | string | `= id` | No | Grouping — same stackId statuses compete |
| `stackPriority` | number | `0` | No | Higher wins when same stackId applied |
| `boosts` | JS string | — | No | Passive stat modifiers via BoostRunner (cached on change) |
| `wearOff` | string | — | No | `turnStart`, `turnEnd`, `townReturn`, `rest` |
| `skipTurn` | bool | `false` | No | Stun — skip entire turn |
| `tags` | string[] | — | No | For group queries: `[curse, magic, buff]` |
| `saveToRemove` | object | — | No | `{ stat, dc }` — roll each tick to shake off |
| `onApply` | JS string | — | No | Runs once when status first applied |
| `onTick` | JS string | — | No | Runs each turn (start by default, configurable) |
| `onRemove` | JS string | — | No | Runs once when status removed/expires |
| `auraRadius` | number | — | No | Range in tiles. Engine draws circle + checks distance |
| `auraTargets` | string | `all` | No | `allies` / `enemies` / `all` |
| `auraCondition` | JS string | — | No | Extra filter on candidate actors |
| `auraApply` | string | — | No | Status id to apply to actors in range |

**Instance-only fields (runtime, not in YAML def):**

| Field | Type | Purpose |
|---|---|---|
| `remaining` | number | Turns left. Engine decrements. `-1` = permanent |
| `stacks` | number | Counter for `onReapply: stack` mode |
| `source` | actor ref | Who applied this. For aura cleanup, kill credit, boost context |

#### BG3 Comparison — Status System

| BG3 Field | BG3 Values | Our Equivalent | Notes |
|---|---|---|---|
| `StackId` | String | `stackId` | Grouping for mutual exclusion |
| `StackType` | (omit)/Additive | `onReapply` | We add `independent` (BG3 doesn't have it) |
| `StackPriority` | Number | `stackPriority` | Higher replaces lower, lower blocked |
| `TickType` | StartTurn/EndTurn | `wearOff` + `onTick` | We use event hooks instead of enum |
| `TickFunctors` | Functor string | `onTick: \|` | JS instead of BG3 functor syntax |
| `OnApplyFunctors` | Functor string | `onApply: \|` | Same |
| `OnRemoveFunctors` | Functor string | `onRemove: \|` | Same |
| `RemoveEvents` | OnHeal/OnTurn etc | `saveToRemove` + `wearOff` | Simpler for W1 |
| `Boosts` | `"AC(2);..."` | `boosts: \| ac(2)` | JS pipe string via BoostRunner, cached on change |
| `AuraRadius` | Number | `auraRadius` | Engine draws circle, checks range each tick |
| `AuraStatuses` | `"IF(...):ApplyStatus(...)"` | `auraTargets` + `auraApply` | We split into declarative fields |
| `AuraFlags` | `ShouldCheckLOS` | `auraCondition` | We use JS condition instead of flags |
| `StatusPropertyFlags` | `TickingWithSource` etc | `source` on instance | Engine tracks source ref on every instance |
| `StatusPropertyFlags` | DisableOverhead etc | (not needed) | BG3 uses for hidden technical statuses |

**Key differences from BG3:**
- BG3 chains 3-4 hidden technical statuses to implement complex behaviors
  (HASTE → HASTE_ATTACK → HASTE_LETHARGY). Our eval+call model does the same
  in a single `onTick`/`onRemove` JS block — no hidden status layering needed.
- BG3's `AuraStatuses` embeds conditions in a functor string. We split it into
  declarative fields (`auraTargets`, `auraCondition`, `auraApply`) — easier to
  read, engine handles the spatial query + apply/remove lifecycle.
- BG3's `Boosts` is a semicolon-delimited functor string. Ours is a JS body run
  through BoostRunner — same eval+call pattern as event hooks.

#### Engine Work Needed

| Feature | Status | Notes |
|---|---|---|
| `BoostRunner` class | ❌ Missing | eval+call runner with `ac()`, `str()`, `advantage()`, etc. |
| `recalcBoosts(actor)` | ❌ Missing | Iterate statuses + equipment, run `boosts: \|`, cache `actor.derived` |
| `statsChanged` event | ❌ Missing | Emit on applyStatus/removeStatus/equip/levelUp |
| Side panel boost display | ❌ Missing | Show `AC: 15 (+2)` with diff from base |
| Status icon bar | ❌ Missing | Render icons per status with duration/badge |
| `stackId`/`stackPriority` | ❌ Missing | Resolution logic in applyStatus |
| `onReapply` modes | ❌ Missing | overwrite/stack/independent in applyStatus |
| `stacks(actor, id)` check | ❌ Missing | Read counter for stack mode statuses |
| `onApply`/`onTick`/`onRemove` | ❌ Missing | Wire into status lifecycle via eval+call |
| `saveToRemove` | ❌ Missing | Roll save each tick, remove on success |
| `wearOff` rules | ❌ Missing | Hook into mode transitions |
| `duration: -1` = permanent | ❌ Missing | Skip decrement if -1 |
| `tags` field | ❌ Missing | Array on status def for group queries |
| `source` on status instance | ❌ Missing | Track who applied; for aura cleanup, kill credit, boost context |
| `removeStatusBySource()` | ❌ Missing | Remove all instances from a specific source (aura death cleanup) |
| Aura spatial engine | ❌ Missing | Per-tick range check, auto-apply/remove child status |
| Aura radius rendering | ❌ Missing | Draw translucent circle at `auraRadius` around source |
| Range indicator rendering | ❌ Missing | Show ability range circle on hover/select |

### Resources — Engine-Level Numeric Pools

Resources are **not statuses**. They are numeric pools the engine auto-checks
and auto-deducts when an ability declares a cost. No scripting needed — declare
the cost, engine handles the rest.

**BG3 pattern:** `UseCosts: "ActionPoint:1; SpellSlotsGroup:1:1:3"` — engine
verifies actor can afford, deducts on cast, grays out button if insufficient.

#### Resource Definitions

```yaml
# Per-turn resources — reset at turn start
actionPoint:   { max: 1, resetOn: turnStart }       # ✅ exists (playerAP)
bonusAction:   { max: 1, resetOn: turnStart }       # W1 — needs implementation
reaction:      { max: 1, resetOn: turnStart }       # ❌ missing
movement:      { max: 5, resetOn: turnStart }       # ✅ exists (playerMoves)

# Per-rest resources — reset on short/long rest
spellSlot_1:   { max: 2, resetOn: longRest }        # ❌ missing (post-W1)
spellSlot_2:   { max: 1, resetOn: longRest }        # ❌ missing (post-W1)
rage:          { max: 3, resetOn: longRest }        # ❌ missing (post-W1)
ki:            { max: 4, resetOn: shortRest }       # ❌ missing (post-W1)

# Per-cooldown resources — reset on specific triggers
secondWind:    { max: 1, resetOn: shortRest }       # ❌ missing (post-W1)
actionSurge:   { max: 1, resetOn: shortRest }       # ❌ missing (post-W1)
```

#### Ability Cost Declaration

Abilities declare costs via fields. Engine auto-checks availability and
auto-deducts on use. Menu UI auto-grays if insufficient.

```yaml
fireball:
  actionCost: action               # deducts 1 actionPoint
  spellSlot: 3                     # deducts 1 spellSlot_3
  # Engine: can afford? → cast → deduct both
  # UI: gray out if either insufficient

second_wind:
  actionCost: bonusAction           # deducts 1 bonusAction
  uses: secondWind                  # deducts 1 secondWind charge
  # Engine: can afford both? → use → deduct both

shield_spell:
  cost: reaction                    # deducts 1 reaction
  spellSlot: 1                     # deducts 1 spellSlot_1
```

**No `usable:` field needed** — the engine derives availability from declared
cost fields. If `spellSlot: 3` and actor has 0 level-3 slots, ability is
unavailable. Post-W1 can add explicit `usable:` for prerequisites like
"needs shield equipped".

#### Resources vs Statuses — Decision Framework

| Use a **Resource** when... | Use a **Status** when... |
|---|---|
| It's a numeric pool (spend/regain) | It's an effect on an actor |
| Auto-check/auto-deduct on ability use | Has duration, ticks, boosts |
| Resets on rest/turn | Can stack, be dispelled, save-to-remove |
| Examples: spell slots, rage, ki, action | Examples: poisoned, haste, burning |

**BG3 evidence:** SecondWind uses `UseCosts: "BonusActionPoint:1"` +
`Cooldown: "OncePerShortRest"`. Rage uses `UseCosts: "BonusActionPoint:1; Rage:1"`.
ActionSurge uses `Cooldown: "OncePerShortRest"`. All engine-level, not statuses.

### Reaction System & Opportunity Attacks (Post-W1)

Reactions are abilities that fire on **someone else's action**, costing the
reactor's reaction resource (1/round). BG3 calls these "Interrupts".

```yaml
# Action economy — defined as resources (see Resources section above)
PLAYER TURN RESOURCES:
  action: 1          # ✅ exists (playerAP)
  bonusAction: 1     # W1 — needs implementation
  reaction: 1        # ❌ missing — resets at turn start
  movement: 5        # ✅ exists (playerMoves)
```

**Reaction flow:**

```
  1. Event fires (enemy moves away from player)
  2. Engine checks: on_leave_melee_range hooks exist?
  3. For each hook with cost: reaction
  │   ├── Actor has reaction available? No → skip
  │   ├── condition passes? No → skip
  │   ├── prompt: true? → show UI: "Opportunity Attack? [Yes] [No]"
  │   │   └── Player says No → skip, keep reaction for later
  │   ├── prompt: false? → auto-execute (enemies always use)
  │   └── Execute do: block → consume reaction
  4. Continue original event (movement resumes)
```

**OA specifically:**

```yaml
opportunity_attack:
  name: "Opportunity Attack"
  type: reaction
  cost: reaction
  prompt: false                 # auto for enemies; TODO: player prompt option
  class: [all]

  on_leave_melee_range:
    condition: isEnemy(mover) && !hasStatus(mover, "disengaged")
    do: |
      attackRoll("melee")
      if (isHit()) dealWeaponDamage()
```

**Disengage counters OA** — pure status check, no special engine code:

```yaml
disengage:
  name: "Disengage"
  actionCost: action
  class: [all]
  uiGroup: common
  onCast: |
    applyStatus(self, "disengaged", 1)
    logMessage("You disengage carefully.")

# disengaged status = pure label, OA condition checks for it
disengaged:
  id: disengaged
  label: "Disengaged"
  icon: "🏃"
  duration: 1
  wearOff: turnStart
```

### BG3 Comparison Summary

| BG3 Concept | BG3 Syntax | Our Equivalent |
|---|---|---|
| Spell on cast | `SpellProperties` | `onCast:` slot |
| Spell on hit | `SpellSuccess` | `onHit:` slot |
| Spell on miss | `SpellFail` | `onMiss:` slot |
| Spell roll | `SpellRoll` | `roll:` slot |
| Passive trigger | `StatsFunctorContext: "OnAttack"` | `on_hit:` hook |
| Interrupt | `InterruptData` + `InterruptContext` | `on_*:` hook + `cost: reaction` |
| Self-target | `DealDamage(SELF, 1d4, Cold)` | `dealDamage(self, 1d4, cold)` |
| Target (default) | `DealDamage(2d6, Fire)` | `dealDamage(2d6, fire)` |
| Condition | `Conditions: "IsHit() and ..."` | `condition: isHit()` |
| Inline condition | `IF(HasStatus('WET')):DealDamage(...)` | `if (hasStatus(target, "wet")) dealDamage(...)` |
| Boost (passive stat) | `Boosts: "AC(2)"` | `boosts: \| ac(2)` on status | JS pipe via BoostRunner |
| Last damage ref | `RegainHitPoints(SELF, (DamageDone)/2)` | Post-W1: `regainHitPoints(self, lastDamage/2)` |

---

## Passive Rule Sources

| Source | Lifetime | Example |
|---|---|---|
| **Equipment** | While equipped | Staff of Frost: fire → cold |
| **Enchantment** | While gear equipped | Glacial: cold hits → frostbitten |
| **Town upgrade** | Permanent | Training Grounds: Trip prone +1 turn |
| **Class passive** | Permanent (learned) | Sculpt Spells: allies auto-save on AOE |
| **Status effect** | Temporary (X turns) | Empowered: spells +2d4 |
| **Companion aura** | While in range | Arcane Ward: +1 save vs magic (via `auraRadius` status) |
| **Terrain** | While standing on tile | Consecrated ground: heals +2 |

---

## BG3-Style Item Examples

```yaml
# "Sword of Life Stealing" — on crit, heal
sword_of_life_stealing:
  on_hit: |
    if (isCrit()) {
      regainHitPoints(self, 10)
      logMessage("Life Stealing: healed for 10!")
    }

# "Boots of Speed" — on combat start, gain haste
boots_of_speed:
  on_combat_start: |
    applyStatus(self, "haste", 2)

# "Adamantine Armour" — crit immunity (reduce crit to normal hit)
adamantine_armour:
  on_attack_roll: |
    if (isCrit()) {
      isCrit = false
      logMessage("Adamantine absorbs the critical!")
    }

# "Great Weapon Master" — on kill, bonus action attack
great_weapon_master:
  on_kill: |
    if (isSource(self)) {
      grantResource("bonusAction", 1)
      logMessage("Great Weapon Master: bonus attack!")
    }
```

---

## Encounter System & Squad Placement

### Current State

Encounters are a flat creature list per stage. Each creature gets scattered
randomly on the generated map with no clustering, no squad grouping, and no
room awareness. This produces isolated enemies — easy solo kills, no tactics.

### Problem

| Issue | Impact |
|---|---|---|
| No squads | Every fight is 1v1, initiative system wasted |
| No room awareness | Enemies placed in corridors, blocking passage |
| No naming | "Goblin" vs "Goblin" — can't tell apart in log |
| No difficulty curve within floor | First room same as last room |
| No encounter variety | Same creatures every run at same depth |

### Squad-Based Encounter Design

**Core idea:** Encounters are **squads**, not individual creatures. A squad is a
group that fights together, placed together, and enters combat together.

#### Squad Format (New YAML Schema)

```yaml
# stage.yaml — generated stages
encounters:
  # ── Squad encounters (new format) ──
  - squad: patrol
    creatures: [goblin, goblin]
    count: 2                               # place 2 copies of this squad
    placement: corridor                    # prefer corridors for patrols
    ai:
      patrolPath: random                   # pick 2-3 waypoints in nearby rooms

  - squad: camp
    creatures: [goblin, goblin, goblin_shaman]
    count: 1
    placement: room_center                 # place in largest available room

  - squad: ambush
    creatures:
      - creature: goblin_trapper
        hidden: true                       # starts in stealth
      - creature: spider
      - creature: spider
    count: 1
    placement: room_dead_end               # dead-end rooms feel like traps

  - squad: elite_guard
    creatures:
      - creature: goblin_captain
        name: "Captain Skrix"              # named — shows in combat log
      - creature: goblin_warrior
      - creature: goblin_warrior
    count: 1
    placement: room_near_stairs            # guard the exit

  # ── Legacy flat format (still supported) ──
  - creature: wolf
    count: 2                               # placed individually, no squad
```

**Backward compatible:** Flat `creature:` entries still work. `squad:` is the new
format that adds grouping + placement hints.

#### Squad Placement Algorithm

```
  SQUAD PLACEMENT (generated maps)
  │
  1. Generator produces rooms[] with bounds + type (dead_end, hub, corridor)
  2. Sort squads by placement priority:
  │   room_near_stairs > room_center > room_dead_end > corridor > any
  │
  3. For each squad:
  │   ├── Pick room matching placement hint (fallback: any room)
  │   ├── Mark room as "occupied" (avoid stacking squads)
  │   ├── Pick anchor tile: center of room
  │   ├── Place each creature within 2 tiles of anchor
  │   │   └── Must be floor tile, not used, not blocking door
  │   ├── Auto-assign group: "squad_0", "squad_1", ...
  │   │   └── _buildAlertedEnemySet() already pulls same-group into combat
  │   └── If room too small: overflow to adjacent corridor
  │
  4. Flat creatures (no squad): use existing _randomFloorTile() as fallback
  │
  5. Minimum 6-tile distance from playerStart (existing rule, kept)
```

#### Creature Naming (BG3-Style)

Three layers of naming:

```
  NAMING RESOLUTION
  │
  ├── Has `name:` in encounter YAML? → Use it ("Captain Skrix")
  │   └── Story-significant, quest targets, named bosses
  │
  ├── Multiple of same type in combat? → Auto-suffix
  │   └── "Goblin A", "Goblin B", "Goblin C"
  │   └── Suffix assigned at combat start, stable for duration
  │   └── Reset between encounters
  │
  └── Unique type in combat? → No suffix
      └── "Goblin Shaman" (only one, no suffix needed)
```

**Implementation:**
```typescript
// In enterCombat() or _buildAlertedEnemySet():
const typeCounts: Record<string, number> = {};
for (const e of combatGroup) {
  if (e.name) continue;  // explicit name wins
  const t = e.type;
  typeCounts[t] = (typeCounts[t] || 0) + 1;
  if (typeCounts[t] > 1 || combatGroup.filter(c => c.type === t).length > 1) {
    e.displayName = `${e.name || e.type} ${String.fromCharCode(64 + typeCounts[t])}`;
  }
}
```

### W1 Encounter Tables by Floor

Each floor defines **squad templates** that the stage uses. Squads are placed
in rooms by the generator. Difficulty escalates through composition, not just count.

#### B1F — The Warren Depths (Easy)

| Squad | Composition | Count | Placement | Total XP |
|---|---|---|---|---|
| Patrol | 2× goblin | 2 | corridor | 100 |
| Camp | 3× goblin + 1× goblin_shaman | 1 | room_center | 175 |
| Wolves | 1× wolf + 1× goblin | 1 | room_dead_end | 55 |
| **Floor total** | | | | **~330 XP** |

Creature summary: 7 goblins, 1 shaman, 1 wolf = **9 enemies**

**Player level 1 expectation:** 3 fights, each 2-4 enemies. Can long-rest between.
First patrols teach combat basics (2v1). Camp is the "big fight" of the floor.

#### B2F — The Goblin Barracks (Medium)

| Squad | Composition | Count | Placement | Total XP |
|---|---|---|---|---|
| Patrol | 2× goblin + 1× goblin_archer | 2 | corridor | 170 |
| Barracks | 2× goblin_warrior + 1× goblin_archer | 1 | room_center | 135 |
| Spider nest | 2× spider + 1× goblin_trapper | 1 | room_dead_end | 125 |
| Captain's squad | 1× goblin_captain + 2× goblin | 1 | room_near_stairs | 300 |
| **Floor total** | | | | **~730 XP** |

Creature summary: 4 goblins, 3 archers, 2 warriors, 1 trapper, 2 spiders, 1 captain = **13 enemies**

**Player level 2 expectation:** Captain squad is the floor's mini-boss. Spider nest
introduces poison. Archers force positioning decisions.

#### B3F — The Bone Warrens (Hard)

| Squad | Composition | Count | Placement | Total XP |
|---|---|---|---|---|
| Patrol | 2× goblin_warrior + 1× goblin_archer | 1 | corridor | 135 |
| Shaman circle | 2× goblin_shaman + 2× goblin | 1 | room_center | 250 |
| Spider den | 2× cave_spider + 1× goblin_trapper | 1 | room_dead_end | 165 |
| Elite guard | 1× hobgoblin + 2× goblin_warrior | 1 | room_near_stairs | 175 |
| Ambush | 2× goblin_archer (hidden) + 1× goblin_trapper (hidden) | 1 | corridor | 115 |
| **Floor total** | | | | **~840 XP** |

Creature summary: 2 goblins, 3 archers, 3 warriors, 2 shamans, 2 cave spiders,
1 trapper, 1 hobgoblin = **14 enemies**

**Player level 3 expectation:** Ambush squad is first hidden enemies — stealth/perception
matters. Cave spiders have poison. Hobgoblin hits hard. Shaman circle heals.

#### B4F — The Deep Pits (Very Hard)

| Squad | Composition | Count | Placement | Total XP |
|---|---|---|---|---|
| Heavy patrol | 1× hobgoblin + 1× goblin_warrior + 1× goblin_archer | 2 | corridor | 310 |
| War camp | 1× goblin_captain + 2× goblin_warrior + 1× goblin_shaman | 1 | room_center | 350 |
| Spider lair | 2× cave_spider + 1× cave_spider (elite) | 1 | room_dead_end | 180 |
| Chief's guard | 1× goblin_chief + 2× hobgoblin | 1 | room_near_stairs | 300 |
| Trapper ambush | 2× goblin_trapper (hidden) + 2× spider | 1 | corridor | 170 |
| **Floor total** | | | | **~1,310 XP** |

Creature summary: 2 archers, 4 warriors, 1 captain, 1 chief, 3 hobgoblins,
2 trappers, 3 cave spiders, 2 spiders, 1 shaman = **19 enemies**

**Player level 4 expectation:** Chief's guard is pre-boss warm-up. Multiple hobgoblins
in heavy patrols. Elite spider variant. This floor should feel dangerous — player
may consider extracting.

#### B5F — The Warchief's Throne (Boss)

Fixed layout, not generated. See `gw_b5f/stage.yaml` for explicit positions.
Boss design in `game-parameters.md` — 3-phase Goblin Warlord fight.

| Squad | Composition | Placement |
|---|---|---|
| Throne guard | 2× orc + 2× goblin_shaman | Fixed positions, flanking throne |
| Gate patrol | 2× goblin | Fixed, near entrance doors |
| **Boss** | Goblin Warlord (3-phase, 150 HP) | Center throne |

### Difficulty Budget Formula

Each floor targets a total XP budget based on player level:

```
  FLOOR XP BUDGET = partySize × playerLevel × 100 × difficultyMultiplier

  difficultyMultiplier by depth:
    B1F = 1.0 (easy)
    B2F = 1.5 (medium)
    B3F = 2.0 (hard)
    B4F = 2.5 (very hard)
    B5F = boss (no budget — scripted)

  Example (solo player, no companions):
    B1F: 1 × 1 × 100 × 1.0 = 100 XP budget  (actual ~330 — generous)
    B2F: 1 × 2 × 100 × 1.5 = 300 XP budget  (actual ~730 — tight)
    B3F: 1 × 3 × 100 × 2.0 = 600 XP budget  (actual ~840 — hard)
    B4F: 1 × 4 × 100 × 2.5 = 1000 XP budget (actual ~1310 — very hard)

  With Kira companion (partySize = 2):
    B4F: 2 × 4 × 100 × 2.5 = 2000 XP budget — comfortable
```

### Encounter Randomization (Future)

Current: each floor always has the same squads. Future: encounter **pools** per
depth band, with weighted random selection.

```yaml
# worlds.yaml (future format)
encounterPools:
  depth_1:
    budget: 330
    squads:
      - id: goblin_patrol
        creatures: [goblin, goblin]
        cost: 50
        weight: 40
      - id: goblin_camp
        creatures: [goblin, goblin, goblin, goblin_shaman]
        cost: 175
        weight: 20
      - id: wolf_pack
        creatures: [wolf, wolf]
        cost: 60
        weight: 20
      - id: spider_nest
        creatures: [spider, spider, spider]
        cost: 120
        weight: 15
      - id: lone_shaman
        creatures: [goblin_shaman]
        cost: 50
        weight: 5
    # Engine fills rooms until budget exhausted, weighted random selection
```

**W1 MVP: Fixed squad lists per floor.** Randomized pools are post-W1.

### Engine Work Needed

| Feature | Status | Notes |
|---|---|---|
| `squad:` YAML parsing in `applyCreatures()` | ❌ Missing | New format alongside flat |
| Room-aware placement | ❌ Missing | BSP returns rooms, need to pass to placement |
| Squad clustering (2-tile radius) | ❌ Missing | New placement logic |
| Auto `group:` assignment | ❌ Missing | `squad_N` naming |
| `placement:` hint matching | ❌ Missing | Room type classification |
| Auto-suffix naming ("Goblin A") | ❌ Missing | In `enterCombat()` |
| `name:` override display | ⚠️ Partial | Field exists, not shown in UI |
| `hidden:` on encounter | ❌ Missing | Pre-stealth enemy state |
| Elite/champion roll | ❌ Missing | Designed in game-parameters.md |
| Encounter budget system | ❌ Missing | Future — randomized pools |

### AI Profile Behaviors (W1: basic, ranged, support)

Each creature declares `ai.profile` in creatures.yaml. The engine dispatches to
a behavior function per profile. All profiles share the same `useAbility()`
pipeline — they just differ in **which ability to pick** and **where to move**.

```
  AI TURN — profile dispatch
  │
  ├── [basic] — Chase + melee
  │   1. Move: BFS toward nearest enemy, spend full movement budget
  │   2. In melee range? → pick highest-priority melee ability from abilities[]
  │   3. No abilities? → basic attack (creature.attack)
  │   4. Can't reach? → move as close as possible, end turn
  │
  ├── [ranged] — Keep distance, prefer ranged
  │   1. In melee range (dist ≤ 1)? → move AWAY up to fleeRange tiles
  │   2. Target in preferredRange? → pick ranged ability from abilities[]
  │   3. Too far? → move closer until in preferredRange, then use ability
  │   4. No ranged abilities? → fallback to basic attack (move to melee)
  │   5. All abilities on cooldown? → basic attack
  │
  └── [support] — Heal/buff allies, avoid melee
      1. Any ally below 50% HP? → pick heal ability targeting that ally
      2. Any ally without buff? → pick buff ability targeting that ally
      3. No support abilities available (cooldown/no allies hurt)?
      │   → fallback: basic attack (move to melee)
      4. Move: stay at preferredRange from nearest enemy
      5. In melee range? → move AWAY up to fleeRange tiles before acting
```

**Ability selection priority:** creatures list abilities in `abilities:[]` with
`trigger:` hints. The AI iterates the list top-to-bottom, picks the first ability
whose trigger condition is met and that's not on cooldown:

```yaml
# creatures.yaml — goblin shaman
goblin_shaman:
  ai:
    profile: support
    preferredRange: 4
    fleeRange: 2
  abilities:
    - id: heal_ally
      trigger: ally_below_50pct    # fires when any ally < 50% HP
      cooldown: 3
      range: 5
    - id: fire_bolt
      trigger: default             # fallback — always available
      cooldown: 2
      range: 5
```

**Trigger conditions (W1 set):**

| Trigger | Condition |
|---|---|
| `default` | Always true — fallback action |
| `ally_below_50pct` | Any ally in range has HP < 50% |
| `ally_below_25pct` | Any ally in range has HP < 25% |
| `self_below_50pct` | Self HP < 50% |
| `enemy_in_melee` | Target within 1 tile |
| `enemy_in_range` | Target within ability range |
| `no_buff_on_ally` | Any ally in range missing a specific buff |

**Fallback chain:** If no ability trigger matches → basic attack. If can't reach
target → end turn. AI never freezes.

**Post-W1 profiles (deferred):**
- `brute` — charge low-HP targets, reckless attacks, ignore positioning
- `boss` — phase transitions, multi-ability rotation per phase, summons

---

## Town Services (W1 MVP)

Town hub is the persistent safe zone between dungeon runs. Player returns here
on extraction, death, or victory. Services are interactable entities placed in
`town_hub/stage.yaml`.

### Current State

| Service | Entity | Code Status | Notes |
|---|---|---|---|
| Portal (enter dungeon) | `travel` action | ✅ Working | Starts new run via `resolveRunOutcome()` |
| Stash (view) | `stash` action | ❌ Stub | Calls `scene.showTownStashSummary()` (missing) |
| Stash (deposit all) | `stash_deposit_all` | ❌ Stub | Calls `scene.depositAllToStash()` (missing) |
| Stash (withdraw all) | `stash_withdraw_all` | ❌ Stub | Calls `scene.withdrawAllFromStash()` (missing) |
| Shop (buy/sell) | `shop` action | ❌ Stub | Returns "Coming soon" |
| Quest Board | `quests` action | ❌ Stub | Returns "Coming soon" |

### W1 MVP Design — Keep It Simple

**Principle:** HTML panels, no Phaser UI. Same pattern as combat log / side panel.
All data-driven from YAML. Town services are the simplest path to "feels like a game".

### Stash System

Already have the data model (`PLAYER_STATS.stash`). Just need UI.

```
  STASH INTERACTION
  │
  Player taps stash chest → context menu:
  │
  ├── "View Stash" → showTownStashPanel()
  │   ├── HTML overlay panel (like inventory panel)
  │   ├── Left column: CARRIED items (run inventory)
  │   ├── Right column: STASH items (persistent)
  │   ├── Click item → move to other side (carry ↔ stash)
  │   └── Close button / tap outside to dismiss
  │
  ├── "Deposit All" → depositAllToStash()
  │   ├── PLAYER_STATS.stash.push(...PLAYER_STATS.inventory)
  │   ├── PLAYER_STATS.inventory = []
  │   ├── Flash "Items stored!" toast
  │   └── Save to localStorage
  │
  └── "Withdraw All" → withdrawAllFromStash()
      ├── PLAYER_STATS.inventory.push(...PLAYER_STATS.stash)
      ├── PLAYER_STATS.stash = []
      ├── Flash "Items retrieved!" toast
      └── Save to localStorage
```

**YAML (already exists in town_hub/stage.yaml):**
```yaml
interactables:
  - x: 4
    y: 2
    kind: stash
    label: "Storage Chest"
    actions:
      - id: stash
        label: "📦 View Stash"
      - id: stash_deposit_all
        label: "📥 Deposit All"
      - id: stash_withdraw_all
        label: "📤 Withdraw All"
```

### Shop System

Simple buy-only shop for W1. Sell comes later.

```
  SHOP INTERACTION
  │
  Player taps merchant → context menu:
  │
  ├── "Browse Wares" → showShopPanel()
  │   ├── HTML overlay panel
  │   ├── Shop stock: list of items with prices
  │   ├── Player gold shown at top
  │   ├── Click item → buy confirmation → deduct gold, add to inventory
  │   ├── Sold-out items grayed
  │   └── Close button
  │
  └── "Talk" → dialog (existing system)
```

**Shop stock defined in YAML (new file: `shop.yaml` per mod):**
```yaml
# 01_goblin_invasion/shop.yaml
shops:
  town_merchant:
    label: "Harg's Supplies"
    greeting: "Need something for the warren?"
    stock:
      - itemId: potion_heal
        price: 25
        quantity: 5              # per run restock
      - itemId: potion_antidote
        price: 15
        quantity: 3
      - itemId: torch
        price: 5
        quantity: 10
      - itemId: thieves_tools
        price: 30
        quantity: 1
      - itemId: ration
        price: 2
        quantity: 10
    restock: on_extract           # restock when? on_extract | on_rest | never
    sellMultiplier: 0.5           # sell price = buy price × 0.5 (future)
```

**Engine work:**
```yaml
# interactable-entity.ts — add shop handler:
case 'shop':
  scene.showShopPanel(entity.shopId || 'town_merchant');
  break;

# game.ts — new method:
showShopPanel(shopId: string) {
  const shopDef = ModLoader.getShopDef(shopId);
  // Build HTML panel: item list, prices, buy buttons
  // Deduct PLAYER_STATS.gold on buy
  // Add item to PLAYER_STATS.inventory
}
```

**Shop entity in stage.yaml (already exists, just needs `shopId`):**
```yaml
interactables:
  - x: 22
    y: 5
    kind: npc
    label: "Merchant Harg"
    shopId: town_merchant          # NEW: links to shop.yaml def
    actions:
      - id: shop
        label: "🛒 Browse Wares"
      - id: dialog:harg_intro
        label: "💬 Talk"
```

### Rest / Heal

**W1 decision: No separate rest mechanic.** Player heals to full on extract/death/victory
(per `resolution.healToFullInTown`). This is simpler than BG3's long-rest system
and fine for a roguelite loop where runs are short.

**Future (post-W1):** Campfire rest inside dungeon (heal %, restock limited items,
risk ambush). Uses `deco_campfire` interactable with `rest` action.

### Quest Board

**W1: Deferred.** Quest system needs flags, tracking, rewards — too much for MVP.
Keep the entity in town_hub but show "No quests available" until quest system exists.

**Future design sketch (for reference):**
```yaml
# quests.yaml
quests:
  kill_goblins:
    name: "Goblin Menace"
    description: "Clear 10 goblins from the warren."
    giver: quest_board               # or NPC id
    objective:
      type: kill
      creatureId: goblin
      count: 10
    reward:
      gold: 50
      xp: 200
      items: [potion_heal]
    repeatable: false

  find_artifact:
    name: "Lost Heirloom"
    description: "Find the family ring in the warren depths."
    giver: quest_board
    objective:
      type: collect
      itemId: family_ring
      count: 1
    reward:
      gold: 100
      xp: 300
    chain: rescue_survivor           # next quest unlocked on complete
```

### Town Service Summary

| Service | W1 Scope | Engine Work | YAML Work |
|---|---|---|---|
| **Stash** | View/deposit/withdraw | `showTownStashPanel()`, `depositAllToStash()`, `withdrawAllFromStash()` — HTML panels, localStorage save | Already in stage.yaml |
| **Shop** | Buy only (no sell) | `showShopPanel()`, gold deduction, restock logic | New: `shop.yaml` per mod |
| **Rest** | Auto-heal on return | ✅ Already working via `resolution.healToFullInTown` | None |
| **Quests** | Placeholder "Coming soon" | None (keep stub) | None |
| **Portal** | Start run | ✅ Already working | None |

### Sprite / Asset Needs for Town

See `docs/ideas/raw/sprite-requirements-brainstorm.md` for full sprite inventory.

**W1 MVP:** Zero new sprites. Town uses dungeon tileset + emoji.
- Portal: `deco_crystal` ✅
- Stash: `t_chest` ✅
- Merchant: interactable entity with emoji label ✅
- Quest board: interactable entity with emoji label ✅

---

## Mod API Reference (Engine Audit)

### Implementation Status

| Subsystem | Implemented | Key Gap |
|---|---|---|
| Creatures | 80% | `onHit`, `abilities`, `features`, `ai.profile` not wired |
| Status Effects | 95% | `immunities`, `resistances` not wired |
| Abilities | 70% | Hook system works; most effect types are stubs |
| Loot Tables | 95% | `dropChance` not implemented |
| Combat AI | 50% | Hardcoded pathfind→chase→attack. Profiles designed (basic/ranged/support) — dispatch not wired. |
| Events | 90% | Good action coverage |
| Stage Config | 100% | Fully working |
| Items | 95% | `onUse` effects mostly work |
| Rules | 100% | All tunable |
| Damage System | 40% | No damage types, resistance, or eval+call runner |

### Context Variables (for formulas and scripts)

When writing formulas, conditions, or scripts, these variables are available:

```
── Source (the actor performing the action) ──────────────────
source.hp             14          # current hit points
source.maxHp          22          # maximum hit points
source.level          3           # character level
source.ac             16          # armor class
source.str            15          # STR score
source.strMod         2           # STR modifier = floor((str - 10) / 2)
source.dex            10          # DEX score
source.dexMod         0           # DEX modifier
source.con            14          # CON score
source.conMod         2           # CON modifier
source.int            8           # INT score
source.intMod         -1          # INT modifier
source.wis            10          # WIS score
source.wisMod         0           # WIS modifier
source.cha            10          # CHA score
source.chaMod         0           # CHA modifier
source.proficiency    2           # proficiency bonus (2 at L1-4, 3 at L5-8, 4 at L9-10)
source.weaponDice     "1d8+3"    # equipped weapon damage formula
source.atkRange       1           # attack range in tiles
source.speed          5           # movement tiles per turn
source.class          "fighter"   # class id
source.alive          true        # is alive

── Target (the actor receiving the action) ───────────────────
target.hp             7           # current hit points
target.maxHp          7           # maximum hit points
target.ac             12          # armor class
target.str            8           # (same stat fields as source)
target.strMod         -1
target.alive          true
target.type           "goblin"    # creature type id
target.cr             "1/4"       # challenge rating

── Combat Context ────────────────────────────────────────────
combat.round          3           # current round number
combat.turn           "source"    # whose turn (source/target/ally)
distance              2.5         # Euclidean tile distance source↔target
allies_adjacent       1           # allies adjacent to target (for flanking)

── Dice / Roll Context (available in on_hit, on_miss) ───────
roll.d20              17          # natural d20 result
roll.total            19          # d20 + modifiers
roll.isCrit           false       # natural 20
roll.isMiss           false       # total < target.ac
roll.damage           8           # damage dealt (after roll, before reduction)
```

### creatures.yaml — Full Field Reference

```yaml
creatures:
  goblin_shaman:
    # ── Identity ──
    name: "Goblin Shaman"                    # display name
    type: goblin                             # sprite/family type
    icon: "🧙"                               # UI icon
    cr: "1/2"                                # challenge rating (display)
    extends: goblin                          # ⏳ PLANNED — inherit from parent creature

    # ── Core Stats ── (all ✅ REAL)
    hp: 12                                   # hit points
    ac: 12                                   # armor class
    speed: 2                                 # movement tiles per turn
    sight: 5                                 # vision range in tiles
    fov: 120                                 # field of view degrees
    xp: 50                                   # XP reward on kill
    level: 1                                 # level (affects proficiency)

    # ── Ability Scores ── (all ✅ REAL)
    stats: { str: 6, dex: 14, con: 10, int: 14, wis: 12, cha: 12 }

    # ── Skills ── (✅ REAL — used for passive Perception)
    skillProficiencies: [arcana, perception]

    # ── Attack ── (✅ REAL)
    attack:
      weaponId: shortsword                   # references weapons.yaml for damage
      dice: "1d6"                            # OR direct dice if no weaponId
      range: 1                               # tiles (1 = melee, 6 = shortbow)

    # ── Economy ── (✅ REAL)
    gold: "3d6"                              # dice string, rolled on kill
    lootTable: goblin_shaman_drop            # references loot-tables.yaml

    # ── AI ── (W1: basic, ranged, support profiles)
    ai:
      profile: support                       # basic | ranged | support (W1). brute/boss post-W1
      preferredRange: 4                      # ideal distance for ranged/support profiles
      fleeRange: 2                           # flee if enemy closer than this (ranged/support)
      searchTurns: 4                         # ✅ REAL — how long to search after losing sight
      ambush: true                           # ⏳ PLANNED — start hidden, attack with advantage

    # ── On-Hit Effects ── (⏳ PLANNED — not wired in engine)
    onHit:
      save: { ability: con, dc: 12 }        # target rolls CON save vs DC 12
      fail:
        status: poisoned                     # apply this status on failed save
        duration: 3                          # turns

    # ── Creature Abilities ── (⏳ PLANNED — not wired in engine)
    abilities:
      - id: heal_ally                        # ability id
        trigger: "ally_below_50pct"          # when to use
        cooldown: 3                          # turns between uses
        heal: "2d6"                          # healing amount
        range: 5                             # cast range in tiles
      - id: fire_bolt
        trigger: "default"                   # fallback action
        cooldown: 2
        dice: "1d8"                          # damage
        range: 5                             # tiles
        damageType: fire                     # ⏳ PLANNED — damage type

    # ── Features ── (⏳ PLANNED — not wired for creatures)
    features: [second_wind, leadership]

    # ── Status Immunities ── (⏳ PLANNED)
    immunities: [stun, fear, charm]

    # ── Status Effects Applied at Spawn ── (✅ REAL)
    effects:
      - { id: enraged, duration: 999 }

    # ── Boss Phases ── (⏳ PLANNED)
    phases:
      - name: "Phase 1"
        hpThreshold: 60                      # transitions when HP% drops below
        ac: 18                               # override stats for this phase
        attack: { dice: "2d10+5", range: 1 }
        multiAttack: 2                       # attacks per turn
```

### weapons.yaml — Full Field Reference

```yaml
weapons:
  longsword:
    name: Longsword                          # ✅ display name
    category: martial_melee                  # ✅ weapon category
    damageType: slashing                     # ✅ REAL (logged) but no mechanical effect yet
    damageDice: "1d8+3"                      # ✅ damage formula
    range: 1                                 # ✅ tiles (1 = melee)
    properties: [versatile]                  # ✅ stored, used for display

  shortbow:
    name: Shortbow
    category: simple_ranged
    damageType: piercing
    damageDice: "1d6"
    range: 6                                 # 6 tiles (~12m)
    properties: [ammunition, two_handed]
```

### statuses.yaml — Full Field Reference

See "Status Effect Schema" section for full design, stacking model, and BG3 comparison.

```yaml
statuses:
  poisoned:
    id: poisoned                             # ✅ lookup key
    label: "Poisoned"                        # ✅ display name
    icon: "🤢"                               # ✅ UI icon
    duration: 3                              # ✅ turns. -1 = permanent
    onReapply: independent                   # ✅ overwrite | stack | independent
    stackId: poisoned                        # ✅ grouping for mutual exclusion (default = id)
    stackPriority: 0                         # ✅ higher wins when same stackId
    tags: [poison, debuff]                   # ✅ group queries
    boosts: |                                # ✅ JS pipe string via BoostRunner (cached on change)
      disadvantage("ability_checks")
    onTick: |                                # ✅ JS — runs each turn via eval+call
      dealDamage(self, "1d4", "poison")
      floatText("🤢", "green")
    saveToRemove: { stat: con, dc: 12 }      # ✅ roll save each tick to shake off
    wearOff: null                            # ✅ turnStart | turnEnd | townReturn | rest
    skipTurn: false                          # ✅ stun — skip entire turn
    onApply: |                               # ✅ JS — runs once when first applied
      logMessage("Poison courses through your veins!")
    onRemove: |                              # ✅ JS — runs once when removed/expires
      logMessage("The poison fades.")
```

### items.yaml — Full Field Reference

```yaml
items:
  potion_heal:
    name: "Healing Potion"                   # ✅ display name
    icon: "🧪"                               # ✅ UI icon
    type: consumable                         # ✅ consumable | weapon | armor | gem | misc
    description: "Restores 2d4+2 HP."        # ✅ tooltip text
    consumeOnUse: true                       # ✅ default true; false = reusable
    onUse: |                                 # ✅ JS — eval+call, `this` = runner
      regainHitPoints(self, "2d4+2")
      removeStatus(self, "poisoned")
      logMessage("You feel restored!")

  scroll_fireball:
    name: "Scroll of Fireball"               # ✅ display name
    icon: "📜"                               # ✅ UI icon
    type: consumable
    description: "Casts Fireball."
    consumeOnUse: true
    casts: fireball                          # ✅ delegates to ability system

  elixir_strength:
    name: "Elixir of Hill Giant Strength"
    icon: "🧪"
    type: consumable
    description: "+4 STR for 5 turns."
    consumeOnUse: true
    onUse: |                                 # ✅ apply a status with boosts
      applyStatus(self, "giant_strength", 5)
```

### loot-tables.yaml — Full Field Reference

```yaml
starter_common:
  gold: [4, 14]                              # ✅ [min, max] gold range
  rolls: 1                                   # ✅ how many items to pick from pool
  allowDuplicates: true                      # ✅ can same item be picked twice
  dropChance: 0.35                           # ⏳ PLANNED — % chance to drop at all
  pool:
    - id: potion_heal                        # ✅ item id (refs items.yaml)
      name: "Healing Potion"                 # ✅ display name
      weight: 34                             # ✅ relative probability
      icon: "🧪"                             # ✅ UI icon
      type: consumable                       # ✅ item type
      heal: "2d4+2"                          # ✅ shorthand heal (legacy)
      rolls: 1                               # ✅ quantity: number or [min, max]
      value: 10                              # ✅ sell value in gold
```

### rules.yaml — Full Field Reference

```yaml
# All fields ✅ REAL — engine reads and applies these

display:
  tileSize: 32                               # pixel size of each tile

combat:
  roomAlertMaxDistance: 8                     # tiles — enemy group joining range
  largeRoomTileThreshold: 90                 # tiles — detect large combat room
  largeRoomJoinDistance: 6                    # tiles — group merge distance
  fleeMinDistance: 6                          # tiles — distance to successfully flee
  fleeRequiresNoLOS: true                    # must break line of sight to flee
  playerMovePerTurn: 5                       # tiles — movement budget in combat
  dashMoveBonus: 4                           # tiles — extra move from Dash
  enemySightScale: 1.0                       # multiplier on enemy sight range
  enemySpeedScale: 0.75                      # multiplier on enemy speed

fog:
  enabled: true                              # toggle fog of war
  radius: 7                                  # tiles — player vision radius
  unvisitedAlpha: 1.0                        # opacity of never-seen tiles (0-1)
  exploredAlpha: 0.62                        # opacity of visited-but-not-visible tiles
  exploredColor: 2439729                     # hex color of explored fog overlay

light:
  darkSightPenalty: 3                        # sight range reduction in dark
  dimSightPenalty: 1                         # sight range reduction in dim
  hiddenSightPenalty: 2                      # extra penalty when hidden
  torchBrightStrength: 0.85                  # bright light intensity (0-1)
  torchDimStrength: 0.55                     # dim light intensity (0-1)
  torchRadiusScale: 1.2                      # multiplier on torch radius

status:
  exploreTickMs: 1000                        # ms between status ticks in explore mode
  defaultPoisonDamageDice: [1, 4, 0]         # [count, sides, bonus] → "1d4+0"
  sleepWakeDc: 12                            # DC to wake from sleep on damage
```

### stage.yaml — Full Field Reference

```yaml
name: "B1F — The Warren Depths"              # ✅ display name
floor: B1F                                   # ✅ floor identifier
globalLight: dark                            # ✅ bright | dim | dark
nextStage: auto                              # ✅ stage_id | auto | boss | town | null

# ── Fixed Grid ── (use this OR generator, not both)
grid:                                        # ✅ 2D tile map
  - "##########"                             # # = wall, . = floor, D = door
  - "#........#"                             # S = stairs, C = chest
  - "##########"
playerStart: { x: 2, y: 1 }                 # ✅ starting tile

# ── Procedural Generator ── (use this OR grid, not both)
generator:
  type: random                               # ✅ random (cellular automata) | bsp
  cols: 56                                   # ✅ map width in tiles
  rows: 36                                   # ✅ map height in tiles
  depth: 1                                   # ✅ difficulty tier
  fillPct: 48                                # ✅ % of cells initially filled (CA only)
  steps: 5                                   # ✅ CA smoothing iterations
  stairs: true                               # ✅ generate exit stairs

# ── Encounters ── (✅ all fields REAL)
encounters:
  - creature: goblin                         # creature id from creatures.yaml
    count: 5                                 # for generated maps (random placement)
    x: 10                                    # for fixed grid maps (exact tile)
    y: 5
    facing: 180                              # degrees (0=up, 180=down)
    group: "patrol_a"                        # group id (alert together)
    lootTable: goblin_common                 # override creature's default loot table
    gold: 15                                 # override creature's gold
    ai: { searchTurns: 6 }                   # override AI params

# ── Lights ── (✅ REAL)
lights:
  - { x: 5, y: 3, radius: 4, level: bright }

# ── Doors ── (✅ REAL)
doors:
  - { x: 10, y: 5, locked: true, autoOpen: false }

# ── Interactables ── (✅ REAL)
interactables:
  - { x: 15, y: 8, kind: chest, lootTable: starter_common }
  - { x: 20, y: 3, kind: stash }
  - { x: 22, y: 3, kind: shop }

# ── Stage-Local Loot Tables ── (✅ REAL — merged with global)
lootTables:
  floor_special:
    gold: [20, 40]
    rolls: 1
    pool:
      - { id: unique_item, name: "Floor Key", weight: 100 }
```

### events.yaml — Available Actions

```yaml
events:
  - id: ambush_event
    trigger: { playerAt: { x: 10, y: 5 } }  # ✅ position trigger
    conditions:                               # ✅ all condition types
      - { flag: "ambush_done", equals: false }
      - { mode: explore }
      - { hp_above: 5 }
      - { enemyAlive: "guard_1" }
    actions:
      # ── Movement & Combat ──
      - { type: move, x: 12, y: 5 }          # ✅ move player to tile
      - { type: attack, target: "guard_1" }   # ✅ attack enemy
      - { type: enterCombat }                 # ✅ switch to combat mode
      - { type: flee }                        # ✅ attempt flee
      - { type: hide }                        # ✅ enter stealth

      # ── Entity Interaction ──
      - { type: openDoor, x: 10, y: 5 }      # ✅ open door at tile
      - { type: lockDoor, x: 10, y: 5 }      # ✅ lock door
      - { type: interact, x: 15, y: 8 }      # ✅ interact with entity

      # ── Spawning ──
      - { type: spawn, creature: goblin, x: 8, y: 3 }  # ✅ spawn enemy

      # ── Flags ──
      - { type: setFlag, flag: "ambush_done", value: true }     # ✅
      - { type: incrementFlag, flag: "kill_count" }              # ✅
      - { type: toggleFlag, flag: "lever_pulled" }               # ✅

      # ── Dialog & Narrative ──
      - { type: dialog, dialogId: "guard_speech" }  # ✅ start dialog tree
      - { type: say, text: "Halt!" }                # ✅ show NPC text

      # ── Timing ──
      - { type: wait, ms: 500 }              # ✅ delay
      - { type: waitMode, mode: explore }     # ✅ wait until mode changes

      # ── Advanced ──
      - { type: triggerEvent, eventId: "alarm" }  # ✅ chain to another event
      - { type: custom, fn: "myGlobalFn" }        # ✅ call window[fn]()
```

### Engine Gaps (Must Build Before Modders Can Use)

| Priority | Feature | Section | Engine Work Needed |
|---|---|---|---|
| **P0** | `EventRunner` class | Ability Execution Model | eval+call runner with ~20 functor methods |
| **P0** | `BoostRunner` class | Status Effect Schema | eval+call runner with `ac()`, `str()`, `advantage()`, etc. |
| **P0** | `recalcBoosts(actor)` | Status Effect Schema | Iterate statuses + equipment, run `boosts: \|`, cache `actor.derived` |
| **P0** | `useAbility()` pipeline | Battle System Phase 4 | condition → onCast → roll → onHit/onMiss via eval+call |
| **P0** | Status `source` tracking | Status Effect Schema | Every instance stores who applied; for aura cleanup + kill credit |
| **P0** | Status stackId/stackPriority | Status Effect Schema | Resolution logic in applyStatus |
| **P0** | Status onReapply modes | Status Effect Schema | overwrite/stack/independent in applyStatus |
| **P0** | `statsChanged` event + UI | Status Effect Schema | Emit on applyStatus/removeStatus/equip/levelUp |
| **P0** | Remove hardcoded actions | Battle System Phase 3 | Attack/Dash/Hide/Flee via `useAbility()` not `selectAction()` |
| **P0** | Creature `extends:` inheritance | Tier 1-2: Pure YAML Data | Add `_resolveCreature()` to modloader.ts |
| **P0** | AI profiles (basic, ranged, support) | Encounter System | Refactor combat-ai.ts with profile dispatch |
| **P1** | Aura spatial engine | Auras section | Per-tick range check, auto-apply/remove child, `removeStatusBySource()` |
| **P1** | Aura radius rendering | Auras section | Draw translucent circle at `auraRadius` |
| **P0** | Damage types + resistance | Damage Types section | Resistance/vulnerability/immunity in damage pipeline |
| **P0** | Resource system (bonusAction) | Resources section | Auto-check/auto-deduct on ability use (reactions deferred) |
| **P1** | Boss phases | (not yet designed) | Phase transition engine |
| **P1** | `dropChance` on loot tables | loot-tables.yaml ref | Add roll check before loot resolution |
| **P2** | Status immunities | Status Effect Schema | Check before applying (tags-based) |
| **P2** | Range indicator rendering | Engine-vs-Mod Boundary | Show ability range circle on hover/select |

---

## Undiscussed Design Topics (Raw Ideas)

Items identified as needing design discussion before or during implementation.
These are NOT decisions — just open questions to resolve.

### 1. Functor Vocabulary Gaps

The explore ability conversions introduced ~10 new functor names that aren't in
the Functor Vocabulary (W1 — 20 Functions) list:

```
stealthRoll(dc)          # hide check
interactEntity(action)   # call entity.interact()
startDialog(dialogId)    # open dialog tree
revealTrap(target)       # mark trap as detected
triggerTrap(target)      # fire trap effect
disarmTrap(target)       # remove trap
revealMagic(radius)      # detect magic scan
lootFrom(lootTable)      # open loot from table
enterCombat()            # switch to combat mode
skillCheck(stat, dc, proficiency?)  # generic skill roll
```

**Question:** Are these all W1, or should some be deferred? Should `skillCheck`
be a timing slot (`roll:`) rather than a functor?

### 2. Boost Aggregation Rules — ✅ RESOLVED

Boosts are now JS pipe strings via BoostRunner. Aggregation rules:

- **Numeric (`ac(2)`, `str(3)`, `damage(4)`):** Additive. All active sources sum.
  HASTE `ac(2)` + CURSED `ac(-3)` = net -1. Follow 5e.
- **Multipliers (`multiplyMovement(2)`):** Multiplicative chain. `2x` then `0.5x` = 1x.
- **Advantage/disadvantage:** 5e cancellation. Multiple advantages don't stack.
  `advantage + advantage + disadvantage = advantage`.
- **Caps:** None (follow 5e — uncapped).
- **Resistance/vulnerability/immunity:** Declared via `resistance()`, `vulnerability()`,
  `immunity()` on BoostRunner. Non-stacking per 5e.

### 3. `roll:` Timing Slot Flow ✅ DECIDED

`roll:` is an eval+call JS string like every other timing slot. The function
sets `this.hits = true | false` — the engine reads `this.hits` after execution
to branch into `onHit` or `onMiss`.

```yaml
fireball:
  roll: savingThrow("dex", 15)
  onHit: |       # save failed
    dealDamage("8d6", "fire")
  onMiss: |      # save succeeded
    dealDamage("4d6", "fire")

lockpick:
  roll: skillCheck("dex", target.lockDc, "thieves_tools")
  onHit: |       # check passed
    unlockEntity()
  onMiss: |      # check failed
    logMessage("The lock holds firm.")
```

**Engine contract:**

1. `roll:` is eval+call via EventRunner — `this` = same runner as onCast/onHit
2. Roll functors (`attackRoll`, `savingThrow`, `skillCheck`, `contest`) all
   compute the d20 + modifiers internally, compare vs DC/AC, and set
   `this.hits = true/false`
3. After eval, engine reads `this.hits`:
   - `true` → execute `onHit:` via eval+call
   - `false` → execute `onMiss:` via eval+call (if present; otherwise skip)
4. Roll functors also populate `this.rollResult` for hooks that need details:
   `{ d20, total, dc, crit, fumble }`
5. `contest("str", "str")` (Shove) follows the same pattern — higher total
   sets `this.hits = true`

**Crit/fumble:** `attackRoll` sets `this.rollResult.crit = true` on nat 20,
`this.rollResult.fumble = true` on nat 1. `onHit` can check these for bonus
effects. Saving throws do NOT crit/fumble.

### 4. Concentration System ⏳ DEFERRED (Post-W1)

BG3 spells like Haste, Bless, Hold Person are concentration — casting another
concentration spell drops the first.

**Decision:** Defer to post-W1. For W1, concentration spells (Haste, Bless)
are simply duration-gated — they expire after N turns with no save-on-damage
or one-at-a-time constraint. This keeps the status engine simpler.

**When implemented (post-W1):**
- `concentration: true` on the ability YAML
- Engine tracks `actor.concentrating = statusInstanceId`
- Casting new concentration ability → auto-removeStatus(old)
- On damage: CON save DC = max(10, damage/2) or lose concentration
- `onRemove:` hook on the status handles cleanup as usual

### 5. onTick Timing Control ✅ DECIDED

**Decision:** `onTick` always fires at **turn start** — before the actor acts.

This matches BG3 where BURNING, BLEEDING, and HASTE all use `TickType: StartTurn`.
EndTurn ticking is rare and not needed for W1.

**Engine contract:**
- `tickStatuses(actor, 'turn_start')` iterates all status instances on actor
- For each: check `skipTurn`, `saveToRemove`, then fire `onTick` via eval+call
- `wearOff: turnStart | turnEnd` still controls when the status EXPIRES (separate concern)
- No `tickAt` field needed — always start-of-turn

If a future mod genuinely needs end-of-turn ticking, we can add `tickAt: turnEnd`
as an opt-in field then. Not W1.

### 6. Damage Types & Resistance ✅ DECIDED

**Decision:** Simple multiplier model. No stacking. No magical/non-magical distinction.

**Damage types (W1 set):** `slashing`, `piercing`, `bludgeoning`, `fire`, `cold`,
`poison`, `radiant`, `necrotic`, `lightning`, `psychic`

**Declaration — on creatures and statuses:**
```yaml
# creatures.yaml
goblin:
  resistances: []
  vulnerabilities: []
  immunities: []

fire_elemental:
  resistances: []
  vulnerabilities: [cold]
  immunities: [fire, poison]

# statuses.yaml — a buff can grant resistance
protection_from_fire:
  boosts: |
    resistance("fire")
```

**Damage pipeline (in `dealDamage` functor):**
1. Roll damage dice → raw damage number
2. Check `target.derived.immunities` — if type matches → damage = 0, done
3. Check `target.derived.vulnerabilities` — if type matches → damage × 2
4. Check `target.derived.resistances` — if type matches → damage × 0.5 (floor)
5. Apply damage to target HP

**Rules:**
- Binary per type: you're either resistant or not. Multiple sources of `resistance("fire")`
  don't stack — same as 5e
- Vulnerability and resistance on same type cancel each other (5e RAW)
- `resistance()`, `vulnerability()`, `immunity()` are BoostRunner methods that
  add to `actor.derived.resistances/vulnerabilities/immunities` arrays
- No magical vs non-magical distinction for W1
