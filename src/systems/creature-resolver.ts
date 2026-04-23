export interface CreatureDef {
  id?: string;
  type?: string;
  name?: string;
  extends?: string;
  hp?: number;
  ac?: number;
  speed?: number;
  sight?: number;
  fov?: number;
  xp?: number;
  level?: number;
  cr?: string;
  icon?: string;
  gold?: string | number;
  stats?: Record<string, number>;
  attack?: Record<string, unknown>;
  ai?: Record<string, unknown>;
  abilities?: string[];
  resistances?: string[];
  immunities?: string[];
  vulnerabilities?: string[];
  lootTable?: string;
  loot?: unknown[];
  effects?: unknown[];
  statuses?: unknown[];
  skillProficiencies?: string[];
  [key: string]: unknown;
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const val = override[key];
    if (val === undefined) continue;
    if (
      val !== null &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, val as Record<string, unknown>);
    } else {
      result[key] = val;
    }
  }
  return result;
}

export function resolveCreature(
  id: string,
  registry: Record<string, CreatureDef>,
  maxDepth = 10,
): CreatureDef | null {
  const def = registry[id];
  if (!def) return null;

  if (!def.extends) {
    return { ...def, id };
  }

  const chain: CreatureDef[] = [def];
  let current = def;
  let depth = 0;

  while (current.extends && depth < maxDepth) {
    const parent = registry[current.extends];
    if (!parent) {
      console.warn(`[CreatureResolver] Parent "${current.extends}" not found for "${id}"`);
      break;
    }
    chain.push(parent);
    current = parent;
    depth++;
  }

  if (depth >= maxDepth) {
    console.warn(`[CreatureResolver] Max inheritance depth reached for "${id}"`);
  }

  chain.reverse();
  let resolved: Record<string, unknown> = {};
  for (const entry of chain) {
    const { extends: _ext, ...fields } = entry;
    resolved = deepMerge(resolved, fields as Record<string, unknown>);
  }

  resolved.id = id;
  delete resolved.extends;
  return resolved as CreatureDef;
}

export function resolveAllCreatures(
  registry: Record<string, CreatureDef>,
): Record<string, CreatureDef> {
  const resolved: Record<string, CreatureDef> = {};
  for (const id of Object.keys(registry)) {
    const creature = resolveCreature(id, registry);
    if (creature) resolved[id] = creature;
  }
  return resolved;
}
