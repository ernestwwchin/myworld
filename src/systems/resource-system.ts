export interface ActorResources {
  action: number;
  bonusAction: number;
  movement: number;
  reaction: number;
}

export const DEFAULT_RESOURCES: Readonly<ActorResources> = {
  action: 1,
  bonusAction: 1,
  movement: 5,
  reaction: 1,
};

export function createResources(overrides?: Partial<ActorResources>): ActorResources {
  return { ...DEFAULT_RESOURCES, ...overrides };
}

export function resetResources(
  resources: ActorResources,
  baseMovement?: number,
): ActorResources {
  resources.action = DEFAULT_RESOURCES.action;
  resources.bonusAction = DEFAULT_RESOURCES.bonusAction;
  resources.movement = baseMovement ?? DEFAULT_RESOURCES.movement;
  resources.reaction = DEFAULT_RESOURCES.reaction;
  return resources;
}

export type ActionCost = 'action' | 'bonusAction' | 'free' | 'reaction';

export function canAfford(resources: ActorResources, cost: ActionCost): boolean {
  switch (cost) {
    case 'action': return resources.action >= 1;
    case 'bonusAction': return resources.bonusAction >= 1;
    case 'reaction': return resources.reaction >= 1;
    case 'free': return true;
  }
}

export function spendResource(resources: ActorResources, cost: ActionCost): boolean {
  if (!canAfford(resources, cost)) return false;
  switch (cost) {
    case 'action': resources.action -= 1; break;
    case 'bonusAction': resources.bonusAction -= 1; break;
    case 'reaction': resources.reaction -= 1; break;
    case 'free': break;
  }
  return true;
}

export function grantResource(
  resources: ActorResources,
  type: keyof ActorResources,
  amount: number,
): void {
  resources[type] = (resources[type] || 0) + amount;
}

export function consumeMovement(resources: ActorResources, tiles: number): boolean {
  if (resources.movement < tiles) return false;
  resources.movement -= tiles;
  return true;
}

export function hasMovement(resources: ActorResources): boolean {
  return resources.movement > 0;
}

export function getMovement(resources: ActorResources): number {
  return resources.movement;
}
