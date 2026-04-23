# W1 Mod System — Implementation Plan

All design decisions are finalized in `docs/ideas/raw/mod-system-brainstorm.md` (4000+ lines).
This file is the condensed reference for implementation.

## Design Decisions

### Execution Model
- **eval+call**: YAML strings are JS function bodies, `this` = runner
- **Two runners**: EventRunner (actions: dealDamage, applyStatus) + BoostRunner (stats: ac, str, advantage)
- **Boosts as JS pipe string**: `boosts: | ac(2)` not declarative `{ ac: 2 }`

### Status System
- **Source tracking**: every status instance stores `{ id, def, remaining, stacks, source }`
- **stackId/stackPriority**: BG3-style mutual exclusion
- **Auras are statuses**: `auraRadius` + `auraApply` fields, engine manages spatial lifecycle
- **removeStatusBySource()** for aura cleanup on death

### Combat Flow
- **Unified actorTurn(actor)**: player and enemy share same pipeline
- **Only difference**: step 5 — player waits for input, enemy runs AI
- **useAbility()** unified pipeline: condition → onCast → roll → onHit/onMiss
- **No hardcoded actions**: Attack/Dash/Hide/Flee all go through useAbility()

### Resolved Open Questions
1. **onTick timing** → always turnStart (matches BG3 BURNING/BLEEDING/HASTE)
2. **Damage types** → simple multiplier: resistance=0.5x, vulnerability=2x, immunity=0x. 10 types. No stacking
3. **roll: return value** → sets `this.hits = true/false`, engine reads it. `this.rollResult = { d20, total, dc, crit, fumble }`
4. **Action economy W1** → action + bonus action + movement. Reactions deferred
5. **AI profiles W1** → basic (chase+melee), ranged (keep distance), support (heal/buff). Brute/boss deferred

### Deferred (Post-W1)
- Concentration system
- Reactions / opportunity attacks
- Boss phases
- Spell slots / cooldowns
- Multiclassing
- Terrain effects
- Companion/ally system

## Engine-vs-Mod Boundary

- **Engine** = dumb plumbing (rendering, spatial, lifecycle, turn sequencing)
- **Mods** = game content (abilities, statuses, creatures, items)
- **Rendering rule**: if a field affects what player sees/hears → engine-known YAML data, not buried in JS

## Implementation Order (P0 first)

| # | System | File(s) | Description |
|---|---|---|---|
| 1 | EventRunner class | `src/systems/event-runner.ts` | eval+call runner with ~20 functor methods (dealDamage, applyStatus, removeStatus, logMessage, etc.) |
| 2 | BoostRunner class | `src/systems/status-effect-system.ts` (or new) | eval+call runner with ac(), str(), advantage(), resistance(), vulnerability(), immunity() |
| 3 | recalcBoosts(actor) | `src/systems/status-effect-system.ts` | Iterate statuses + equipment boosts, run each via BoostRunner, cache in `actor.derived` |
| 4 | useAbility() pipeline | `src/systems/ability-system.ts` | condition → onCast → roll → onHit/onMiss via eval+call. roll: sets `this.hits` |
| 5 | Status engine upgrades | `src/systems/status-effect-system.ts` | source tracking, stackId/stackPriority, onReapply modes, statsChanged event |
| 6 | Remove hardcoded actions | `src/modes/mode-combat.ts` | Attack/Dash/Hide/Flee via useAbility() not selectAction() |
| 7 | Damage types + resistance | `src/systems/damage-system.ts` | 10 types, simple multiplier pipeline in dealDamage |
| 8 | Resource system | `src/modes/mode-combat.ts`, `src/config.ts` | Add bonusAction, wire actionCost routing on ability use |
| 9 | AI profile dispatch | `src/modes/combat-ai.ts` | basic/ranged/support behaviors with trigger-based ability selection |
| 10 | Creature extends: | `src/modloader.ts` | `_resolveCreature()` inheritance resolution |

## Testing Convention

- Each system gets unit tests in `tests/unit/sandbox/`
- Follow the `mod-feature-testing` skill (`.github/skills/mod-feature-testing/SKILL.md`)
- Sandbox tests import directly from `src/`, reset singleton state in `beforeEach`
- Run: `npx vitest run tests/unit/sandbox/<test-file>.test.js`

## Key File Map

| Purpose | Path |
|---|---|
| Full brainstorm (source of truth) | `docs/ideas/raw/mod-system-brainstorm.md` |
| Project conventions | `CLAUDE.md` |
| Mod authoring reference | `docs/modding/README.md` |
| Design intent for mod changes | `.github/instructions/bg3-modding.instructions.md` |
| Testing guide | `docs/engineering/testing.md` |
| Test skill | `.github/skills/mod-feature-testing/SKILL.md` |

## Damage Types (W1 Set)

`slashing`, `piercing`, `bludgeoning`, `fire`, `cold`, `poison`, `radiant`, `necrotic`, `lightning`, `psychic`

Pipeline: raw damage → check immunity (0x) → check vulnerability (2x) → check resistance (0.5x floor) → apply.
Binary per type (no stacking). Vulnerability + resistance cancel.

## AI Profile Behaviors

| Profile | Movement | Ability Selection | Fallback |
|---|---|---|---|
| **basic** | BFS toward nearest enemy, full budget | Highest-priority melee ability | basic attack |
| **ranged** | Stay at preferredRange, flee if in melee | Ranged ability from list | basic attack (move to melee) |
| **support** | Stay at preferredRange, flee if in melee | Heal ally <50% HP → buff ally → damage | basic attack |

Trigger conditions: `default`, `ally_below_50pct`, `ally_below_25pct`, `self_below_50pct`, `enemy_in_melee`, `enemy_in_range`, `no_buff_on_ally`.
