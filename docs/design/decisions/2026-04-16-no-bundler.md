---
tags: [myworld, decision, tech]
created: 2026-04-16
status: active
decider: wonwong
---

# Decision: No bundler (vanilla JS, zero build step)

## Choice
Use vanilla ES6+ JavaScript with no bundler (no Webpack, Vite, Rollup, TypeScript).

## Why
- Solo dev project — build tooling adds friction with no team benefit
- Edit a file → refresh browser → see result. No compile step.
- Simpler onboarding if others ever contribute
- Phaser 3 works fine as a CDN/script import

## Rejected alternatives
- **Vite** — fast but adds complexity (config, node_modules, build output)
- **TypeScript** — useful for teams; overhead not worth it for solo prototype

## Trade-offs accepted
- No tree-shaking / bundle optimization
- No type safety
- Module imports via `Object.assign` instead of ES modules (avoids CORS on local file:// loading)

## Status
Still holds. Revisit if project grows to team size or performance becomes a concern.
