---
tags: [myworld, decision, tech]
created: 2026-04-16
status: active
decider: wonwong
---

# Decision: Mulberry32 seeded PRNG with 3 independent streams

## Choice
Use Mulberry32 as the seeded PRNG, with 3 separate instances: logic, vfx, map.

## Why
- Deterministic runs: same seed = identical dungeon, identical encounters, identical loot
- Splitting streams prevents one system (e.g. VFX) from consuming RNG and shifting the map gen
- Mulberry32 is fast, small, and well-distributed — ideal for games
- Run replays become possible (seed sharing)

## Streams
| Stream | Controls |
|---|---|
| `logic` | Combat dice, loot drops, encounter rolls |
| `vfx` | Particle effects, visual flourishes |
| `map` | BSP splits, room placement, feature placement |

## Trade-offs accepted
- Saving/loading mid-run requires capturing RNG state per stream
- Truly random runs need `seed: ~` (random seed from Date.now())

## Status
Active. Implemented in all seeded operations.
