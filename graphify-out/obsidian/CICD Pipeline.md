---
source_file: ""
type: "code"
community: "Community 6"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Community_6
---

# CI/CD Pipeline

## Connections
- [[AWS S3 + CloudFront Deploy]] - `deploys_to` [EXTRACTED]
- [[Contract Tests]] - `runs_on_every_pr` [EXTRACTED]
- [[E2E Tests (Playwright)]] - `runs_on_every_pr` [EXTRACTED]
- [[Gitleaks Secret Scanning]] - `enforces_secret_scanning_via` [EXTRACTED]
- [[OpenTofu (IaC)]] - `manages_infra_via` [EXTRACTED]
- [[PR Preview Deploys]] - `creates` [EXTRACTED]
- [[Unit Tests (Pure)]] - `runs_on_every_pr` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Community_6