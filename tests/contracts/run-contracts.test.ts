import { test } from 'vitest';
import assert from 'node:assert';
import { runCoreContracts } from './core-contracts.ts';
import { runSchemaContracts } from './schema-contracts.ts';

test('core contracts', async () => {
  await runCoreContracts();
});

test('schema contracts', () => {
  runSchemaContracts(assert);
});
