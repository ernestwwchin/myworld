# Character & Monster Sprite Dictionary

Complete reference for all animated character and monster sprites in the 0x72 Dungeon Tileset II v1.7.

## Sprite Dimensions

- **Standard Characters**: 16x28 pixels (28px height extends 12px above 16x16 grid)
- **Small Creatures**: 16x16 pixels
- **Large Creatures**: 32x36 pixels

All sprites support **idle**, **run**, and **hit** animations where applicable.

## Animation Frame Structure

Each animation typically has 4 frames (f0-f3) that loop:
- **Idle**: Breathing/standing animation (8-10 FPS)
- **Run**: Walking/running animation (12-16 FPS)
- **Hit**: Damage reaction (single frame or 2-frame flash)

---

## 1. Player Character Classes (16x28)

### Human Female Characters

#### Elf Female
- **Type**: `elf_f`
- **Size**: 16x28
- **Animations**:
  - `elf_f_idle_anim_f0-f3`: Idle stance (4 frames)
  - `elf_f_run_anim_f0-f3`: Running animation (4 frames)
  - `elf_f_hit_anim_f0`: Hit reaction (1 frame)
- **Tags**: `player`, `elf`, `female`, `agility`, `ranger`, `rogue`
- **Suggested Stats**: DEX-focused, high mobility

#### Wizard Female
- **Type**: `wizzard_f` *(note: double-z spelling)*
- **Size**: 16x28
- **Animations**:
  - `wizzard_f_idle_anim_f0-f3`: Idle with robe sway (4 frames)
  - `wizzard_f_run_anim_f0-f3`: Running (4 frames)
  - `wizzard_f_hit_anim_f0`: Hit reaction (1 frame)
- **Tags**: `player`, `wizard`, `female`, `magic`, `intelligence`, `spellcaster`
- **Suggested Stats**: INT-focused, high spell slots

#### Knight Female
- **Type**: `knight_f`
- **Size**: 16x28
- **Animations**:
  - `knight_f_idle_anim_f0-f3`: Armored stance (4 frames)
  - `knight_f_run_anim_f0-f3`: Heavy running (4 frames)
  - `knight_f_hit_anim_f0`: Hit reaction (1 frame)
- **Tags**: `player`, `knight`, `female`, `strength`, `tank`, `armor`
- **Suggested Stats**: STR/CON-focused, high AC

#### Dwarf Female
- **Type**: `dwarf_f`
- **Size**: 16x28
- **Animations**:
  - `dwarf_f_idle_anim_f0-f3`: Stout stance (4 frames)
  - `dwarf_f_run_anim_f0-f3`: Heavy footfalls (4 frames)
  - `dwarf_f_hit_anim_f0`: Hit reaction (1 frame)
- **Tags**: `player`, `dwarf`, `female`, `constitution`, `resilient`
- **Suggested Stats**: CON-focused, poison resistance

#### Lizardfolk Female
- **Type**: `lizard_f`
- **Size**: 16x28
- **Animations**:
  - `lizard_f_idle_anim_f0-f3`: Reptilian stance (4 frames)
  - `lizard_f_run_anim_f0-f3`: Tail swish running (4 frames)
  - `lizard_f_hit_anim_f0`: Hit reaction (1 frame)
- **Tags**: `player`, `lizardfolk`, `female`, `exotic`, `natural armor`
- **Suggested Stats**: Natural AC bonus, swim speed

### Human Male Characters

#### Elf Male
- **Type**: `elf_m`
- **Size**: 16x28
- **Animations**:
  - `elf_m_idle_anim_f0-f3`: Idle stance (4 frames)
  - `elf_m_run_anim_f0-f3`: Running animation (4 frames)
  - `elf_m_hit_anim_f0`: Hit reaction (1 frame)
- **Tags**: `player`, `elf`, `male`, `agility`, `ranger`, `rogue`

#### Wizard Male
- **Type**: `wizzard_m`
- **Size**: 16x28
- **Animations**:
  - `wizzard_m_idle_anim_f0-f3`: Idle with staff (4 frames)
  - `wizzard_m_run_anim_f0-f3`: Running (4 frames)
  - `wizzard_m_hit_anim_f0`: Hit reaction (1 frame)
- **Tags**: `player`, `wizard`, `male`, `magic`, `intelligence`, `spellcaster`

#### Knight Male
- **Type**: `knight_m`
- **Size**: 16x28
- **Animations**:
  - `knight_m_idle_anim_f0-f3`: Armored stance (4 frames)
  - `knight_m_run_anim_f0-f3`: Heavy running (4 frames)
  - `knight_m_hit_anim_f0`: Hit reaction (1 frame)
