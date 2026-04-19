export interface Enemy {
  alive?: boolean;
  inCombat?: boolean;
  hp: number;
  maxHp?: number;
  tx: number;
  ty: number;
  sight: number;
  fov?: number;
  facing?: number;
  displayName?: string;
  type?: string;
  id?: string;
  name?: string;
  effects?: StatusEffect[];
  stats?: Record<string, number>;
  img?: Phaser.GameObjects.Sprite;
  hpBg?: Phaser.GameObjects.Rectangle;
  hpFg?: Phaser.GameObjects.Rectangle;
  lbl?: Phaser.GameObjects.Text & { active?: boolean };
  sightRing?: Phaser.GameObjects.Arc & { setRadius?: (r: number) => void };
  fa?: Phaser.GameObjects.Graphics;
  [key: string]: unknown;
}

export type Actor = 'player' | Enemy;

export interface StatusEffect {
  id?: string;
  type?: string;
  trigger?: string;
  tickMs?: number;
  elapsedMs?: number;
  duration?: number;
  damageDice?: [number, number, number];
  onTrigger?: {
    damageDice?: [number, number, number];
    damageColor?: number;
    skipTurn?: boolean;
    removeOnSave?: { stat?: string; dc?: number };
  };
  removeOnSave?: { stat?: string; dc?: number };
  wakeStat?: string;
  wakeDc?: number;
}
