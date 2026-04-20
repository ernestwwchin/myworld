---
tags: [gamedev, myworld, design]
created: 2026-04-20
status: proposal
---

# Map Generation Blueprints & Quest Scenarios

To make the seed-driven storylines engaging, we need distinct "Map Blueprints." These blueprints are specific scenarios that dictate the layout of the map, the AI behavior, and the objectives available.

Here is the design for the core quest pool scenarios.

## 0. The Standard Floor (Unaligned)
**Concept**: A baseline dungeon floor with no special events or quest alignments. 
- **Purpose**: To provide pacing. If every floor is a massive, unique event, the player will get exhausted. Standard floors let the player farm resources, test new gear, and manage their attrition.
- **Layout**: Uses the default BSP or Cellular Automata generator with standard lighting.
- **Mechanics**: Randomly placed chests, standard enemy density, and a clear path to the stairs.

## 0.5. The Camp / Rest Stop
**Concept**: A rare, peaceful floor with no Hostile enemies.
- **Layout**: A small, focused map built around a central "Campfire" interactable.
- **Mechanics**: 
  - Using the campfire allows the player to perform a "Short Rest" (healing HP/spell slots).
  - May spawn a single wandering Neutral merchant (e.g., a "Traveling Goblin Peddler") who sells basic consumables.
  - Acts as a breather before a guaranteed Boss floor.

## 1. The Prison Rescue
**Concept**: A heavily fortified map section holding a captive NPC. 
- **Layout**: Generates a long, central corridor with small, identical 3x3 rooms on either side (cell blocks). One cell contains the NPC.
- **Mechanics**: 
  - The cell door is `locked: true`. 
  - The player must either find the "Jailer" (a specific mini-boss on this floor) to get the key, or use a consumable `thieves_tools` item to bypass the lock.
- **AI Behavior**: Enemies here are assigned a "Patrol" AI state rather than standing still, walking back and forth along the cell block corridors.
- **Reward**: Saving the NPC grants immediate high-tier loot or unlocks a permanent merchant in the Town Hub.

## 2. The Underground Black Market
**Concept**: A neutral zone that can quickly turn hostile.
- **Layout**: A large, open cavern (`cellular_automata` generator) with market stalls, torches, and multiple neutral NPCs selling rare gear.
- **Mechanics**:
  - The player can interact to buy items, or attempt to "Steal". 
  - Stealing triggers a stealth/thievery check (based on player stats/class).
- **Consequence**: If detected, the Black Market goes into lockdown. The merchants teleport away, and **Elite Guards spawn at all map exits and begin closing in on the player**. The map transitions from a safe zone into a desperate escape sequence.

## 3. The Monster Nest (High Threat)
**Concept**: A massive room packed with enemies. If one detects the player, the hive mind activates.
- **Layout**: The map generator ensures there is one massive room (at least 3x the normal max room size) filled with egg clusters, debris, and 15+ monsters.
- **Making it Dangerous**: 
  - **The Hive Mind**: If combat starts and a monster takes a turn, it yells. *Every monster on the entire floor* immediately aggros and begins pathing toward the player.
  - **Terrain Disadvantage**: The nest room is filled with "Sticky Webs" or "Deep Mud" tiles. Players move at half speed, but the native monsters ignore the penalty.
  - **Tactical Approach**: The player cannot win a fight in the center of the room. They must rely on stealth to bypass it, or purposefully trigger them from a narrow 1-tile wide corridor to create a choke point.

## 4. The Multi-Floor Escort / Rescue
**Concept**: A storyline quest that spans multiple map transitions.
- **Mechanics**: 
  - On Floor 1, the player meets a wounded NPC who asks them to find their partner.
  - The run state tracks `quest_target_floor: 3`. 
  - When the player reaches Floor 3, the map generator is forced to spawn the specific scenario (e.g., The Prison layout or a boss encounter).
- **Value**: This gives the player a short-term goal ("I just need to survive until Floor 3") which breaks up the monotony of "just go deeper."

## 5. The Apex Predator (Stealth/Avoidance)
**Concept**: A monster so powerful the player is not meant to fight it.
- **Layout**: Generates a map with many interconnected loops (`extra_loops: true`). Dead ends are minimized so the player always has an escape route.
- **Mechanics**:
  - An "Apex" monster (e.g., an unkillable Behemoth or a blind, high-damage horror) wanders the floor. 
  - It has a massive sight radius but might be deaf (or vice versa). 
  - If it spots the player, it can break through `WALL` tiles to chase them.
