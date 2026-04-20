---
tags: [myworld, docs]
---

# Fog of War Rendering Approach

This project uses a hybrid fog-of-war renderer that balances smooth visuals and runtime performance.

## Goals

- Smooth fog boundaries without visible per-tile square artifacts.
- Preserve gameplay correctness from tile LOS and visited-state logic.
- Keep runtime cost low on large maps.

## Pipeline

1. Compute tile visibility with LOS
- Method: `computeVisibleTiles()` in [src/systems/fog-system.ts](../src/systems/fog-system.ts).
- Uses `hasLOS()` on tile centers inside the fog radius.
- Writes visibility into reusable `this.fogVisible`.

2. Persist exploration state
- Any tile currently visible is marked visited in `this.fogVisited`.

3. Build per-tile light map
- Start with player light (smoothstep falloff) for LOS-visible tiles.
- Add map lights (`mapLights`) to visited tiles only.
- Uses reusable float buffers to avoid per-frame allocations.

4. Convert to per-tile fog alpha
- `tileA[y][x] = exploredAlpha * (1 - light) * visited + unvisitedAlpha * (1 - visited)`
- This keeps unvisited areas fully dark while explored areas fade with light.

5. Smooth render path (primary)
- Write tile alpha values to a low-resolution alpha mask canvas of size `COLS x ROWS`.
- Upscale that mask to world size (`COLS*S x ROWS*S`) with image smoothing enabled.
- Result: smooth boundaries without drawing many sub-rectangles.

6. Fallback render path (tests/non-browser)
- If low-res canvas upscaling is unavailable, draw one fog rect per tile alpha.

7. Torch tint pass
- Draw warm radial gradients for active lights after fog alpha render.
- Active lights are precomputed once per frame and reused for both brightness and tint passes.

## Why this works

- LOS and visited logic remains tile-accurate for gameplay.
- Visual blending is delegated to canvas upscale filtering, which removes obvious tile seams.
- Buffer/canvas reuse minimizes GC churn and frame-time spikes.

## Key Performance Choices

- Reuse `fogVisible`, light rows, tile alpha rows, and low-res `ImageData`.
- Avoid repeated parsing/scanning of map lights by precomputing active light metadata once per frame.
- Keep expensive per-pixel work out of the full-size fog surface.

## File Ownership

- Fog rendering and visibility: [src/systems/fog-system.ts](../src/systems/fog-system.ts)
- Enemy sight logic: [src/systems/sight-system.ts](../src/systems/sight-system.ts)
- Shared light-level query (`tileLightLevel`): [src/systems/light-system.ts](../src/systems/light-system.ts)
