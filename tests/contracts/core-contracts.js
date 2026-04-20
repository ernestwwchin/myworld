import { runDndAndMapContracts } from './dnd-and-map-contracts.js';
import { runModEventContracts } from './mod-event-contracts.js';
import { runUiSystemContracts } from './ui-system-contracts.js';
import { runInventoryItemContracts } from './inventory-item-contracts.js';

export function runCoreContracts() {
  runDndAndMapContracts();
  runModEventContracts();
  runUiSystemContracts();
  runInventoryItemContracts();
}
