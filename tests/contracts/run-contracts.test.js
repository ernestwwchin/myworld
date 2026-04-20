import { test } from 'vitest';
import assert from 'node:assert';
import { runCoreContracts } from './core-contracts.js';
import { runSchemaContracts } from './schema-contracts.js';

test('core contracts', async () => {
  await runCoreContracts();
});

test('schema contracts', () => {
  runSchemaContracts(assert);
});
