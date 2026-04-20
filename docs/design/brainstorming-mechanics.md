---
tags: [gamedev, myworld, design, brainstorming]
created: 2026-04-20
status: research
---

# Architecture Brainstorming: Soul & Item Loops

This document catalogs the four potential directions for the "MyWorld" core loop. Each model addresses the balance between **Permanent Progression** and **Run-Based Challenge.**

---

## 🧬 Model 1: The Soul Alchemist (Distillation)
*Inspired by: Dead Cells / Roguelite Meta-Progression.*

*   **The Hook:** You cannot bring physical metal through the portal. You must "Eat" your items to turn them into Soul Energy.
*   **The Loop:**
    1.  Start "Naked" (Level 1).
    2.  Find physical gear in the dungeon (Temporary).
    3.  **Success:** All physical gear is destroyed and distilled into **Permanent Soul Gems.**
    4.  **Death:** Lose temporary gear; Persistent Gems drop at your Grave.
*   **Pros:** Very clear "Naked Run" identity. High excitement at the end of a run.
*   **Cons:** Hard to balance permanent power; potential for "Power Creep."

---

## 🗡️ Model 2: The Master Craftsman (Persistence)
*Inspired by: Shiren the Wanderer / Synthesis.*

*   **The Hook:** You are building one legendary masterpiece over many lives.
*   **The Loop:**
    1.  You can bring items back to Town (Persistence).
    2.  In the dungeon, you find **Soul Shrines.**
    3.  **Synthesis:** Sacrifice a "Fire Dagger" to graft its soul onto your "Main Sword."
    4.  **Gems:** Soul Gems are "Equippable Runes" you slot into your crafted sword.
*   **Pros:** Deep attachment to gear. High strategy in inventory management.
*   **Cons:** Requires "Glass Cannon" balancing (Level 1 character vs. Level 100 sword).

---

## 🌀 Model 3: The Chaos Vessel (Infinite Synergy)
*Inspired by: The Binding of Isaac / Risk of Rain.*

*   **The Hook:** Your soul is a vacuum. You stack power until you mutate.
*   **The Loop:**
    1.  Start "Naked" and Empty.
    2.  No Slot Limits: Pick up every Soul Gem you find.
    3.  **Synergy:** 10+ gems stack visually and mechanically (Fire + Ice = Steam).
    4.  **Meta:** Winning unlocks new items to appear in the global "Pool."
*   **Pros:** Every run feels unique. Unlimited "Fun" factor. No permanent power to balance.
*   **Cons:** High complexity in VFX and coding synergies.

---

## 💎 Model 4: The Polished Heir (Rarity Hierarchy)
*Inspired by: Diablo 3 / Modern ARPGs.*

*   **The Hook:** Simple math, huge impact.
*   **The Loop:**
    1.  3-Slot Soul Bar (Weapon, Armor, Accessory).
    2.  **Rarity Gates:** 
        - Magic Item unlocks Slot 1 (Stats).
        - Rare Item unlocks Slot 2 (Stats).
        - Unique Item unlocks Slot 3 (Procs).
        - Artifact Item unlocks Slot 4 (Legendary "Orange Text").
*   **Pros:** Very intuitive for new players. Professional "Power Curve" feeling.
*   **Cons:** Can feel "Arcade-y" and less like a traditional Roguelike.

---

## Comparison Table

| Feature | Soul Alchemist | Master Craftsman | Chaos Vessel | Polished Heir |
| :--- | :---: | :---: | :---: | :---: |
| **Start State** | Naked | Gear Kept | Naked | Gear Kept |
| **Power Limit** | 3 Slots | Limited by Sockets | **Infinite** | 4 Slots |
| **Progression** | Persistent Gems | Persistent Gear | **Unlocked Pool** | Persistent Stats |
| **Complexity** | Medium | High | **Extreme** | Low |
| **Core Fun** | Collection | Crafting | **Synergy/Luck** | Pacing/Loot |
