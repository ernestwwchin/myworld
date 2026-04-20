---
tags: [gamedev, myworld, design]
created: 2026-04-20
status: proposal
---

# Seed-Driven Storylines & Map Generation

## Concept
Instead of randomly picking disconnected sidequests from a board, the **run's RNG seed acts as an AI Game Master**. At the start of a run (or when a new seed is rolled in the Town Hub), the seed deterministically selects a **Storyline Theme**. 

This Storyline acts as a global modifier for the entire run, influencing town dialogue, dungeon map generation, enemy spawns, and the final boss. Because it is tied to the seed, players can share seeds to experience the exact same narrative and dungeon layout.

## 1. Storyline Definitions (`storylines.yaml`)

Storylines are defined in mod data and provide a cohesive theme to a run.

```yaml
# Example: public/data/01_goblin_invasion/storylines.yaml
storylines:
  - id: the_lost_expedition
    weight: 10
    title: "The Lost Expedition"
    description: "A group of cartographers went missing. Find them before the goblins do."
    mapModifiers:
      generator_type: "bsp" # Prefers room-based generation
      extra_loops: true     # More interconnected corridors
      features: ["campfires", "dead_explorers"]
    encounters:
      boss: "goblin_shaman_corrupted"
      bonus_creature: "scavenger_slime"
    events:
      - floor: 4
        type: "npc_rescue"
        target: "cartographer_npc"

  - id: the_flooded_depths
    weight: 5
    title: "The Flooded Depths"
    description: "The underground rivers have burst. The warren is drowning."
    mapModifiers:
      generator_type: "cellular_automata" # Prefers cave-like generation
      water_density: "high"
      bridges: true
    encounters:
      boss: "water_elemental_brute"
```

## 2. Seed Resolution Flow

1. **New Seed Rolled**: When the player finishes a run or resets the world, a new `runId` and `seed` are generated.
2. **Storyline Selection**: `ModLoader` uses the `seed` to deterministically pick a storyline from the weighted list in `storylines.yaml`.
3. **Town Hub Reactivity**: The town updates based on the active storyline. 
   - The Quest Board displays the current Storyline's objective.
4. **Run Initiation**: The player enters the portal. The `ModLoader` attaches the `storyline.mapModifiers` to the run state.

## 3. Map Generator Integration (`src/mapgen.ts`)

The `MapGen.generate` function will accept the `mapModifiers` from the active storyline.

- **Generator Selection**: Overrides the default generator (e.g., forcing Cave generation for flooded maps).
- **Tile Replacement**: A storyline can swap standard floor tiles for themed tiles (e.g., replacing 20% of `FLOOR` with `WATER` for flooded storylines).
- **Feature Spawning**: Automatically places narrative set-pieces (like dead explorers or abandoned campsites) into generated rooms.

## 4. Quest Density & Pacing (Micro vs Macro Floors)

A critical part of the Seed Generator is knowing *how many* events to spawn. We have two distinct architectural paths for pacing the game:

### Approach A: The 10-Floor Descent (Micro-Floors)
In this approach, maps are relatively small (e.g., 50x50 tiles). The player descends rapidly. To prevent cognitive overload, the 10-floor run is paced as follows:
- **5 Standard Floors** (50%): Basic exploration and farming.
- **2 Minor Events** (20%): E.g., The Black Market, Cursed Shrine.
- **1 Major Event** (10%): E.g., Prison Rescue (Mid-Boss).
- **1 Camp Floor** (10%): Safe rest stop.
- **1 Boss Floor** (10%): The finale.

### Approach B: The 3-Act Structure (Macro-Floors)
Alternatively, instead of many small floors, the generator creates massive maps (e.g., 200x200 tiles). A full run is only **3 Floors**, but each floor takes 30+ minutes to clear and acts as an "Open World Zone".

