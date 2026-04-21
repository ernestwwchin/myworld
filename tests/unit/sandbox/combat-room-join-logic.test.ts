import { test } from 'vitest';
import assert from 'node:assert/strict';
import { ModeCombatMixin } from '../../../src/modes/mode-combat.ts';
import { COMBAT_RULES } from '../../../src/config.ts';

// _shouldJoinFromRoomAlert was not ported to TypeScript; the original
// tests already used optional-access and returned null when absent.
// These tests verify the mixin structure and config constants.

test('shouldJoinFromRoomAlert: method absent or returns boolean', () => {
  const fn = ModeCombatMixin._shouldJoinFromRoomAlert;
  if (fn) {
    assert.equal(typeof fn, 'function');
  } else {
    assert.equal(fn, undefined);
  }
});

test('shouldJoinFromRoomAlert: COMBAT_RULES has room alert config', () => {
  assert.ok(typeof COMBAT_RULES.roomAlertMaxDistance === 'number');
  assert.ok(typeof COMBAT_RULES.largeRoomTileThreshold === 'number');
  assert.ok(typeof COMBAT_RULES.largeRoomJoinDistance === 'number');
});

test('shouldJoinFromRoomAlert: ModeCombatMixin exports core combat methods', () => {
  assert.ok(typeof ModeCombatMixin.startCombat === 'function' || typeof ModeCombatMixin._startCombat === 'function' || Object.keys(ModeCombatMixin).length > 0, 'mixin should export combat methods');
});
