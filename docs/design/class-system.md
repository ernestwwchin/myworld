---
tags: [gamedev, myworld, design, classes]
created: 2026-04-20
status: proposal
---

# Class System

In the **Ancient Temple**, players choose a "Vessel" (Class) before being summoned into the dungeon. The Class defines the player's starting stats and mastery bonuses.

## 1. The Multi-Class Hub
Players can change their class freely while in Town by interacting with the **Statues of the Ancients** in the Temple.

*   **Switching:** Free and instant.
*   **The Rule:** Every class uses the same **3-Slot Soul Bar** (Weapon, Armor, Accessory).
*   **Differentiation:** Classes differ by their **Stat Growth** and their **Mastery Multiplier**.

---

## 2. Mastery Multipliers
Each class is "attuned" to specific Soul Core colors. This multiplier is applied to all effects granted by a gem of that color.

| Class | Red (Weapon) | Blue (Armor) | Yellow (Utility) | Primary Stat |
| :--- | :---: | :---: | :---: | :--- |
| **Fighter** | **1.25x** | 1.0x | 1.0x | Strength |
| **Wizard** | 1.0x | 1.0x | **1.25x** | Intelligence |
| **Cleric** | 1.0x | **1.25x** | 1.0x | Wisdom |
| **Rogue** | **1.15x** | 1.0x | **1.15x** | Dexterity |

---

## 3. Core Stats (Level 1)
Your class choice determines your "Early Game" power and your ability to meet **Stat Requirements** on gear.

| Class | STR | DEX | INT | WIS | CON |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Fighter** | 16 | 12 | 8 | 10 | 14 |
| **Wizard** | 8 | 12 | 16 | 14 | 10 |
| **Rogue** | 10 | 16 | 12 | 8 | 10 |
| **Cleric** | 12 | 8 | 10 | 16 | 14 |

---

## 4. Stat Growth (Per Run)
When a player levels up (Lv 1-20) during a Macro-Floor run, their stats increase based on their class.

*   **Automatic Growth:** Stats increase automatically based on class-specific weights.
*   **Fighter Example:** High STR/CON growth.
*   **Wizard Example:** High INT/WIS growth.

---

## 5. Unlocking Advanced Classes
Advanced classes must be discovered as "Tomes" or rescued as NPCs in the dungeon. Once unlocked, they appear in the Temple.

*   **Berserker:** 1.4x Red Mastery, but 0.8x Blue Mastery.
*   **Spellblade:** 1.2x Red Mastery, 1.2x Yellow Mastery.
