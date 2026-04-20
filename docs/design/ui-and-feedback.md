---
tags: [gamedev, myworld, design, ui]
created: 2026-04-20
status: proposal
---

# UI & Feedback Loop

The goal of the UI is to make the "Naked Run" feel exciting. The player should always feel the "Potential Power" in their Soul Cores even when they haven't unlocked them yet.

## 1. The Soul Bar (HUD)
A permanent 3-slot widget at the bottom of the screen.

*   **Slot 1 (Red):** Weapon Core.
*   **Slot 2 (Blue):** Armor Core.
*   **Slot 3 (Yellow):** Accessory Core.

### Visual States:
1.  **Empty Slot:** A faint grey circle.
2.  **Equipped / Inactive (Level too low):** The gem icon is visible but **greyed out** with a small lock icon. The level requirement (e.g. "Lv 10") is displayed over it.
3.  **Equipped / Active (No Conduit):** The gem icon is in full color but **blinks slowly**. This means you have the level, but you haven't found a weapon/armor with sockets yet.
4.  **Fully Active:** The gem icon **Glows** and pulses with its color (Crimson, Azure, or Gold).

---

## 2. The "Ability Waking Up" Moment
When the player hits Level 10 or 20 mid-run, we need a "High Juice" feedback moment.

*   **Effect:** A burst of light from the character, a sound effect, and the Soul Core icon on the HUD "Ignites."
*   **Banner Text:** *"Fire Core Tier 2 Awakened: Exploding Palm Unlocked!"*
*   **Purpose:** To make the player feel the power spike immediately.

---

## 3. The Item Conduit View
When the player inspects a weapon or armor in the dungeon:

*   **Socket Display:** Instead of "Sockets: 2," it shows **"Conduit Capacity: Tier 2."**
*   **Sync Preview:** A small preview shows exactly which of the player's current Gem abilities will be activated by this item.
    *   *Example:* "Equipping this Steel Sword will activate: [Fire Strike], [Burn]."

---

## 4. The Town Stash & Loadout
In Town, the interface is split into two halves:

*   **Left (The Vault):** All your collected Cores and Blueprints.
*   **Right (The Soul Bar):** The 3 active slots for your next run.
*   **Drag-and-Drop:** Players simply drag a core from the vault into a slot to set their "Starting Kit."

---

## 5. Death Feedback
When the player dies:
*   **Death Screen:** Displays exactly how many Soul Cores were lost and where the Grave is located.
*   **The Minimap:** A permanent "Soul Icon" marks the Grave location so the player knows exactly where to go on their Corpse Run.
