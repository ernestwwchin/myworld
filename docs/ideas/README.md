---
tags: [myworld, ideas]
---

# Ideas

Free-form brainstorm folder. Anything goes — half-formed thoughts, "what if" possibilities, inspirations from other games, mechanics to consider, sprite/sound/music leads, framework alternatives, story scraps.

**Nothing here is a commitment.** Notes may be promoted into [`../design/`](../design/README.md) when they're ready to become real intent, may stay here as reference, or may be deleted as rubbish. No quality bar.

## Open Decisions

Each file below clusters related ideas around one decision that needs to be made. Sample YAML data lives in `samples/`.

| File | Decision | Status |
|---|---|---|
| [power-system.md](power-system.md) | What persistent power system? (Soul Cores vs 3 alternatives) | open |
| [run-and-pacing.md](run-and-pacing.md) | Micro-floors vs macro-floors, XP curve, seed-driven storylines? | open |
| [class-and-progression.md](class-and-progression.md) | Vessel/class system + town-hub meta-progression? | open |
| [world-and-content.md](world-and-content.md) | World lore, quest scenarios, rest points, UI for new systems? | open |
| [tilemap-research.md](tilemap-research.md) | How to create beautiful tilemaps for BSP auto-generated maps? | open |

### Dependencies
- `class-and-progression` depends on `power-system` (mastery multipliers require soul cores)
- `world-and-content` UI section depends on `power-system` (soul bar HUD)
- `run-and-pacing` is mostly independent — can be decided first

## Folder Structure

```
ideas/
├── raw/          ← dump unprocessed ideas here (no quality bar)
├── archive/      ← permanent record of raw ideas after refining (never deleted)
├── samples/      ← YAML data illustrating proposals (NOT loaded by game)
├── *.md          ← refined decision files (one per open question)
└── README.md     ← this file
```

## Workflow

```
raw/  →  refine into decision file  →  move raw to archive/ (status: ingested)
                                    →  decision made  →  ADR in decisions/
```

1. **Dump** any thought into `raw/` — bullet list, chat transcript, screenshot, half-formed idea
2. **Refine** into a decision file at the `ideas/` level when enough material clusters around one question
3. **Archive** the raw file → `archive/` with `status: ingested` (permanent proof, never deleted)
4. **Decide** → create ADR in [`../design/decisions/`](../design/decisions/decisions.md), mark decision file `status: decided`

Use `status: open | decided | rejected | parked` in decision file frontmatter.

## Other topics to capture

- Sprite / sound / music sourcing leads
- Map event / interactive ideas (mimics, treasure goblins, healing fountains, altars, traps, puzzle rooms)
- Story scraps (NPC dialogue, lore fragments, side-quest hooks, world history)
- Framework alternatives or upgrades (Phaser improvements, 2.5D/3D paths, UI overhauls)
- Random mechanic experiments
