const { runDndAndMapContracts } = require('./dnd-and-map-contracts');
const { runModEventContracts } = require('./mod-event-contracts');
const { runUiSystemContracts } = require('./ui-system-contracts');
const { runInventoryItemContracts } = require('./inventory-item-contracts');

function runCoreContracts() {
  runDndAndMapContracts();
  runModEventContracts();
  runUiSystemContracts();
  runInventoryItemContracts();
}

module.exports = {
  runCoreContracts,
};
