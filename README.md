# MyWorld RPG

Browser-based tactical RPG prototype built with Phaser and served by Node + Express.

## Quick Start

1. Install dependencies:

```bash
npm install
```

1. Run the game:

```bash
npm start
```

1. Open:

- <http://localhost:3000>
- <http://localhost:3000/test>

## Project Structure

- [index.html](index.html): Main game page and UI shell.
- [test.html](test.html): Browser-based test runner page.
- [server.js](server.js): Express server entrypoint.
- [js/](js/): Runtime game logic (scene, UI, helpers, loader).
- [data/](data/): YAML-driven mods. Folders are loaded in numeric-prefix order (`00_core` → `01_goblin_invasion` → …).
- [tests/](tests/): Contracts, unit (pure + sandbox), and Playwright e2e suites.

## Documentation

Start at [docs/README.md](docs/README.md) — an audience-keyed index.

| You are… | Start here |
|---|---|
| **Playing** | [docs/play/](docs/play/README.md) — controls, UI, combat rules |
| **Designing features** | [docs/design/](docs/design/README.md) — concept, gameplay, world-gen, ADRs |
| **Building a mod** | [docs/modding/](docs/modding/README.md) — schema, hooks, examples |
| **Looking up D&D 5e rules** | [docs/ref/5e/](docs/ref/5e/README.md) |
| **AI / contributors** | [docs/engineering/](docs/engineering/README.md) — architecture, conventions, testing |

Trackers: [docs/BUGS.md](docs/BUGS.md) · [docs/ROADMAP.md](docs/ROADMAP.md)

## Testing

Run unit tests:

```bash
npm test
```

Run e2e tests (Playwright):

```bash
npm run test:e2e
```

- `@playwright/test` in `package.json` installs the Playwright library.
- Browser binaries are separate and may need a one-time install per environment (Windows, WSL, CI image).
- This repo currently runs `playwright install` via `postinstall` for convenience.
- Manual fallback: `npm run e2e:install:browsers`
- Both unit and e2e tests run on every PR via CI and must pass before merge.

## CI/CD

Three workflows (+ one reusable):

### `pull-request.yml` — Pull Request

Triggers on PRs to `main`. Jobs: **test**, **check-tofu**, **plan** (posts plan comment), **plan-result** (gate), **preview** (deploys to `myworld-pr-{N}.ernestwwchin.com`), **cleanup** (on PR close). Branch protection requires `test` + `plan-result`.

### `deploy.yml` — Deploy

Push to `main` → **nonprod** (S3 sync + CF invalidation). Release published → **prod**.

### `infra.yml` — Infra

Manual dispatch. Select stack: `shared`, `nonprod`, `prod`, or `all`. Uses `_tofu-apply.yml` reusable workflow. Sequential: shared → nonprod → prod.

### Environments

| Environment | Domain | Trigger |
|---|---|---|
| nonprod | `myworld-nonprod.ernestwwchin.com` | Push to `main` |
| prod | `myworld.ernestwwchin.com` | Release published |
| PR preview | `myworld-pr-{N}.ernestwwchin.com` | PR (after tests pass) |

### Secret Scanning

[gitleaks](https://github.com/gitleaks/gitleaks) runs as a pre-commit hook on every commit. Config: [.gitleaks.toml](.gitleaks.toml).

### First-time setup

See [tofu/BOOTSTRAP.md](tofu/BOOTSTRAP.md) for initial setup instructions.

### Manual deploy (fallback)

```bash
export AWS_PROFILE="<your-aws-profile>"
export TF_VAR_account_id="<your-account-id>"

# Deploy game files to nonprod
aws s3 sync . s3://myworld-nonprod-game-${TF_VAR_account_id}/ \
  --exclude "*" \
  --include "index.html" --include "js/*" --include "assets/*" --include "data/*" \
  --delete

# Run tofu for a specific environment
cd tofu/nonprod
export TF_VAR_domain="myworld-nonprod.ernestwwchin.com"
export TF_VAR_cache_ttl=0
tofu init && tofu apply
```

## License

All rights reserved. This source code is provided for viewing purposes only. You may not use, copy, modify, or distribute any part of this project without explicit written permission from the author.

## Notes

Current server configuration in [server.js](server.js) serves [index.html](index.html) from the repository root at route `/`, so the current file placement is correct.