- **Objective**: The player must use stealth, hide in side rooms, and navigate the looping corridors to reach the stairs without engaging it in combat.

## 6. Diablo-Inspired Scenarios

Drawing inspiration from the *Diablo* franchise, these scenarios introduce unique environmental hazards and iconic event structures to the map generation.

### 6A. "Fresh Meat" (The Butcher's Chamber)
*Inspiration: The Butcher (Diablo 1)*
- **Concept**: A small, terrifying boss room seamlessly integrated into an early floor.
- **Layout**: A distinct 4x4 room paved with a unique `blood_floor` tile. The door is visually distinct (e.g., iron bars).
- **Mechanics**: The boss inside is significantly faster and stronger than anything else on the floor. It has a "Charge" ability. 
- **Map Threat**: The player isn't forced to open the door, but the boss drops an early-game legendary item if defeated. It creates a high-risk, high-reward decision based entirely on room generation.

### 6B. The Cursed Shrine (Wave Survival)
*Inspiration: Cursed Chests/Shrines (Diablo 3 & 4)*
- **Concept**: An interactive object that turns a standard room into an arena.
- **Layout**: The generator places a specific `cursed_shrine` entity in the center of a large room.
- **Mechanics**: 
  - Interacting with the shrine immediately changes all connected `DOOR` tiles to `locked: true`.
  - For the next 10 turns (or until 3 waves are defeated), enemies spawn at the edges of the room.
  - Once the event ends, the doors unlock and a shower of loot spawns.

### 6C. The Poisoned Supply
*Inspiration: Poisoned Water Supply (Diablo 1)*
- **Concept**: The environment itself is hostile until an objective is completed.
- **Layout**: Generates a map heavily populated with `water` tiles. 
- **Mechanics**:
  - The storyline modifier marks the water as `toxic`. Stepping in it deals damage every turn.
  - A specific mini-boss or a "Purification Valve" interactable is placed at the furthest point on the map.
  - Defeating the boss/using the valve instantly changes all `toxic` water back to normal water, allowing safe traversal to the exit or previously unreachable loot.

### 6D. The Halls of the Blind
*Inspiration: Halls of the Blind (Diablo 1)*
- **Concept**: A sensory-deprivation floor.
- **Layout**: A dense, labyrinthine BSP map with very small rooms and winding corridors. No torches are generated.
- **Mechanics**: 
  - A global modifier is applied to the `sight-system`: The player's vision radius is capped at 2 tiles.
  - The floor is populated with "Illusion Weaver" enemies that can attack from outside the player's vision range and immediately stealth afterward.
  - Forces the player to rely on AoE attacks, narrow doorways, and extreme caution.

---

## 7. Cross-Game Inspired Scenarios

Drawing from classic and modern dungeon crawlers for more unique encounter ideas.

---

### 7A. The Monster House
*Inspiration: Shiren the Wanderer*
- **Concept**: A room that looks completely normal — until you step inside.
- **Layout**: A single large room generated by BSP. All monsters and a random mix of traps are pre-placed inside, but invisible until the player crosses the door threshold.
- **Trigger**: The moment the player steps into the room, all monsters simultaneously wake up. All exits briefly lock for 3 turns.
- **Mechanics**: The player is instantly surrounded. Retreat to the doorway to create a choke point, or use AoE abilities to survive the opening burst. The room contains extremely high-value loot — it is the risk/reward payoff.
- **Map Hint**: The door to a Monster House has a slightly different texture (e.g., iron-framed instead of wooden). A perceptive player can tell *something* is off before they step through.

### 7B. The Trapped Corridor
*Inspiration: Shiren the Wanderer*
- **Concept**: Hidden traps are placed throughout a corridor zone. Stepping on a trap triggers a negative effect: damage, knockback, item scatter, or summoning enemies.
- **Mechanics**:
  - Traps are invisible by default. Players can reveal them by attacking the tile in front of them (costs an action), or by using a consumable `Trap-Sight Scroll`.
  - Skilled players can *pick up* revealed traps (with Thieves Tools) to relocate and use them against monsters.
- **Tactical Use**: A player who fights smart lures a powerful enemy into a trap-heavy corridor rather than fighting it in an open room.

