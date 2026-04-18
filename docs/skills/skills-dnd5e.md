# Skills: D&D 5e Rules

D&D 5e mechanics implementation patterns. Load when working on combat, abilities, or game balance.

## Dice Rolling

```javascript
// Damage spec format: "1d8+3", "2d6+1d4+2", or [count, sides, bonus]
const parsed = dnd.normalizeDamageSpec('1d8+3');
// => { dice: [[1, 8]], bonus: 3 }

const result = dnd.rollDamageSpec('1d12+1d4+3', isCrit);
// => { total: 14, diceValues: [8, 3], str: "8+3+3=14" }

// Crit: doubles dice count only (not bonus)
// '1d12+1d4+3' crit => rolls 2d12+2d4+3
```

## Core Mechanics

### Ability Scores & Modifiers
- Modifier = `Math.floor((score - 10) / 2)`
- Stat string shorthand: `"8/14/10/10/8/8"` (STR/DEX/CON/INT/WIS/CHA)

### Armor Class (AC)
- Base AC depends on armor type + DEX modifier
- Shield adds +2
- Formula in `docs/ref/armor.md`

### Attack Rolls
- Roll: `1d20 + ability modifier + proficiency bonus`
- Hit if roll >= target AC
- Natural 20 = critical hit (double dice)
- Natural 1 = automatic miss

### Saving Throws
- Roll: `1d20 + ability modifier (+ proficiency if proficient)`
- Success if roll >= DC

### Skill Checks
- `dnd.skillCheck(skillName, stats, dc)` — returns `{ total, success }`
- Passive perception: `10 + WIS modifier + proficiency`

## Combat Flow

1. **Initiative**: Each combatant rolls `1d20 + DEX modifier`
2. **Turns**: Highest initiative goes first
3. **Actions per turn**: 1 action + 1 bonus action + 1 movement
4. **Action types**: Attack, Cast Spell, Dash, Dodge, Hide, Disengage

## Status Effects

Key conditions: Blinded, Charmed, Frightened, Grappled, Incapacitated,
Invisible, Paralyzed, Poisoned, Prone, Restrained, Stunned, Unconscious

- Details in `docs/ref/statuses.md`
- Applied via `processStatusEffectsForActor(actor, trigger, context)`

## Reference Docs

- `docs/ref/classes.md` — Class features and progression
- `docs/ref/monsters.md` — Creature stats and CR
- `docs/ref/weapons.md` — Weapon damage and properties
- `docs/ref/spells.md` — Spells by level and class
- `docs/ref/feats.md` — Feat prerequisites and benefits
- `docs/ref/races.md` — Racial traits and bonuses
