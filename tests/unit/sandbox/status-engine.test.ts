import { describe, test, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { StatusEngine } from '../../../src/systems/status-engine.ts';
import type { StatusInstance, StatusDef, StatusEffectsAdapter } from '../../../src/systems/status-engine.ts';
import type { Actor } from '../../../src/types/actors.ts';

function mockAdapter(): StatusEffectsAdapter & { data: Map<Actor, StatusInstance[]> } {
  const data = new Map<Actor, StatusInstance[]>();
  return {
    data,
    getStatuses(actor) {
      if (!data.has(actor)) data.set(actor, []);
      return data.get(actor)!;
    },
    setStatuses(actor, statuses) {
      data.set(actor, statuses);
    },
  };
}

const burning: StatusDef = { id: 'burning', duration: 3 };
const poisoned: StatusDef = { id: 'poisoned', duration: 5, onReapply: 'independent' };
const bleeding: StatusDef = { id: 'bleeding', duration: 4, onReapply: 'stack', maxStacks: 5 };
const haste: StatusDef = { id: 'haste', duration: 10, stackId: 'haste_slow', stackPriority: 10 };
const slow: StatusDef = { id: 'slow', duration: 10, stackId: 'haste_slow', stackPriority: 12 };
const bless: StatusDef = { id: 'bless', duration: 5, stackId: 'bless_bane', stackPriority: 0 };
const bane: StatusDef = { id: 'bane', duration: 5, stackId: 'bless_bane', stackPriority: 0 };

const enemy = (): Actor => ({
  hp: 20, maxHp: 20, tx: 3, ty: 4, sight: 5, alive: true, type: 'goblin',
});

let adapter: ReturnType<typeof mockAdapter>;
let engine: StatusEngine;

beforeEach(() => {
  adapter = mockAdapter();
  engine = new StatusEngine(adapter);
});

// ── 1. Basic apply/remove ──

describe('basic apply and remove', () => {
  test('applyStatus adds a status instance', () => {
    const result = engine.applyStatus('player', burning);
    assert.equal(result.action, 'added');
    assert.equal(engine.hasStatus('player', 'burning'), true);
  });

  test('instance stores source', () => {
    const src = enemy();
    const result = engine.applyStatus('player', burning, src);
    assert.equal(result.action, 'added');
    assert.equal((result as { instance: StatusInstance }).instance.source, src);
  });

  test('instance stores duration and stacks=1', () => {
    const result = engine.applyStatus('player', burning);
    const inst = (result as { instance: StatusInstance }).instance;
    assert.equal(inst.remaining, 3);
    assert.equal(inst.stacks, 1);
  });

  test('removeStatus removes by id', () => {
    engine.applyStatus('player', burning);
    const removed = engine.removeStatus('player', 'burning');
    assert.ok(removed);
    assert.equal(removed!.id, 'burning');
    assert.equal(engine.hasStatus('player', 'burning'), false);
  });

  test('removeStatus returns null for missing status', () => {
    assert.equal(engine.removeStatus('player', 'nonexistent'), null);
  });

  test('removeAll clears all statuses', () => {
    engine.applyStatus('player', burning);
    engine.applyStatus('player', poisoned);
    const removed = engine.removeAll('player');
    assert.equal(removed.length, 2);
    assert.equal(engine.getStatuses('player').length, 0);
  });
});

// ── 2. Source tracking ──

describe('source tracking', () => {
  test('removeStatusBySource removes only statuses from that source', () => {
    const src1 = enemy();
    const src2 = enemy();
    engine.applyStatus('player', burning, src1);
    engine.applyStatus('player', poisoned, src2);
    const removed = engine.removeStatusBySource('player', src1);
    assert.equal(removed.length, 1);
    assert.equal(removed[0].id, 'burning');
    assert.equal(engine.getStatuses('player').length, 1);
    assert.equal(engine.getStatuses('player')[0].id, 'poisoned');
  });

  test('removeStatusBySource returns empty if no match', () => {
    const src = enemy();
    engine.applyStatus('player', burning, null);
    assert.deepEqual(engine.removeStatusBySource('player', src), []);
  });
});

// ── 3. onReapply: overwrite (default) ──

describe('onReapply: overwrite', () => {
  test('reapplying same status resets duration', () => {
    engine.applyStatus('player', burning);
    engine.getStatuses('player')[0].remaining = 1;
    const result = engine.applyStatus('player', burning);
    assert.equal(result.action, 'overwritten');
    assert.equal(engine.getStatuses('player').length, 1);
    assert.equal(engine.getStatuses('player')[0].remaining, 3);
  });

  test('overwrite updates source', () => {
    const src1 = enemy();
    const src2 = enemy();
    engine.applyStatus('player', burning, src1);
    engine.applyStatus('player', burning, src2);
    assert.equal(engine.getStatuses('player')[0].source, src2);
  });
});

// ── 4. onReapply: stack ──

describe('onReapply: stack', () => {
  test('stacking increments counter', () => {
    engine.applyStatus('player', bleeding);
    const result = engine.applyStatus('player', bleeding);
    assert.equal(result.action, 'stacked');
    assert.equal((result as { newStacks: number }).newStacks, 2);
    assert.equal(engine.getStatuses('player').length, 1);
    assert.equal(engine.getStacks('player', 'bleeding'), 2);
  });

  test('stacking takes max duration', () => {
    engine.applyStatus('player', bleeding);
    engine.getStatuses('player')[0].remaining = 1;
    engine.applyStatus('player', bleeding);
    assert.equal(engine.getStatuses('player')[0].remaining, 4);
  });

  test('stacking respects maxStacks', () => {
    for (let i = 0; i < 7; i++) {
      engine.applyStatus('player', bleeding);
    }
    assert.equal(engine.getStacks('player', 'bleeding'), 5);
  });
});

// ── 5. onReapply: independent ──

describe('onReapply: independent', () => {
  test('independent allows multiple instances', () => {
    engine.applyStatus('player', poisoned);
    engine.applyStatus('player', poisoned);
    engine.applyStatus('player', poisoned);
    assert.equal(engine.getStatuses('player').length, 3);
    assert.equal(engine.getStatuses('player').every(s => s.id === 'poisoned'), true);
  });

  test('each independent instance has own duration', () => {
    engine.applyStatus('player', poisoned);
    engine.applyStatus('player', { ...poisoned, duration: 2 });
    const statuses = engine.getStatuses('player');
    assert.equal(statuses[0].remaining, 5);
    assert.equal(statuses[1].remaining, 2);
  });
});

// ── 6. stackId / stackPriority ──

describe('stackId and stackPriority', () => {
  test('higher priority replaces lower', () => {
    engine.applyStatus('player', haste);
    const result = engine.applyStatus('player', slow);
    assert.equal(result.action, 'replaced_by_priority');
    assert.equal(engine.hasStatus('player', 'slow'), true);
    assert.equal(engine.hasStatus('player', 'haste'), false);
    assert.equal(engine.getStatuses('player').length, 1);
  });

  test('lower priority is blocked', () => {
    engine.applyStatus('player', slow);
    const result = engine.applyStatus('player', haste);
    assert.equal(result.action, 'blocked');
    assert.equal((result as { reason: string }).reason, 'lower_priority');
    assert.equal(engine.hasStatus('player', 'slow'), true);
    assert.equal(engine.hasStatus('player', 'haste'), false);
  });

  test('same priority, different id: last-applied-wins', () => {
    engine.applyStatus('player', bless);
    const result = engine.applyStatus('player', bane);
    assert.equal(result.action, 'replaced_by_priority');
    assert.equal(engine.hasStatus('player', 'bane'), true);
    assert.equal(engine.hasStatus('player', 'bless'), false);
  });

  test('same priority, same id: uses onReapply', () => {
    engine.applyStatus('player', haste);
    engine.getStatuses('player')[0].remaining = 5;
    const result = engine.applyStatus('player', haste);
    assert.equal(result.action, 'overwritten');
    assert.equal(engine.getStatuses('player')[0].remaining, 10);
  });
});

// ── 7. Tick and expiration ──

describe('tick and expiration', () => {
  test('tickStatuses decrements remaining', () => {
    engine.applyStatus('player', burning);
    engine.tickStatuses('player');
    assert.equal(engine.getStatuses('player')[0].remaining, 2);
  });

  test('tickStatuses removes expired', () => {
    engine.applyStatus('player', { ...burning, duration: 1 });
    const result = engine.tickStatuses('player');
    assert.equal(result.expired.length, 1);
    assert.equal(result.expired[0].id, 'burning');
    assert.equal(engine.getStatuses('player').length, 0);
  });

  test('permanent statuses (remaining = -1) never expire', () => {
    engine.applyStatus('player', burning);
    engine.getStatuses('player')[0].remaining = -1;
    engine.tickStatuses('player');
    engine.tickStatuses('player');
    engine.tickStatuses('player');
    assert.equal(engine.getStatuses('player').length, 1);
  });

  test('multiple statuses tick independently', () => {
    engine.applyStatus('player', burning);
    engine.applyStatus('player', { ...poisoned, duration: 2 });
    engine.tickStatuses('player');
    const statuses = engine.getStatuses('player');
    assert.equal(statuses[0].remaining, 2);
    assert.equal(statuses[1].remaining, 1);
  });
});

// ── 8. Query helpers ──

describe('query helpers', () => {
  test('hasStatus returns false for absent status', () => {
    assert.equal(engine.hasStatus('player', 'burning'), false);
  });

  test('getStacks returns 0 for absent status', () => {
    assert.equal(engine.getStacks('player', 'bleeding'), 0);
  });

  test('getStatuses returns empty array for new actor', () => {
    assert.deepEqual(engine.getStatuses('player'), []);
  });
});

// ── 9. Duration override ──

describe('duration override', () => {
  test('durationOverride takes precedence over def.duration', () => {
    engine.applyStatus('player', burning, null, 7);
    assert.equal(engine.getStatuses('player')[0].remaining, 7);
  });
});
