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
- [js](js): Runtime game logic (scene, UI, helpers, loader).
- [data](data): YAML-driven game content and rules.
- [data/stages](data/stages): Stage-folder content (BG3-style map/stage packaging).
- [tests](tests): Node-based automated validation scripts.

## Stage Folder Pattern

Preferred (BG3-like) stage definition location:

- [data/stages/b1f/stage.yaml](data/stages/b1f/stage.yaml)

Loader behavior:

- If a stage file under data/stages/map-id/stage.yaml exists, it is used.
- Otherwise loader falls back to [data/core/maps.yaml](data/core/maps.yaml).

## Documentation Index

- [Battle System Rules](BATTLE_SYSTEM.md): Combat entry, alert logic, actions, flee rules, and conditions.

## Combat Initiation Reminder

Current intended flow (BG3-style):

1. In explore mode, Engage first moves the player into melee range.
2. A single opener attack is resolved before combat mode begins.
3. If the opener misses, combat does not start.
4. If the opener lands, combat starts and initiative is rolled for everyone.
5. Initiative ordering uses roll plus Dexterity modifier (highest first).
6. Surprise is applied to unaware enemies and causes a first-turn skip; it does not change initiative score.

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

## Backend Debug Tools

The server now includes opt-in debug helpers for local backend diagnostics.

Enable debug endpoints:

```bash
DEBUG_TOOLS=1 npm start
```

Enable request timing logs:

```bash
DEBUG_LOG_REQUESTS=1 npm start
```

Useful endpoints:

- <http://localhost:3000/health>
- <http://localhost:3000/_debug/health> (when `DEBUG_TOOLS=1`)
- <http://localhost:3000/_debug/config> (when `DEBUG_TOOLS=1`)
- <http://localhost:3000/_debug/routes> (when `DEBUG_TOOLS=1`)

Optional protection token for non-local access:

```bash
DEBUG_TOOLS=1 DEBUG_TOKEN=your-secret npm start
```

Then pass header `x-debug-token: your-secret` or query `?token=your-secret`.

## CI/CD

Three GitHub Actions workflows manage the pipeline:

### `ci.yml` — Pull Request Checks

Triggers on PRs to `main`. Required to pass before merge.

- **test** — runs unit tests (`npm test`) and e2e tests (Playwright)
- **check-tofu** — detects changes in `tofu/`
- **plan** — runs `tofu plan` for shared/nonprod/prod (only if tofu files changed), posts plan as PR comment
- **plan-result** — gate job, passes if plan succeeded or was skipped (no tofu changes)
- **pr-deploy** — deploys PR preview to `myworld-pr-{N}.ernestwwchin.com` (after tests pass)

Branch protection requires both `test` and `plan-result` to pass.

### `deploy.yml` — Game Deployment

Triggers on push to `main`. Deploys game files to S3 + invalidates CloudFront.

1. **deploy-nonprod** — automatic
2. **deploy-prod** — requires manual approval

Concurrency group: `deploy-${{ github.ref }}` (cancels in-progress).

### `infra.yml` — Infrastructure Apply

Triggers on push to `main` when `tofu/` files change. Runs `tofu apply`:

1. **apply-shared** — OIDC, ACM cert
2. **apply-nonprod** — S3, CloudFront, IAM (after shared)
3. **apply-prod** — same, requires approval (after nonprod)

Concurrency group: `infra-${{ github.ref }}` (queues, no cancel).

### `pr-cleanup.yml` — PR Preview Cleanup

Triggers on PR close. Deletes `s3://bucket/pr/{N}/` files.

### Environments

| Environment | Domain | Auto-deploy |
|---|---|---|
| nonprod | `myworld-nonprod.ernestwwchin.com` | Yes |
| prod | `myworld.ernestwwchin.com` | Requires approval |
| PR preview | `myworld-pr-{N}.ernestwwchin.com` | Yes (after tests pass) |

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
