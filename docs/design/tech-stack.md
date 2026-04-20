---
tags: [gamedev, myworld, design]
created: 2026-04-16
status: active
---

# MyWorld RPG — Technology Stack

## Stack

| Layer | Choice | Notes |
|---|---|---|
| **Runtime** | Phaser 3.90 | Canvas rendering, input, camera, tweens |
| **Language** | TypeScript (strict) | Compiled by Vite |
| **Build** | Vite + Rolldown | `npm run build` → `dist/` |
| **Architecture** | Prototype-based mixins | `Object.assign(GameScene.prototype, mixin)` |
| **Data** | YAML (js-yaml) | All game content defined in YAML files under `public/data/` |
| **Rendering** | Pixel art, no antialiasing | `pixelArt: true, antialias: false` |
| **RNG** | Mulberry32 seeded PRNG | 3 independent streams: logic, vfx, map |
| **Testing** | Vitest unit + Playwright e2e | CI runs on every PR |
| **CI/CD** | GitHub Actions | Auto-test + PR preview deployments |
| **IaC** | OpenTofu (Terraform) | AWS infra for nonprod/prod |

## Key Design Decisions

- **Vite build**: TypeScript → `dist/` via `npm run build`. Dev server with HMR via `npm start`.
- **YAML data**: All maps, enemies, items, rules are YAML — moddable without touching TS
- **Seeded RNG**: Deterministic runs — same seed = same dungeon every time
- **Prototype mixins**: `src/game.ts` + extracted systems mixed into GameScene via `Object.assign`
- **Event hooks**: Modding API exposes hook system for extensibility without forking

## Systems Architecture

```
src/
├── game.ts                    # Main GameScene + mixin assembly
├── main.ts                    # Boot: rng → mods → Phaser
├── config.ts                  # Tile types, combat/fog/light rules, constants, mapState
├── systems/
│   ├── fog-system.ts          # Fog of war + visibility
│   ├── sight-system.ts        # Sight overlays + detection
│   ├── camera-system.ts       # Pan, zoom, pinch (touch-ready)
│   ├── floor-item-handler.ts  # Loot drops + pickup
│   ├── inventory-system.ts    # Inventory management
│   ├── ability-system.ts      # Ability score system
│   └── movement-system.ts     # Movement + stair transitions
├── ui/
│   ├── core-ui.ts             # UI components + events
│   ├── side-panel.ts          # Tabbed character panel
│   ├── hotbar.ts              # Action hotbar (3×10 grid)
│   └── combat-log.ts          # Combat log with filters
public/
└── data/
    ├── 00_core/               # Base game content
    ├── 01_goblin_invasion/    # First campaign world
    └── player.yaml            # Player starting build
```
