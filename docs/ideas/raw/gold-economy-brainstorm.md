# Gold Economy Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decisions

- **Tight in W1-W2** (every gold piece matters)
- **Comfortable in W3** (can afford most things)
- **Flush in W4-W5** (spending on luxury upgrades)
- **Town upgrades are the primary gold sink** (~13,000g total)
- **Waypoint deposits** reduce death penalty (smart play rewarded)
- **CHA discount** -5% to -15% on shop purchases
- **25-33% sell ratio** (standard RPG, prevents loops)

---

## Income Per Run

| World | Enemies | Chests | Contracts | Boss | Gear Sales | Run Total |
|---|---|---|---|---|---|---|
| W1 | ~400g | ~160g | ~200g | ~350g | ~200g | **~1,300g** |
| W2 | ~700g | ~300g | ~400g | ~600g | ~400g | **~2,400g** |
| W3 | ~1,000g | ~500g | ~600g | ~900g | ~600g | **~3,600g** |
| W4 | ~1,400g | ~700g | ~900g | ~1,200g | ~800g | **~5,000g** |
| W5 | ~1,800g | ~900g | ~1,200g | ~1,500g | ~1,000g | **~6,400g** |

### Income Breakdown (W1 Detail)

| Source | Amount | Frequency | Per Run |
|---|---|---|---|
| Enemy drops | 5-15g each | ~40 enemies | ~400g |
| Chest loot | 10-30g each | ~8 chests | ~160g |
| Furniture (barrels, crates) | 2-5g each | ~15 per run | ~50g |
| Sell unwanted gear | 20-80g each | ~5 items | ~200g |
| Contract rewards | 50-200g | 3 contracts | ~200g |
| Boss gold | 200-500g | 1 boss | ~350g |

---

## Expenses (Gold Sinks)

### Consumables (Per-Run)

| Item | Cost | Per Run | Notes |
|---|---|---|---|
| Healing Potion | 25g | 3-5 | Basic consumable |
| Identify Scroll | 30g | 2-3 | ID unknown items |
| Antidote | 20g | 1 | Cure poison |
| Scroll (utility) | 50-200g | 1-2 | Fireball, teleport, etc. |
| Revive Scroll | 500g | Rare | Insurance for boss fights |

**Typical W1 run prep: ~155g**

### One-Time Purchases

| Item | Cost | When |
|---|---|---|
| Recruit Mara (companion) | 500g | W1 |
| Respec (stats+skills) | 200g | Occasional |
| Respec (class change) | 500g | Rare |

### Town Upgrades (Primary Sink)

| Upgrade | Cost | Effect |
|---|---|---|
| Blacksmith Lv 2 | 500g | Better upgrade options |
| Blacksmith Lv 3 | 2,000g | Can add ability slots |
| Alchemist Lv 2 | 500g | Better potions available |
| Alchemist Lv 3 | 2,000g | Custom potion brewing |
| Shop Lv 2 | 1,000g | Rare items in stock |
| Shop Lv 3 | 3,000g | Rotating rare stock |
| Companion Shrine Lv 2 | 1,000g | ★ upgrades unlocked |
| Companion Shrine Lv 3 | 3,000g | Re-summon + trait reroll |
| **Total to max all** | **~13,000g** | |

### Town Upgrade Model: Hybrid (Auto + Gold)

- World clear **auto-unlocks** the facility/NPC (free)
- Upgrading it **costs gold** (player chooses priority)

```
W1 boss killed:
  AUTO: Blacksmith Lv 1 unlocked (free)
  GOLD: Blacksmith Lv 2 → 500g (player choice)
  GOLD: Blacksmith Lv 3 → 2,000g
```

### Late-Game Sinks (Keep Gold Relevant)

| Sink | Cost | When |
|---|---|---|
| Enchanting | 1,000-5,000g | W3+ (post-MVP) |
| Companion ★★★★★ | 2,000g + materials | W3+ (post-MVP) |
| Rare shop items | 2,000-10,000g | W4+ rotating stock |
| Re-summon companions | 200g doubling | Trait fishing (post-MVP) |
| Challenge map entry | 1,000-5,000g | Post-MVP |

### Blacksmith Costs

