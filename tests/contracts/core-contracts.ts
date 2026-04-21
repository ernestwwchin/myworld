import { runDndAndMapContracts } from './dnd-and-map-contracts.ts';
import { runModEventContracts } from './mod-event-contracts.ts';
import { runUiSystemContracts } from './ui-system-contracts.ts';
import { runInventoryItemContracts } from './inventory-item-contracts.ts';

export async function runCoreContracts() {
  await runDndAndMapContracts();
  runModEventContracts();
  runUiSystemContracts();
  runInventoryItemContracts();
}
