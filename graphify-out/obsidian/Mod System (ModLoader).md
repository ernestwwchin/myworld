---
source_file: ""
type: "code"
community: "Community 2"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Community_2
---

# Mod System (ModLoader)

## Connections
- [[00_core (Base Mod)]] - `requires_as_base` [EXTRACTED]
- [[00_core Mod]] - `base_mod_loaded_by` [EXTRACTED]
- [[00_core_test (Test Mod)]] - `loads_test_mod` [EXTRACTED]
- [[01_goblin_invasion (Content Mod)]] - `loads_content_mod` [EXTRACTED]
- [[Combat System]] - `tuning loaded from rules data via` [EXTRACTED]
- [[Global Config (srcconfig.ts)]] - `exports_constants_populated_by` [EXTRACTED]
- [[ModLoader]] - `implements` [EXTRACTED]
- [[Unit Sandbox Tests]] - `mutates singleton state of` [EXTRACTED]
- [[YAML Data System]] - `content_stored_as` [EXTRACTED]
- [[meta.yaml (Mod Metadata)]] - `declares_metadata_for` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Community_2