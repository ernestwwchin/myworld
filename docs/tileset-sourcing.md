# Tileset and Sprite Sourcing Guide

This guide helps choose additional tilesets and sprite packs for richer map content while keeping licensing and integration safe.

## Selection Priorities

1. License clarity first (CC0 or clear commercial license).
2. Readability on a 48px tile grid.
3. Consistent silhouettes for gameplay-critical tiles.
4. Theme compatibility with dungeon, cave, shrine, and town maps.

## Shortlist

## Free and permissive

### 1) 0x72 (already in project)
- Type: dungeon atlas with characters and props.
- Fit: baseline style and existing frame naming.
- Notes: best immediate path for expansion because the project already uses this atlas.

### 2) Kenney dungeon and roguelike packs
- Type: broad modular environment tiles.
- Typical license: CC0.
- Fit: strong for secondary biome variants and UI-safe readability.
- Verify: exact pack page license before importing.

### 3) OpenGameArt CC0-only packs
- Type: mixed creators, many dungeon and cave tiles.
- Typical license: mixed across site.
- Fit: useful for specific gaps (special props, biome accents).
- Verify: include only assets explicitly marked CC0.

## Paid with clear use rights

### 4) Oryx sprite packs
- Type: cohesive fantasy tiles and entities.
- Fit: high consistency for large-scale content production.
- Verify: redistribution and derivative-use terms for game/mod distribution.

### 5) CraftPix fantasy environment packs
- Type: themed environment and prop sets.
- Fit: rapid biome variety.
- Verify: free vs premium license differences and attribution requirements.

## Integration Plan for This Repo

1. Add raw files under assets/ in a dedicated folder per source.
2. Register atlas entries in data/00_core/sprites.yaml.
3. Add tile key aliases instead of replacing gameplay semantics.
4. Keep a stable semantic mapping for gameplay tiles:
   - floor, wall, door, stairs, water, grass, key deco props
5. Use per-stage sprite variants through stageSprites or tileAnimations for flavor.

## Minimal Manifest Pattern

Use this pattern when introducing a new atlas:

```yaml
spriteManifest:
  atlases:
    - key: biome_crypt
      image: assets/biome_crypt/crypt_tiles.png
      json: assets/biome_crypt/crypt_tiles.json

  tiles:
    t_floor_crypt: { atlas: biome_crypt, frame: floor_a }
    t_wall_crypt:  { atlas: biome_crypt, frame: wall_a }
```

Then bind these keys only where needed in stage-level data so core semantics stay stable.

## License Checklist Before Import

1. Confirm license text on the source page.
2. Confirm redistribution permission for shipped game files.
3. Confirm mod redistribution compatibility if assets appear in mod packs.
4. Add source and license note in assets/CREDITS.md.
5. Keep original source URL and download date for traceability.

## Free Pack Workflow (Download First, Integrate Later)

This is a good workflow for fast experimentation without polluting production assets.

1. Download zip files and keep them in local storage first.
2. Keep raw zips in `assets/_downloads/` (local cache, not for runtime use).
3. When a pack is selected, extract into `assets/_staging/<pack-name>/`.
4. From staging, copy only required files into final runtime folders under `assets/`.
5. Update `data/00_core/sprites.yaml` only after visual and license checks pass.
6. Record accepted packs in `assets/CREDITS.md` with source URL and license note.

Why this helps:
- Keeps runtime assets clean and intentional.
- Makes it easy to compare candidate packs before committing.
- Avoids committing large unused zip archives.

## AWS S3 Backup Reference

Preferred profile for asset backup:
- `REDACTED_AWS_PROFILE`

Accessible buckets at time of writing:
- `ernestwwchin-bucket` (recommended for project asset vault)
- `REDACTED_CLOUDTRAIL_BUCKET` (CloudTrail logs, do not use for asset storage)

Recommended S3 path layout:
- `s3://ernestwwchin-bucket/myworld-asset-vault/itch/<artist>/<pack>/`

Example commands:

```bash
# List buckets
aws s3 ls --profile REDACTED_AWS_PROFILE

# Upload one zip
aws s3 cp "assets/SomePack.zip" \
  "s3://ernestwwchin-bucket/myworld-asset-vault/itch/snowhex/dungeon-gathering/SomePack.zip" \
  --profile REDACTED_AWS_PROFILE

# Sync local zip cache to S3 vault
aws s3 sync "assets/" \
  "s3://ernestwwchin-bucket/myworld-asset-vault/" \
  --exclude "*" --include "*.zip" \
  --profile REDACTED_AWS_PROFILE
```

Notes:
- Keep original zip names and include date/version when possible.
- Do not upload extracted runtime folders unless they are intentionally part of production assets.
- Keep source URL, license terms, and checksum in `assets/CREDITS.md`.

## Recommended Next Step

Create one additional biome variant first (for example crypt), validate readability in one stage, then scale to cave and shrine variants.

## Candidate Triage (User Shortlist)

Status legend:
- Strong fit: high style/format match for current top-down dungeon direction.
- Maybe fit: useful, but needs tighter style/license/integration checks.
- Low fit: likely mismatch for this project's current visual/gameplay camera.

### Strong fit

1. https://pixel-poem.itch.io/dungeon-assetpuck
2. https://snowhex.itch.io/dungeon-gathering
3. https://snowhex.itch.io/dungeon-gathering-zombie-exp
4. https://snowhex.itch.io/dungeon-gathering-fire-zone-expansion
5. https://snowhex.itch.io/dungeon-gathering-knight-character
6. https://szadiart.itch.io/rogue-fantasy-catacombs
7. https://cainos.itch.io/pixel-art-top-down-basic
8. https://sscary.itch.io/the-dungeon
9. https://free-game-assets.itch.io/free-2d-top-down-pixel-dungeon-asset-pack
10. https://free-game-assets.itch.io/free-pixel-art-dungeon-objects-asset-pack

Why: these are dungeon/top-down oriented and likely easiest to map to current semantic tiles (floor/wall/door/stairs).

### Maybe fit

1. https://snowhex.itch.io/dungeon-gathering-ui-hud-expansion
2. https://sscary.itch.io/the-adventurer-female
3. https://sscary.itch.io/the-adventurer-male
4. https://sscary.itch.io/nature-village
5. https://zedpxl.itch.io/pixelart-forest-asset-pack
6. https://erisesra.itch.io/character-templates-pack
7. https://sethbb.itch.io/32rogues
8. https://o-lobster.itch.io/adventure-pack
9. https://deepdivegamestudio.itch.io/monsterassetpack

Why: potentially useful for characters/biomes/UI, but may require style harmonization, recolor passes, or animation/frame remapping.

### Low fit (for current top-down dungeon target)

1. https://maxparata.itch.io/monogon-isometricdungeon

Why: isometric perspective is likely to conflict with current orthographic top-down map readability and collision assumptions.

### Bundle caution

1. https://itch.io/s/61376/epic-rpg-world-bundle-

Use with caution: bundles often mix licenses and pipelines. Vet each included pack independently before importing.

## Recommended acquisition order from this shortlist

1. Snowhex core + zombie/fire expansions (single-style biome growth).
2. Pixel Poem or SzadiArt catacombs as secondary biome style.
3. Cainos basic for utility tiles/props and broad coverage.
4. Character packs only after tile baseline is stable.

## Gate checks before accepting any selected pack

1. License allows shipping in game and redistribution with mods.
2. Tile dimensions can map cleanly to current 48px display scale.
3. Core semantic tiles exist: floor, wall, doorway, stairs, obstacle.
4. Character frame set supports at least idle + move loop expectations.
5. Add source and license text to assets/CREDITS.md.