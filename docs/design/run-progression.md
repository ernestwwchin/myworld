---
tags: [gamedev, myworld, design, progression]
created: 2026-04-20
status: proposal
---

# Run Progression & Persistence

This document defines the rules for the individual dungeon dive ("The Run") and how progress is saved or lost.

## 1. The Core Loop
The game follows a "Macro-Floor" structure. Each floor is a massive, open-world-style zone (Act-sized).

1.  **Preparation:** In Town, player selects their **3 Soul Cores** (Weapon, Armor, Accessory).
2.  **The Dive:** Player enters the floor at **Character Level 1** with NO equipment.
3.  **The Crawl:** Player kills monsters, gains XP (Lv 1-20), and finds base weapons/armor.
4.  **The Power Spike:** As Character Level increases, Soul Core abilities activate (Lv 1, 10, 20).
5.  **Conclusion:** The floor ends when the player either **Extracts** (Safe return), **Wins** (Beats the Boss), or **Dies**.

---

## 2. Persistence Table (What Stays?)

| Item / Resource | Success (Victory/Extract) | Failure (Death) |
| :--- | :--- | :--- |
| **Gold** | Kept (Permanent) | Partially Lost (Dropped) |
| **Soul Cores** | Kept (Returned to Stash) | **Dropped at Grave** |
| **Equipment** | **Reset** (Converted to Gold) | Lost |
| **Consumables** | **Reset** (Lost) | Lost |
| **Blueprints** | **Permanent Unlock** | Lost if not returned to Town |
| **Character XP** | **Reset to Lv 1** | **Reset to Lv 1** |
| **Town XP/Materials** | Permanent | Permanent |

---

## 3. The "Corpse Run" Mechanic
Death is the only way to lose access to your precious Soul Cores.

*   **The Grave:** When the player dies, a Grave Marker appears on that tile. It holds the player's Soul Cores and a portion of their Gold.
*   **The Mission:** The player respawns at the Ancient Temple Level 1. They must navigate back to the Grave.
*   **The Retrieval:** Touching the Grave recovers the Cores.
*   **The Double-Death:** If the player dies *before* reaching their Grave, the old Grave is destroyed. The Cores are gone forever. (This provides the high-stakes adrenaline of the game).

---

## 4. Extraction Logic
To encourage "Forward-Only" play but allow for survival, players can **Extract** from the floor.

*   **Extraction Points:** Found at the start of the zone (Ancient Temple) or after defeating mini-bosses.
*   **The Choice:** "Do I push deeper for better Blueprints, or extract now to save the Gold and Cores I've found?"

---

## 5. Forward-Only Philosophy
*   **No Backtracking:** Once a player moves to the next Macro-Floor (Act), they cannot return to the previous one in the same run.
*   **Merchant Density:** Neutral merchants are placed frequently in the dungeon so the player never *needs* to return to Town to restock. Town is only for meta-progression between runs.