A single Macro-Floor can host multiple quests simultaneously:
- **The Starting Hub**: The stairs down lead to a safe drop-in point.
- **The Central Expanse**: A massive sprawling area with standard enemy density and random chests.
- **The East Wing (Event 1)**: The generator spawns the *Black Market* blueprint here.
- **The West Wing (Event 2)**: The generator spawns the *Monster Nest* blueprint here.
- **The Northern Gate**: A locked door leading to the floor boss, requiring the player to explore both wings to find the keys.

**Advantage of Macro-Floors**: It feels much more like a traditional, grand RPG adventure (like *Diablo 2* Acts or *Baldur's Gate* zones). The player has agency to choose which direction to explore first, rather than being forced down a linear pipe.

#### Floor Biomes & Map Themes
Because a Macro-Floor acts as an entire "Act", it requires a distinct visual and atmospheric **Theme (Biome)**. When the Seed resolves the storyline, it assigns a specific Biome to each of the 3 Macro-Floors.

For example, a standard 3-Act run might look like:
- **Act 1: The Forgotten Mines**: Rocky terrain, dirt walls, dimly lit by braziers. Populated heavily by standard Goblins and Giant Spiders.
- **Act 2: The Flooded Warrens**: The generator heavily favors water pools and bridges. The lighting is bioluminescent blue/green. The hostile encounters switch to Water Elementals and Corrupted Slimes.
- **Act 3: The Warlord's Keep**: Stone brick walls, blood-stained floors, bright torchlight. The enemies are heavily armored Orcs and the Final Boss.

This guarantees that as the player progresses, the entire aesthetic and enemy pool shifts dramatically, rewarding them for surviving the previous Act.

## 5. Persistent World State (Per-Seed)

A critical aspect of this design is **state persistence**. A seed represents a definitive, persistent world state. The core design philosophy is **forward-only gameplay** — the game always encourages the player to push ahead, never to backtrack for missed items.

### Respawn Rules

| Situation | Monsters Respawn? | Notes |
|---|---|---|
| Player explores and returns to same zone | No | Zone stays cleared. No free farming. |
| Player returns to Town and re-enters | No | Town is safe; dungeon state is preserved. |
| **Player dies** | **Yes — full zone respawn** | See Death Rules below. |
| World Reset (new seed generated) | Yes — full reset | Entire world state wiped and regenerated. |
| Event-spawned enemies (Cursed Shrine, World Event) | During event only | Scripted waves only, not persistent world monsters. |

### Death Rules

Death resets the **current zone** to its original state (all monsters respawn, all chests restock). This is intentional:

- **Why**: It removes the incentive to backtrack and loot the same cleared area repeatedly after dying. The player always faces a fresh zone.
- **What is lost**: Carried items and gold are partially lost (per `goldLossPct` rules). Items not yet picked up are gone.
- **What is kept**: The player's XP, banked stash items, and any **already-completed quests** (e.g., a rescued NPC stays rescued).
- **Respawn point**: The Ancient Temple Rest Point at the start of the zone.

### The Forward-Only Design Philosophy

Every mechanic is designed so the player never *needs* to go back:
- **No item decay**: Loot sits on the ground forever — you won't miss it by exploring forward.
- **Merchants in the field**: Neutral merchants in randomized zones sell consumables so the player never needs to return to Town to restock.
- **Quest objectives are always ahead**: Multi-floor quests always place objectives on *deeper* floors, never behind the player.
- **Resetting the World**: The only reason to "start over" is a deliberate choice to experience a new seed/storyline — not because the player missed something.

## 6. Why This Works Better

- **Cohesion**: The map geometry matches the narrative. A "defensive holdout" storyline generates narrow choke points; a "scavenger hunt" storyline generates sprawling mazes.
- **Shareability**: "Hey, try seed 8912, it's the Flooded Depths storyline and the boss dropped an epic sword."
- **Meaningful Progression**: Permanent enemy deaths prevent trivial grinding. Players must push forward to deeper floors to gain more resources, making attrition a real threat.
- **Scalability**: We can add new storylines via simple YAML mods without writing new hardcoded quests.
