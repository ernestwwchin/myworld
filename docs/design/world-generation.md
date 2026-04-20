---
tags: [gamedev, myworld, design]
created: 2026-04-16
status: active
---

# MyWorld RPG — World Generation

## Map Algorithm

**BSP (Binary Space Partitioning)** room + corridor generation.

| Config | Detail |
|---|---|
| Inputs | width, height, room count/size ranges, corridor style |
| Seed | `seed: ~` for random, `seed: 42` for reproducible |
| Player spawn | Auto-placed in first room |
| Stairs/exit | Auto-placed in last room |
| Auto-features | Lights per room (dim/bright by config), water pools, grass patches |

Stage YAML uses a `generator:` block instead of `grid:` for random floors.

## Stage Descriptor System

- Each stage has a `stage.yaml` in `public/data/stages/<id>/`
- `nextStage: auto` resolves deterministically from run seed + world + depth
- Depth-band descriptors define what generator/stage comes next

| Token | Meaning |
|---|---|
| `auto` | Planner resolves next stage |
| `boss` | World boss floor |
| `town` | Hub (safe zone) |
| _(omitted)_ | Dead end |

## Encounter Placement

- Weighted creature pool per floor
- Density levels: low / medium / high
- Boss room in deepest room

## Run State

```
runId, seed, worldId, depth, acceptedQuests, carried[], runGold
```

## State Flow

```
town_idle → town_prep → run_start → run_active → run_extraction / run_death → town_resolution → town_idle
```
