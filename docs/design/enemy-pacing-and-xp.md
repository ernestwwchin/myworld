---
tags: [gamedev, myworld, design, pacing]
created: 2026-04-20
status: proposal
---

# Enemy Pacing & XP Curve

In the Macro-Floor model, a player must grow from **Level 1** to **Level 20** in a single, large zone. This requires a very specific approach to enemy distribution and XP scaling.

## 1. The Zone Heatmap (Radial Difficulty)
Difficulty is not uniform across the floor. It follows a **Heatmap** logic based on the distance from the Spawn Point (Ancient Temple).

| Distance from Temple | Enemy Level | Power State |
| :--- | :---: | :--- |
| **0 - 20 tiles** (Safe Zone) | 1 - 2 | Trash mobs (Goblins, Slimes). |
| **20 - 50 tiles** (The Frontier) | 3 - 8 | Packs of enemies, Elites. |
| **50 - 100 tiles** (The Deep) | 9 - 15 | Ambush groups, Minibosses. |
| **Zone Boss Arena** | 18 - 20 | The Final Challenge. |

---

## 2. XP Scaling (The "Sprint" Curve)
In a traditional RPG, Level 20 takes weeks. Here, it must take **20-30 minutes**. 

*   **Accelerated Early Game:** Levels 1-5 should be reached in the first 3 minutes of play.
*   **The Plateau:** Levels 10-15 should feel like a steady climb as you clear the middle of the map.
*   **The Peak:** Reaching Level 18-20 should require clearing at least one "Elite Camp" or a "Miniboss" before the final boss.

### Static XP vs. Relative XP
*   **Static:** A Goblin always gives 10 XP. (Bad for our game - player will farm weak mobs to hit Lv 20).
*   **Relative (Best):** A Level 2 Goblin gives 0 XP if the player is Level 10. 
    *   *Rule:* To reach Level 20, the player **must** push deeper into the zone where higher-level enemies live.

---

## 3. Enemy "Packages" (Generation logic)
The `MapGen` will spawn enemies in "Packages" based on the Room's distance from the center.

*   **Package A (Beginner):** 3x Lv 1 Goblins.
*   **Package B (Veteran):** 2x Lv 5 Orcs, 1x Lv 5 Shaman.
*   **Package C (Nightmare):** 1x Lv 12 Ogre, 4x Lv 10 Goblins.

---

## 4. The "Catch-Up" Mechanic
If a player dies and returns on a **Corpse Run**, they are Level 1 again. 
*   **The Problem:** Fighting Level 15 enemies at Level 1 is impossible.
*   **The Solution:** When a player is near their **Grave Marker**, they receive a **"Will of the Ancestors"** buff:
    *   *Effect:* +500% XP from all sources until they reach the Level they were when they died.
    *   *Result:* The player can reach their old power level very quickly just by killing a few mobs on the way to their body.
