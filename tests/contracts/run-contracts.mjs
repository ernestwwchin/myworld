import assert from 'node:assert';
import { runCoreContracts } from './core-contracts.js';
import { runSchemaContracts } from './schema-contracts.js';

function run() {
  runCoreContracts();
  runSchemaContracts(assert);
  console.log('All contract tests passed.');
}

run();
