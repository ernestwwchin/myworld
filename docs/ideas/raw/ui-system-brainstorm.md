# UI System Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decisions

- **Mobile-first 375px portrait** (minimum target: iPhone SE / small Android)
- **Navigation bar, not hotbar** — all abilities accessible via category menus
- **DOM UI, not Phaser** — HTML/CSS overlays on top of Phaser canvas
- **No drag-and-drop** — tap-to-select workflow for mobile
- **BG3-inspired layout** — bottom bar with expandable menus

---

## Navigation Bar

Bottom of screen, always visible in combat:

```
┌─────────────────────────────────────────────────┐
│ [Attack▼]  [Abilities]  [Spells]  [Items]  [End]│
└─────────────────────────────────────────────────┘
```

### Button Behavior

| Button | Tap | Long Press / Submenu |
|---|---|---|
| **Attack▼** | Use last attack (default: Strike) | Open weapon ability menu |
| **Abilities** | Open class abilities menu | — |
| **Spells** | Open spell list (by level) | — |
| **Items** | Open quick-use items | — |
| **End Turn** | End current turn | Confirm dialog if actions remain |

### Attack Dropdown

```
┌──────────────────────┐
│ ⚔️ Strike (cantrip)  │
│ 🗡️ Pommel Strike (1) │ ← (1) = charges remaining
│ 🗡️ Cleave (1)        │
│ 🏹 Quick Shot         │ ← if ranged weapon equipped
└──────────────────────┘
```

### Abilities Panel

```
┌──────────────────────────────┐
│ Per-Encounter:               │
│  ⚡ Second Wind (1/1)        │
│  ⚡ Action Surge (1/1)       │
│  ⚡ Trip Attack (2/2)        │
│  ⚡ Precision Attack (2/2)   │
│                              │
│ Reactions (toggleable):      │
│  🛡️ Opportunity Attack [ON]  │
│  🛡️ Parry [ON]               │
│  🛡️ Riposte [ON]             │
│                              │
│ Passives (info only):        │
│  📖 Extra Attack             │
│  📖 Improved Critical        │
└──────────────────────────────┘
```

### Spell Panel

```
┌──────────────────────────────┐
│ Cantrips:                    │
│  🔥 Fire Bolt                │
│  ❄️ Ray of Frost             │
│                              │
│ Level 1 (3/4 slots):        │
│  ✨ Magic Missile             │
│  🛡️ Shield (reaction)        │
│  💤 Sleep                     │
│                              │
│ Level 2 (2/3 slots):        │
│  🔥 Fireball                 │
│  💨 Misty Step (bonus)       │
│                              │
│ Level 3 (1/2 slots):        │
│  ⚡ Lightning Bolt            │
│  ⏱️ Haste (concentration)    │
└──────────────────────────────┘
```

### Items Quick-Use

```
┌──────────────────────────────┐
│ 🧪 Healing Potion ×3         │
│ 🧪 Antidote ×1               │
│ 📜 Scroll of Fireball ×1     │
│ 💣 Alchemist's Fire ×2       │
│                              │
│ [Open Full Inventory]        │
└──────────────────────────────┘
```

---

## Screen Layout

### Combat Mode (375px Portrait)

```
┌─────────────────────────┐
│ [HP Bar] [Status Icons] │  ← 40px top bar
│                         │
│                         │
│      Game Canvas        │  ← Phaser map, centered on action
│      (tile grid)        │
│                         │
│                         │
├─────────────────────────┤
│ Combat Log (2 lines)    │  ← 48px scrollable log
├─────────────────────────┤
│ [Atk▼][Abil][Spell][Itm]│ ← 56px nav bar
│              [End Turn]  │
└─────────────────────────┘
```

### Explore Mode (375px Portrait)

```
┌─────────────────────────┐
│ [HP Bar] [Floor] [Gold] │  ← 40px top bar
│                         │
│                         │
│      Game Canvas        │  ← Phaser map, d-pad or tap-to-move
│      (tile grid)        │
│                         │
│                         │
├─────────────────────────┤
│ [Inventory] [Map] [Menu]│ ← 48px explore bar
└─────────────────────────┘
```

---

## Camera Controls

### Zoom

- Default: tiles fill 80% of visible area
- Pinch to zoom (mobile) / scroll wheel (desktop)
- 3 zoom levels: close (1 tile = 64px), medium (1 tile = 48px), far (1 tile = 32px)

### Pan

- Touch: drag to pan when not targeting
- Desktop: WASD or arrow keys
- Auto-center on player after movement
- Combat: camera follows active combatant

### Targeting

- Tap enemy/tile to select target (highlight range indicators)
- Tap ability first, then tap valid target
- Cancel: tap empty space or press Escape
- Show range overlay when selecting abilities (colored tiles)

---

## Mobile Interaction Pattern

### Tap Workflow

```
1. Tap "Abilities" → panel opens
2. Tap "Trip Attack" → panel closes, range overlay shows
3. Tap enemy in range → ability executes
4. Result shows in combat log
```

### Explore Movement

- Tap adjacent tile → move there
- Tap distant tile → pathfind (if visible)
- Tap enemy → start combat approach
- Tap chest/door → interact if adjacent, else pathfind to it

### Long Press

- Long press enemy → show stats tooltip
- Long press ability → show description
- Long press item → show details

---

## Status Display

### Player Status Bar

```
┌─────────────────────────────────┐
│ ❤️ 45/60  🛡️ AC 16  ⚡ 3 slots  │
│ [🔥] [💪] [👁️]                   │ ← active status icons
└─────────────────────────────────┘
```

Icons show active buffs/debuffs. Tap icon for tooltip.

### Enemy Healthbar

Floating above enemy sprite:
- Red HP bar (proportional)
- Status icons below bar
- Name on hover/tap

---

## Side Panel (Desktop)

On wider screens (>768px), show persistent side panel:

```
┌─────────────────────────────────────────────────┐
│                         │ Character Sheet       │
│                         │ ─────────────────     │
│    Game Canvas          │ HP: 45/60             │
│                         │ AC: 16                │
│                         │ STR: 14 (+2)          │
│                         │ DEX: 12 (+1)          │
│                         │ ─────────────────     │
│                         │ Equipment:            │
│                         │  ⚔️ Longsword +1      │
│                         │  🛡️ Chain Mail         │
│                         │ ─────────────────     │
│                         │ Status: Blessed (3t)  │
├─────────────────────────┼───────────────────────┤
│ Combat Log              │ Turn Order            │
│ ...                     │ → Player (you)        │
│                         │   Goblin A            │
│ [Atk▼][Abil][Spell][Itm]│   Goblin B            │
└─────────────────────────┴───────────────────────┘
```

---

## Open Questions (Resolved)

- ~~Hotbar (6 slots) or menu-based?~~ → **Navigation bar** with expandable menus
- ~~Drag and drop for mobile?~~ → **No** — tap workflow only
- ~~Fixed or scrollable ability list?~~ → **Scrollable panels** per category
