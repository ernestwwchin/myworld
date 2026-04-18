---
tags: [myworld, decision, world-gen]
created: 2026-04-16
status: active
decider: wonwong
---

# Decision: BSP for procedural map generation

## Choice
Use Binary Space Partitioning (BSP) to generate dungeon floors.

## Why
- Produces clean, non-overlapping rooms with guaranteed connectivity
- Predictable structure — rooms are well-sized, corridors are straight
- Easy to control density via tree depth and min/max room size params
- Seed-reproducible with Mulberry32 PRNG

## Rejected alternatives
- **Drunkard's Walk (Drunk Walk)** — organic caves, but hard to place rooms reliably
- **Cellular Automata** — good for caves, poor for structured dungeon rooms
- **Hand-crafted only** — won't scale to 10 floors per campaign

## Trade-offs accepted
- BSP rooms can feel grid-y / samey without post-processing
- Need additional passes for: water pools, grass, lights, special rooms

## Status
Planned (Phase 2). Not yet implemented — current floors use hand-crafted YAML grids.
