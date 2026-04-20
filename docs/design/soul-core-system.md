---
tags: [gamedev, myworld, design, items]
created: 2026-04-20
status: proposal
---

# Soul Core System

The **Soul Core System** replaces traditional enchanting with a streamlined "Loadout" model. It balances the "Naked Run" challenge with meaningful meta-progression.

## 1. The Core Concept
The player is a summoned entity. While physical equipment is temporary, their **Soul Cores** are persistent fragments of power.

*   **Soul Cores** are the "Battery" (the source of power).
*   **Equipment** (Weapons/Armor) are the "Conduits" (the wiring).
*   Every character has exactly **3 Slots**: One **Weapon (Red)**, one **Armor (Blue)**, and one **Accessory (Yellow)**.

---

## 2. The Three Dimensions of a Soul Core
Every core is defined by three distinct properties.

| Dimension | Role | Logic |
| :--- | :--- | :--- |
| **Color** | **Slot Placement** | Red (Weapon), Blue (Armor), Yellow (Accessory). |
| **Tier** | **Ability Count** | Tier 1 (1 power), Tier 2 (2 powers), Tier 3 (3 powers). |
| **Roll** | **Randomized Pool** | The specific magic abilities (e.g. Fire, Lightning, HP Regen). |

---

## 3. Tiered Activation (The Level Gate)
The number of active abilities on a core is limited by the player's current **Character Level** in the run.

| Character Level | Active Abilities | Power State |
| :--- | :--- | :--- |
| **Level 1+** | 1st Ability | Standard power. |
| **Level 10+** | 2nd Ability | Mid-run power spike. |
| **Level 20+** | 3rd Ability | God-tier endgame power. |

---

## 4. Stacking & Synergy
Instead of complex evolutions, Soul Cores and Equipment interact through simple **Stacking**.

*   **Linear Stacking:** If a Gem gives +10% Fire Damage and a Sword gives +10% Fire Damage, the player has **+20% Fire Damage**.
*   **Synergy:** Players are encouraged to find "Pairs" of abilities. 
    *   *Example:* A **Slow Gem** combined with a **Sword of Execution** (deals 2x damage to slowed enemies).

---

## 5. UI & UX
*   **The Soul Bar:** A 3-slot UI element always visible on screen.
*   **Visual Feedback:** 
    *   **Greyed Out:** Core is unequipped or Level Requirement not met.
    *   **Blinking:** Requirement met but no equipment conduit found yet.
    *   **Glowing:** Fully active.

---

## 6. Interaction with Blueprints
*   **Discovery:** Finding a Core Blueprint unlocks its drop pool.
*   **Upgrading:** Spending Gold in town increases the **Maximum Tier** of that Blueprint (allowing Tier 2 and Tier 3 versions to drop).