| Service | Cost | Notes |
|---|---|---|
| Repair equipment | 50-200g | If durability system added (post-MVP) |
| Upgrade ★ refinement | 50-1000g per ★ level | See equipment system for full ★ cost table |
| Add ability slot | 500g | Requires Blacksmith Lv 3 |
| Reforge (reroll ★) | 300g | Risky — could go up or down |

---

## Gold Flow Across Full Game

```
W1 PHASE (~3 runs):
  Income:  ~3,900g
  Spend:   consumables 450g, Mara 500g, blacksmith 300g, identify 180g
  Savings: ~2,400g

W2 PHASE (~3 runs):
  Income:  ~7,200g
  Spend:   consumables 900g, respec 200g, blacksmith 600g, town upgrades 1,500g
  Savings: ~7,600g

W3 PHASE (~2 runs):
  Income:  ~7,200g
  Spend:   consumables 1,000g, blacksmith 1,000g, companion ★ 800g, town upgrades 2,000g
  Savings: ~12,000g

W4 PHASE (~2 runs):
  Income:  ~10,000g
  Spend:   consumables 1,500g, blacksmith 2,000g, companion ★ 1,500g, town upgrades 3,000g
  Savings: ~17,000g

W5 PHASE (~2 runs):
  Income:  ~12,800g
  Spend:   everything remaining
  End:     varies (5,000-20,000g)
```

---

## Death Penalty Economy

30% of carried gold lost on death.

| Scenario | Carried | Lost | Impact |
|---|---|---|---|
| Die in W1, 200g carried | 200g | 60g | Minor |
| Die in W3, 1000g carried | 1,000g | 300g | Noticeable |
| Die in W5, 3000g carried | 3,000g | 900g | Painful |

### Waypoint Deposit Strategy

```
WAYPOINT:
  Carried: 800g
  > Deposit 500g to stash (safe, in town)
  > Keep 300g (at risk)
  
  Die: lose 30% of 300g = 90g (instead of 240g)
```

Smart players deposit frequently. Gold loss is a **tax on greed** (carrying too much).

---

## Vendor Prices

### Buy/Sell Ratio

| Item | Buy | Sell | Ratio |
|---|---|---|---|
| Healing Potion | 25g | 8g | 32% |
| Identify Scroll | 30g | 10g | 33% |
| Common weapon | 100g | 25g | 25% |
| Uncommon weapon | 300g | 75g | 25% |
| Rare weapon | 1,000g | 250g | 25% |

### CHA Discount

| CHA | Buy Discount | Sell Bonus |
|---|---|---|
| 8 (-1) | +10% prices | -5% sell |
| 10 (0) | Normal | Normal |
| 12 (+1) | -5% buy | +5% sell |
| 14 (+2) | -10% buy | +5% sell |
| 16 (+3) | -15% buy | +10% sell |

CHA 16 over a full game saves thousands of gold.

---

## Identification Economy

| Method | Cost | Availability |
|---|---|---|
| Identify Scroll | 30g (consumed) | Buy at shop, find in chests |
| Wizard companion | Free (INT check) | Post-MVP, requires Wizard in party |
| Sell unidentified | 50% base price | Risky — might be valuable |
| Use unidentified | Free | Risky — could be cursed |

Identify Scrolls are a steady gold drain (~60-90g per run). Having a Wizard companion saves gold long-term.

---

## Economy Balance Targets

| Phase | Gold Feel | Player Behavior |
|---|---|---|
| W1 | **Tight** | Every potion purchase matters. Can't buy everything. |
| W2 | **Budgeting** | Can afford consumables + 1 upgrade per run. |
| W3 | **Comfortable** | Can afford most things. Start investing in town. |
| W4 | **Flush** | Town upgrades flowing. Buying rare items. |
| W5 | **Rich** | Spending on luxury (enchanting, rare stock, ★★★★★). |

If gold ever feels meaningless → add a new sink.
If gold ever feels too tight → increase drop rates slightly.

---

## Open Questions

- Exact loot table gold amounts per enemy type?
- Should gold drop scale with player level or stay fixed per enemy?
- Blacksmith upgrade formulas (exact costs)?
- Shop rotating stock — how often does it refresh?
- Is there a gold cap? (Probably not — let players hoard)
- Gambling/risk mechanics at town? (Post-MVP, gold sink for fun)
