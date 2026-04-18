---
tags: [gamedev, myworld, design]
created: 2026-04-16
status: active
---

# MyWorld RPG — Technology Stack

## Stack

| Layer | Choice | Notes |
|---|---|---|
| **Runtime** | Phaser 3.60 | Canvas rendering, input, camera, tweens |
| **Language** | Vanilla JavaScript (ES6+) | Zero-build — no bundler, no TypeScript |
| **Architecture** | Prototype-based modules | `Object.assign(GameScene.prototype, module)` |
| **Data** | YAML (js-yaml) | All game content defined in YAML files |
| **Server** | Node.js + Express | Serves static files + YAML API |
| **Rendering** | Pixel art, no antialiasing | `pixelArt: true, antialias: false` |
| **RNG** | Mulberry32 seeded PRNG | 3 independent streams: logic, vfx, map |
| **Testing** | Node unit tests + Playwright e2e | CI runs on every PR |
| **CI/CD** | GitHub Actions | Auto-test + PR preview deployments |
| **IaC** | OpenTofu (Terraform) | AWS infra for nonprod/prod |

## Key Design Decisions

- **No bundler**: Zero build step. Edit and refresh. Simpler for solo dev.
- **YAML data**: All maps, enemies, items, rules are YAML — moddable without touching JS
- **Seeded RNG**: Deterministic runs — same seed = same dungeon every time
- **Prototype modules**: `game.js` + extracted systems mixed into GameScene via `Object.assign`
- **Event hooks**: Modding API exposes hook system for extensibility without forking

## Systems Architecture

```
js/
├── game.js                    # Main GameScene (1700+ lines, core logic)
├── main.js                    # Boot: load mods → init Phaser
├── config.js                  # Tile types, combat/fog/light rules, constants
├── systems/
│   ├── fog-system.js          # Fog of war + visibility
│   ├── sight-system.js        # Sight overlays + detection
│   ├── combat-system.js       # Combat mechanics
│   ├── combat-init-system.js  # Combat initialization + initiative
│   ├── camera-system.js       # Pan, zoom, pinch (touch-ready)
│   ├── explore-tb-system.js   # Turn-based exploration
│   ├── floor-item-handler.js  # Loot drops + pickup
│   ├── inventory-system.js    # Inventory management
│   ├── ability-system.js      # Ability score system
│   └── map-generator.js       # (planned) BSP procedural map
├── ui/
│   ├── core-ui.js             # UI components + events
│   ├── side-panel.js          # Tabbed character panel
│   ├── hotbar.js              # Action hotbar (3×10 grid)
│   └── combat-log.js          # Combat log with filters
└── data/
    ├── 00_core/               # Base game content
    ├── 01_goblin_invasion/    # First campaign world
    └── player.yaml            # Player starting build
```