- **Tags**: `player`, `knight`, `male`, `strength`, `tank`, `armor`

#### Dwarf Male
- **Type**: `dwarf_m`
- **Size**: 16x28
- **Animations**:
  - `dwarf_m_idle_anim_f0-f3`: Bearded stance (4 frames)
  - `dwarf_m_run_anim_f0-f3`: Heavy footfalls (4 frames)
  - `dwarf_m_hit_anim_f0`: Hit reaction (1 frame)
- **Tags**: `player`, `dwarf`, `male`, `constitution`, `resilient`

#### Lizardfolk Male
- **Type**: `lizard_m`
- **Size**: 16x28
- **Animations**:
  - `lizard_m_idle_anim_f0-f3`: Reptilian stance (4 frames)
  - `lizard_m_run_anim_f0-f3`: Tail swish running (4 frames)
  - `lizard_m_hit_anim_f0`: Hit reaction (1 frame)
- **Tags**: `player`, `lizardfolk`, `male`, `exotic`, `natural armor`

---

## 2. Small Monsters (16x16)

### Goblin
- **Type**: `goblin`
- **Size**: 16x16
- **CR**: 1/4 to 1/2
- **Animations**:
  - `goblin_idle_anim_f0-f3`: Sneaky stance (4 frames)
  - `goblin_run_anim_f0-f3`: Quick movement (4 frames)
- **Tags**: `enemy`, `goblin`, `small`, `nimble`, `common`
- **Behavior**: Pack tactics, ambush predator
- **Drops**: Crude weapons, small coins

### Imp
- **Type**: `imp`
- **Size**: 16x16
- **CR**: 1
- **Animations**:
  - `imp_idle_anim_f0-f3`: Hovering stance (4 frames)
  - `imp_run_anim_f0-f3`: Flying movement (4 frames)
- **Tags**: `enemy`, `imp`, `demon`, `flying`, `magic`
- **Behavior**: Ranged magic attacks, evasive
- **Drops**: Magic essence, scrolls

### Tiny Zombie
- **Type**: `tiny_zombie`
- **Size**: 16x16
- **CR**: 1/8
- **Animations**:
  - `tiny_zombie_idle_anim_f0-f3`: Shambling stance (4 frames)
  - `tiny_zombie_run_anim_f0-f3`: Slow movement (4 frames)
- **Tags**: `enemy`, `zombie`, `undead`, `slow`, `common`
- **Behavior**: Slow melee, disease carrier
- **Drops**: Rotten flesh, bones

### Ice Zombie
- **Type**: `ice_zombie`
- **Size**: 16x16
- **CR**: 1/2
- **Animations**:
  - `ice_zombie_anim_f0-f3`: Frozen shamble (4 frames)
- **Tags**: `enemy`, `zombie`, `undead`, `ice`, `elemental`
- **Behavior**: Cold damage, slows on hit
- **Drops**: Ice shards, frozen bones

### Slug
- **Type**: `slug`
- **Size**: 16x16
- **CR**: 1/8
- **Animations**:
  - `slug_anim_f0-f3`: Ooze movement (4 frames)
- **Tags**: `enemy`, `slug`, `ooze`, `slow`, `acid`
- **Behavior**: Acid ranged attack, leaves slime trail
- **Drops**: Slime, acid vials

### Tiny Slug
- **Type**: `tiny_slug`
- **Size**: 16x16
- **CR**: 0
- **Animations**:
  - `tiny_slug_anim_f0-f3`: Small ooze (4 frames)
- **Tags**: `enemy`, `slug`, `ooze`, `tiny`, `swarm`
- **Behavior**: Swarm mechanics, minimal threat
- **Drops**: Slime droplets

### Muddy
- **Type**: `muddy`
- **Size**: 16x16
- **CR**: 1/4
- **Animations**:
  - `muddy_anim_f0-f3`: Mud elemental (4 frames)
- **Tags**: `enemy`, `elemental`, `earth`, `slow`
- **Behavior**: Ground-based, difficult terrain
- **Drops**: Mud, earth essence

### Swampy
- **Type**: `swampy`
- **Size**: 16x16
- **CR**: 1/2
- **Animations**:
  - `swampy_anim_f0-f3`: Swamp creature (4 frames)
- **Tags**: `enemy`, `elemental`, `water`, `poison`
- **Behavior**: Aquatic, poison damage
- **Drops**: Swamp water, toxins

