const assert = require('assert');
const { runCoreContracts } = require('./core-contracts');
const { runSchemaContracts } = require('./schema-contracts');

function run() {
  runCoreContracts();
  runSchemaContracts(assert);
  console.log('All contract tests passed.');
}

run();
