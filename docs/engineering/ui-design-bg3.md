---
tags: [myworld, docs]
---

# UI Design: BG3 Comparison & Improvements

Current state analysis vs Baldur's Gate 3 UI patterns, with actionable improvements.

---

## 1. Screen Size & Readability

### Current Problems
- Tile size `S=48px` on a 20×21 grid = 960×1008px native resolution
- Font sizes: 7–14px (many at 9–10px) — hard to read
- Buttons: `min-width:52px`, `padding:5px 10px` — too small for touch/small screens
- HP bar: `130px × 6px` — nearly invisible
- Status bar: `10px` font, `32px` height — easy to miss

### BG3 Reference
- BG3 uses large, legible fonts (14–18px for important info)
- Health bars are thick (12–16px) with clear color gradients
- Buttons have generous padding and hover states
- UI scales with screen resolution

### Recommended Fixes

| Element | Current | Recommended |
|---------|---------|-------------|
| Base font | 10px | 12–13px |
| Button font | 9px | 11–12px |
| Button padding | 5px 10px | 8px 14px |
| Button min-width | 52px | 64px |
| HP bar height | 6px | 10px |
| HP bar width | 130px | 160px |
| Status bar font | 10px | 12px |
| Status bar height | 32px | 38px |
| Action cost label | 7px | 9px |
| Mode badge | 9px | 11px |
| Init bar portraits | 40×40px | 48×48px |
| HUD label font | 10px | 12px |
| HUD value font | 14px | 16px |

---

## 2. Door Interaction Design

### Current Behavior
- **Explore mode**: Walk into door → auto-opens if `DOOR_RULES.autoOpenOnPass`
- **Combat mode**: Click adjacent door → `toggleDoor()` (single click)
- No visual feedback before interaction

### Common Patterns in Tactical RPGs

| Game | Door Mechanic |
|------|--------------|
| **BG3** | Click door to path + open (costs movement). Locked doors show lockpick UI |
| **Divinity OS2** | Click to walk to and open. Right-click for context menu |
| **XCOM** | Doors open automatically when unit moves adjacent. Toggle with click |
| **Fire Emblem** | Move onto door tile to open (costs movement action) |

### Recommendation: **Single-click walk-to-and-open** (BG3 style)

This is the best UX for your game because:
1. **Consistent**: Same click-to-move pattern as regular movement
2. **Intuitive**: Player clicks door → character walks there → door opens
3. **No extra step**: Double-click adds friction and confusion
4. **Combat cost**: In combat, walking to door spends movement points (natural cost)

#### Suggested Flow
```
EXPLORE MODE:
  Click door → pathfind to door → auto-open on arrival → continue walking through
  (Already works with autoOpenOnPass!)

COMBAT MODE:
  Click door (adjacent) → toggle open/close (current behavior is fine)
  Click door (far) → show path cost, move + open on arrival

LOCKED DOORS:
  Click → walk to → show "Locked! (DC 15)" status
  If have lockpick skill → show lockpick option in context menu
```

Your current implementation is actually close to BG3 already. The main improvement is:
- Show a **door cursor/highlight** when hovering over doors
- Add a **lock icon** overlay on locked doors
- In combat, show movement cost to reach the door

---

## 3. BG3 UI Comparison & Improvements

### A. Bottom Action Bar (Hotbar)

**BG3 Pattern:**
```
┌─────────────────────────────────────────────────┐
│  [Portrait] [HP Bar]  │  [1][2][3][4][5]  │ [End] │
│  Name · AC 15         │  ATK DASH HIDE ... │       │
└─────────────────────────────────────────────────┘
```
- Centered at bottom
- Large icons with tooltips
- Clear grouping: character info | actions | turn control
- Keyboard shortcuts shown (1-5)

**Your Current Layout:**
```
┌───────────────────────────────────────────┐
│ [res-bar: left]          [action-bar: right] │
│ 🦶 5 | ⚔ ACT           ATK DASH HIDE END │
└───────────────────────────────────────────┘
[status-bar: center bottom]
```

**Recommended Improvement:**
```
┌──────────────────────────────────────────────────────┐
│ 🦶 5 │ ⚔ ACT │ [ATK] [DASH] [HIDE] [FLEE] │ [↺] [⏳] │
└──────────────────────────────────────────────────────┘
                    [status message]
```
- **Merge res-bar + action-bar** into one centered bar
- Clearly separate **resource info** | **actions** | **turn controls**
- Bigger buttons with keyboard hint numbers
- End Turn button visually distinct (different color/size)