### Zombie (Regular)
- **Type**: `zombie`
- **Size**: 16x16
- **CR**: 1/4
- **Animations**:
  - `zombie_anim_f1-f3,f10`: Shambling (4 frames)
- **Tags**: `enemy`, `zombie`, `undead`, `common`
- **Behavior**: Slow melee, undead fortitude
- **Drops**: Rotten flesh, torn cloth

---

## 3. Medium Humanoids (16x23 to 16x28)

### Orc Warrior
- **Type**: `orc_warrior`
- **Size**: 16x23
- **CR**: 1/2
- **Animations**:
  - `orc_warrior_idle_anim_f0-f3`: Battle-ready stance (4 frames)
  - `orc_warrior_run_anim_f0-f3`: Aggressive run (4 frames)
- **Tags**: `enemy`, `orc`, `warrior`, `aggressive`, `melee`
- **Behavior**: Aggressive melee, berserker rage
- **Drops**: Orcish weapons, hide armor

### Orc Shaman
- **Type**: `orc_shaman`
- **Size**: 16x23
- **CR**: 2
- **Animations**:
  - `orc_shaman_idle_anim_f0-f3`: Casting stance (4 frames)
  - `orc_shaman_run_anim_f0-f3`: Movement (4 frames)
- **Tags**: `enemy`, `orc`, `shaman`, `magic`, `support`
- **Behavior**: Ranged magic, buffs other orcs
- **Drops**: Totems, spell components

### Masked Orc
- **Type**: `masked_orc`
- **Size**: 16x23
- **CR**: 1
- **Animations**:
  - `masked_orc_idle_anim_f0-f3`: Masked stance (4 frames)
  - `masked_orc_run_anim_f0-f3`: Sneaky movement (4 frames)
- **Tags**: `enemy`, `orc`, `assassin`, `stealth`, `nimble`
- **Behavior**: Stealth attacks, critical hits
- **Drops**: Masks, poisoned daggers

### Skeleton
- **Type**: `skelet`
- **Size**: 16x16
- **CR**: 1/4
- **Animations**:
  - `skelet_idle_anim_f0-f3`: Bone rattle (4 frames)
  - `skelet_run_anim_f0-f3`: Clattering movement (4 frames)
- **Tags**: `enemy`, `skeleton`, `undead`, `common`
- **Behavior**: Ranged bow attacks, fragile
- **Drops**: Bones, arrows, rusty weapons

### Wogol
- **Type**: `wogol`
- **Size**: 16x23
- **CR**: 1/2
- **Animations**:
  - `wogol_idle_anim_f0-f3`: Crouched stance (4 frames)
  - `wogol_run_anim_f0-f3`: Scurrying movement (4 frames)
- **Tags**: `enemy`, `wogol`, `beast`, `feral`
- **Behavior**: Pack hunter, pounce attack
- **Drops**: Beast pelts, fangs

### Necromancer
- **Type**: `necromancer`
- **Size**: 16x23
- **CR**: 5
- **Animations**:
  - `necromancer_anim_f0-f3`: Dark casting (4 frames)
- **Tags**: `enemy`, `necromancer`, `undead`, `magic`, `boss`
- **Behavior**: Raises undead, life drain
- **Drops**: Dark grimoires, phylacteries

### Doc
- **Type**: `doc`
- **Size**: 16x28
- **CR**: 1/8
- **Animations**:
  - `doc_idle_anim_f0-f3`: Friendly stance (4 frames)
  - `doc_run_anim_f0-f3`: Running (4 frames)
- **Tags**: `npc`, `doc`, `friendly`, `healer`
- **Behavior**: Town healer, quest giver
- **Interaction**: Shop, quests, healing

### Pumpkin Dude
- **Type**: `pumpkin_dude`
- **Size**: 16x16
- **CR**: 1
- **Animations**:
  - `pumpkin_dude_idle_anim_f0-f3`: Eerie sway (4 frames)
  - `pumpkin_dude_run_anim_f0-f3`: Hopping movement (4 frames)
- **Tags**: `enemy`, `pumpkin`, `halloween`, `construct`
- **Behavior**: Seasonal enemy, fire weakness
- **Drops**: Pumpkin seeds, jack-o-lantern

---

## 4. Large Monsters (32x36)

### Big Demon
- **Type**: `big_demon`
- **Size**: 32x36
- **CR**: 5
- **Animations**:
  - `big_demon_idle_anim_f0-f3`: Menacing stance (4 frames)
  - `big_demon_run_anim_f0-f3`: Heavy movement (4 frames)
