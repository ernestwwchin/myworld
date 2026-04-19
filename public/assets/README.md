# Assets Directory Layout

This folder separates runtime game assets from vendor source packs.

## Structure

- `assets/tiles/`
  - Runtime tile art used directly by game rules and fallback textures.
- `assets/characters/`
  - Runtime character art used directly by game systems.
- `assets/vendor/`
  - Third-party source packs (atlas/json/sheets) kept in original structure.
- `assets/*.zip`
  - Vendor archives kept for local backup and S3 sync.

## Current vendor packs

- `assets/vendor/0x72_dungeon/`
  - Main dungeon atlas source used by `data/00_core/sprites.yaml`.

## Notes

- Keep game-facing paths stable through YAML manifests (`sprites.yaml`, `rules.yaml`).
- Prefer adding new external packs under `assets/vendor/<pack-name>/`.
- Track source and license in `assets/CREDITS.md`.