### B. Enemy Info (Tooltip/Popup)

**BG3 Pattern:**
- Hover over enemy → compact tooltip near cursor
- Shows: Name, HP bar, AC, status effects
- Click enemy → detailed inspect panel (side)
- No timed auto-dismiss

**Your Current:**
- Click enemy → popup at enemy position (fixed after our bug fix)
- Auto-dismisses after 4 seconds
- ENGAGE button inside popup

**Recommended:**
- **Remove the 4-second auto-dismiss** — let player close by clicking elsewhere
- Add a small **✕ close button** in popup corner
- Show **HP as a visual bar** in the popup, not just numbers
- In explore mode, show **distance** to enemy
- Make ENGAGE button bigger and more prominent

### C. Initiative Tracker

**BG3 Pattern:**
- Horizontal bar at top of screen
- Large circular portraits
- Active turn highlighted with golden border
- Shows HP bars under each portrait
- Surprised enemies have a special icon

**Your Current:**
- Vertical bar on right side
- 40×40px portraits
- Active turn scaled up

**Recommended:**
- Move to **horizontal top bar** (more screen width available)
- Increase portrait size to **48–52px**
- Add **mini HP bars** under each portrait
- Show **status effect icons** on portraits

### D. Movement & Pathfinding

**BG3 Pattern:**
- Click destination → show path preview with distance
- Blue dots for movement range
- Movement costs shown per tile
- Yellow path line for planned route
- Red tiles for danger zones (opportunity attacks)

**Your Current:**
- Click → path dots shown → character moves
- Blue range circles during combat

**Recommended:**
- Show **path line before committing** (on hover)
- Display **tile count** on cursor ("3 tiles")
- In combat, highlight **danger tiles** where enemies can attack
- Show **remaining movement** floating near cursor

### E. Health & Status Display

**BG3 Pattern:**
- Thick HP bar with segment marks
- Temp HP shown in different color
- Status effect icons below HP bar
- Color transitions: green → yellow → orange → red
- Number overlay on HP bar

**Your Current:**
- Thin HP bar (6px) with basic color change
- Text-only HP display

**Recommended:**
- Thicker HP bar (10-12px)
- Add **HP number overlay** on the bar itself: "8/12"
- Add **status effect icons** row below HP
- Smoother color gradient transitions

### F. Combat Mode Transition

**BG3 Pattern:**
- Camera zooms to action
- Red vignette with dramatic "COMBAT!" text
- Initiative order revealed with flourish
- Smooth transition ~2 seconds

**Your Current (already good!):**
- Camera shake
- Red vignette
- "COMBAT!" banner
- Initiative bar appears

**One improvement:** Slow camera pan to first enemy before initiative reveal.

---

## 4. Priority Implementation Order

### Phase 1: Quick Wins (readability)
1. **Increase all font sizes** by ~2px
2. **Increase button padding** and min-width
3. **Thicken HP bar** to 10px
4. **Remove 4s auto-dismiss** on enemy popup (let player close manually)
5. **Add keyboard shortcut hints** to action buttons

### Phase 2: Layout Improvements
6. **Merge resource bar + action bar** into single centered bar
7. **Move initiative bar** to horizontal top
8. **Add hover path preview** in explore mode
9. **Show movement cost** on cursor during combat

### Phase 3: Polish
10. **Door interaction feedback** (highlight, lock icons)
11. **Status effect icons** on HP bars
12. **Enemy popup redesign** with visual HP bar
13. **Danger zone highlighting** in combat

---

## 5. CSS Quick-Fix Reference

```css
/* Phase 1 readability fixes */
.hl { font-size: 12px; }
.hv { font-size: 16px; }
#hp-wrap { width: 160px; height: 10px; }
.ab { padding: 8px 14px; font-size: 11px; min-width: 64px; }
.ab-cost { font-size: 9px; }
#status-bar { font-size: 12px; height: 38px; }
#mode-badge { font-size: 11px; padding: 4px 14px; }
.ip { width: 48px; height: 48px; font-size: 10px; }
.ip-icon { font-size: 22px; }
#enemy-stat-popup { font-size: 12px; min-width: 200px; }
#esp-name { font-size: 14px; }
```