- **Tags**: `enemy`, `demon`, `large`, `boss`, `fire`, `elite`
- **Behavior**: Heavy melee, fire aura, intimidating
- **Drops**: Demon hearts, infernal weapons

### Big Zombie
- **Type**: `big_zombie`
- **Size**: 32x36
- **CR**: 3
- **Animations**:
  - `big_zombie_idle_anim_f0-f3`: Hulking stance (4 frames)
  - `big_zombie_run_anim_f0-f3`: Slow charge (4 frames)
- **Tags**: `enemy`, `zombie`, `undead`, `large`, `tank`
- **Behavior**: High HP, slam attacks, disease
- **Drops**: Large bones, rotten meat

### Chort
- **Type**: `chort`
- **Size**: 16x16 *(appears smaller than other large enemies)*
- **CR**: 1
- **Animations**:
  - `chort_idle_anim_f0-f3`: Demonic stance (4 frames)
  - `chort_run_anim_f0-f3`: Quick movement (4 frames)
- **Tags**: `enemy`, `demon`, `small demon`, `fast`
- **Behavior**: Quick melee, dodge rolls
- **Drops**: Demon claws, sulfur

### Ogre
- **Type**: `ogre`
- **Size**: 16x23 *(medium-large)*
- **CR**: 2
- **Animations**:
  - `ogre_idle_anim_f0-f3`: Brutish stance (4 frames)
  - `ogre_run_anim_f0-f3`: Heavy footfalls (4 frames)
- **Tags**: `enemy`, `ogre`, `large`, `brute`, `slow`
- **Behavior**: Heavy damage, area slam
- **Drops**: Ogre clubs, treasure

---

## 5. Special Entities

### Angel
- **Type**: `angel`
- **Size**: 16x16
- **CR**: 4 (Celestial)
- **Animations**:
  - `angel_idle_anim_f0-f3`: Hovering (4 frames)
  - `angel_run_anim_f0-f3`: Flying movement (4 frames)
- **Tags**: `celestial`, `angel`, `flying`, `radiant`, `rare`
- **Behavior**: Radiant damage, healing, flight
- **Drops**: Holy relics, feathers

---

## Animation Frame Rates (Recommended)

```typescript
const ANIM_FPS = {
  idle: 8,       // Slow breathing
  run: 14,       // Smooth running
  hit: 20,       // Quick flash
  attack: 12,    // Weapon swing
  cast: 10,      // Spell casting
  death: 8,      // Death animation
};
```

## Integration with Phaser

### Creating Character Sprite

```typescript
function createCharacter(scene: Phaser.Scene, type: string, x: number, y: number) {
  const sprite = scene.add.sprite(x, y, `${type}_idle_anim_f0`);
  
  // Create animations
  scene.anims.create({
    key: `${type}_idle`,
    frames: [
      { key: `${type}_idle_anim_f0` },
      { key: `${type}_idle_anim_f1` },
      { key: `${type}_idle_anim_f2` },
      { key: `${type}_idle_anim_f3` },
    ],
    frameRate: 8,
    repeat: -1,
  });
  
  scene.anims.create({
    key: `${type}_run`,
    frames: [
      { key: `${type}_run_anim_f0` },
      { key: `${type}_run_anim_f1` },
      { key: `${type}_run_anim_f2` },
      { key: `${type}_run_anim_f3` },
    ],
    frameRate: 14,
    repeat: -1,
  });
  
  sprite.play(`${type}_idle`);
  return sprite;
}
```

### Switching Animations

```typescript
function playAnimation(sprite: Phaser.GameObjects.Sprite, anim: 'idle' | 'run' | 'hit') {
  const type = sprite.getData('type');
  sprite.play(`${type}_${anim}`);
}
```

## Character Selection Matrix

Use this matrix to balance party composition:

| Class | Primary | Secondary | AC | Speed | Role |
|-------|---------|-----------|----|----|------|
| Knight | STR | CON | 18 | 25ft | Tank/Melee |
| Elf Ranger | DEX | WIS | 15 | 35ft | DPS/Scout |
| Wizard | INT | DEX | 12 | 30ft | Caster/Control |
| Dwarf Fighter | CON | STR | 17 | 25ft | Tank/Resist |
| Lizardfolk | STR | CON | 14 (natural) | 30ft/Swim 30ft | Versatile |

## Next Steps

- See [Tile Catalog](./tile-catalog.md) for environment tiles
- See [BSP Room Stamps](./bsp-room-stamps.md) for enemy placement patterns
- Try the [Character Showcase](../../scratch/character-showcase.html)