### 7C. The Wandering Colossus (FOE)
*Inspiration: Etrian Odyssey FOE System*
- **Concept**: A single, visible, miniboss-level entity patrols the entire Macro-Floor on a fixed route. It is far too powerful to fight early in the run.
- **Map Behavior**: The Colossus is shown as a distinct icon on the player's minimap. For every 2 tiles the player moves, the Colossus moves 1 tile along its route. If the player enters its line of sight (3-tile cone), it **turns red and actively chases** at full speed.
- **Danger**: If the player is already in combat when the Colossus reaches them, it joins the fight. This makes basic encounters near its patrol route extremely deadly.
- **Reward**: Defeating the Colossus drops a unique, run-defining legendary item. Most players will avoid it for 75% of the run and only attempt it once fully prepared.
- **Variants**:
  - **The Blind Behemoth**: Enormous sight radius but is deaf — the player can avoid it by not attacking near it.
  - **The Silent Stalker**: Has no sight cone but can "sense" the player's HP (chases if you are below 50%).

### 7D. The Lamp Run (Limited Exploration Resource)
*Inspiration: Labyrinth of Refrain: Coven of Dusk*
- **Concept**: The player carries a Dungeon Lamp with limited fuel. The map goes dark as fuel depletes.
- **Mechanics**:
  - The player starts a zone with `lamp_fuel = 100`. Every tile walked costs 1 fuel. Combat costs 5 fuel per round.
  - As fuel drops, the player's sight radius shrinks incrementally: 100→75% = full sight; 50→25% = half sight; 25→0% = 1-tile sight (near darkness).
  - Lamp Oil consumables can be found in chests or bought from Neutral merchants.
- **Zone Design**: Lamp Runs work best in long, twisting cave zones (the Abandoned Mine). The player must choose: push deeper into unknown darkness with little fuel, or retreat to a rest point?
- **Reward**: Pushing deep into a Lamp Run zone with almost no fuel and surviving reveals a secret vault room with the best loot on the floor.

### 7E. The Devil's Bargain Room
*Inspiration: Binding of Isaac Devil/Angel Rooms*
- **Concept**: A special room that appears once per large zone. It offers the player a powerful, permanent upgrade — but at a heavy cost.
- **Layout**: A sealed, distinct room (red-lit, with unique floor tiles). It contains a single interactable altar.
- **The Bargain**: The altar presents two choices (random, seed-driven):
  - *"Sacrifice 30% of your Max HP permanently. Gain the [Soul Reaver] ability."*
  - *"Drop all gold carried this run. Receive [Cursed Armor of the Damned] (high AC, but immune to healing)."*
- **The Angel Room (Variant)**: Occasionally the altar is holy instead of dark. The deal is fairer, but still has a catch. It requires the player to have *not stolen, not killed a neutral NPC, and not fled from combat* this run — a morality check.
- **Consequence**: These rooms permanently alter the player's build for the rest of the run, creating unique, memorable experiences tied to the seed.

### 7F. The World Event (Timed Invasion)
*Inspiration: Terraria Blood Moon / Goblin Army*
- **Concept**: At a random point during exploration, a global alert fires: *"The Goblin Warband is raiding the Temple!"*
- **Trigger**: After the player completes a certain percentage of the zone, or after a fixed number of turns.
- **Mechanics**:
  - A countdown timer (e.g., 30 turns) begins on screen.
  - A large wave of enemies spawns at the map's **entrance point** (the Ancient Temple) and begins marching toward the player's current position.
  - The player must either: (A) fight their way back to the entrance and defeat the wave leader, or (B) find the exit to the next zone before the wave catches them.
- **Consequence**: If the player ignores the event and the wave leader reaches the Rest Point, the Campfire is *destroyed* for this run. No more Short Rests on this floor.

### 7G. The Biome Corruption
*Inspiration: Terraria Corruption / Crimson*
- **Concept**: A portion of the map slowly "corrupts" over time, turning floor tiles into hazardous terrain.
- **Mechanics**:
  - A `corruption_source` entity is placed in a room. Every 5 turns, it spreads 1 tile in all directions, converting `FLOOR` to `CORRUPTED_FLOOR` (which deals damage each turn the player stands on it).
  - The corruption grows faster the more turns pass.
- **Objective**: Find and destroy the Corruption Source before it spreads too far and makes key areas of the map impassable.
- **Reward**: Destroying the source drops a unique crafting material and stops the spread permanently for this zone.
