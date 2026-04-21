---
tags: [myworld, decision, world-gen]
created: 2026-04-16
status: active
decider: wonwong
---

# Decision: BSP + Cellular Automata for procedural map generation

## Choice
Use both Binary Space Partitioning (BSP) and Cellular Automata to generate dungeon floors, selectable per stage via `generator.type` in `stage.yaml`.

## Why
- BSP produces clean, non-overlapping rooms with guaranteed connectivity
- Cellular automata generates organic cave layouts
- Having both lets mods pick the right generator for the theme (`bsp`/`rooms` for dungeons, `cellular_automata`/`cave` for natural areas)
- Both are seed-reproducible with Mulberry32 PRNG via `window.rng.map`
- Hand-crafted YAML grids remain supported alongside generators

## Rejected alternatives
- **Drunkard's Walk (Drunk Walk)** — organic caves, but hard to place rooms reliably
- **Hand-crafted only** — won't scale to many floors per campaign
- **Single algorithm** — one style can't serve both structured dungeons and organic caves

## Trade-offs accepted
- BSP rooms can feel grid-y / samey without post-processing
- Need additional passes for: water pools, grass, lights, special rooms
- Two generators means more code to maintain in `src/mapgen.ts`

## Status
Active. Both generators implemented in `src/mapgen.ts`. Stages use `generator:` block (type, seed, dimensions, params) or `grid:` for hand-crafted layouts.
