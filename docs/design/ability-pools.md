---
tags: [gamedev, myworld, design, magic]
created: 2026-04-20
status: proposal
---

# Soul Core Ability Pools

This document defines the potential abilities that can be "rolled" onto Crimson, Azure, and Golden cores. Every core rolls 1, 2, or 3 abilities depending on its Tier.

## 1. Crimson Cores (🔴 Weapon Slot)
Focus: Damage, Combat Triggers, and Offensive Spells.

| Ability Name | Tier | Effect Description |
| :--- | :---: | :--- |
| **Cinder Strike** | 1 | +1d6 Fire damage to all attacks. |
| **Vampiric Edge** | 1 | Heal 2 HP on every successful hit. |
| **Whirlwind** | 2 | **Active:** Attack all adjacent enemies for 80% damage. |
| **Chain Lightning** | 2 | 20% chance on hit to strike 3 nearby enemies for 1d8 dmg. |
| **Dragon’s Breath** | 3 | **Active:** 3x3 cone of fire dealing 6d6 damage. |
| **Executioner** | 3 | Enemies below 20% HP are instantly killed on hit. |

---

## 2. Azure Cores (🔵 Armor Slot)
Focus: Defense, Survival, and Retaliation.

| Ability Name | Tier | Effect Description |
| :--- | :---: | :--- |
| **Stone Skin** | 1 | +2 Armor Class (AC). |
| **Regeneration** | 1 | Restore 1 HP every 3 turns. |
| **Thorn Aura** | 2 | Reflect 3 damage to any enemy that hits you in melee. |
| **Iron Will** | 2 | Immune to Stun and Paralysis effects. |
| **Phoenix Rebirth** | 3 | If HP hits 0, restore 50% HP. (Cooldown: Once per floor). |
| **Guardian Shell** | 3 | All damage taken is reduced by 25%. |

---

## 3. Golden Cores (🟡 Utility Slot)
Focus: Movement, Resources, and Vision.

| Ability Name | Tier | Effect Description |
| :--- | :---: | :--- |
| **Swift Foot** | 1 | +1 Tile movement per turn. |
| **Eagle Eye** | 1 | +3 Vision radius; see through walls up to 2 tiles. |
| **Misty Step** | 2 | **Active:** Teleport up to 5 tiles (6 turn cooldown). |
| **Midas Touch** | 2 | Monsters drop 50% more gold. |
| **Chronos** | 3 | **Active:** Gain 2 extra turns immediately (10 turn cooldown). |
| **Artifact Hunter** | 3 | +15% chance for enemies to drop high-socket gear. |

---

## 4. Randomization Rules
When a Core is generated (by a drop or crafting):
1.  **Select Tier:** Determined by the Blueprint Level (Tier 1, 2, or 3).
2.  **Roll Ability 1:** Pick a random Tier 1 ability from the color's pool.
3.  **Roll Ability 2 (If Tier 2+):** Pick a random Tier 2 ability.
4.  **Roll Ability 3 (If Tier 3):** Pick a random Tier 3 ability.

### Duplicate Rule
A core cannot roll the same ability twice (e.g. no double Stone Skin).

### Synergy Bonuses
If a player equips two cores of the same "Element" (e.g. Fire Strike + Fire Resist), they gain a **Hidden Synergy**:
*   *Fire Synergy:* All Fire effects deal +10% Burn damage.
*   *Lightning Synergy:* +1 Movement speed.
