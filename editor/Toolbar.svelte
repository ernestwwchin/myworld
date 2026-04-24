<script lang="ts">
  import * as state from './state';
  import { renderAll } from './renderer';
  import { buildPalette } from './controls';
  import type { LogicType, ObjectType } from './types';

  let { onchange }: { onchange?: () => void } = $props();

  let activeLogic = $state<LogicType>('walkable');
  let activeObj = $state<string>('');
  let gridW = $state(12);
  let gridH = $state(12);

  const logicButtons: { logic: LogicType; label: string }[] = [
    { logic: 'blocked', label: 'Blocked' },
    { logic: 'void', label: 'Void' },
    { logic: 'doorable', label: 'Doorable' },
    { logic: 'walkable', label: 'Eraser ⌫' },
  ];

  const objButtons: { obj: string; label: string }[] = [
    { obj: 'door', label: 'Door' },
    { obj: 'chest', label: 'Chest' },
    { obj: 'trap', label: 'Trap' },
    { obj: 'column', label: 'Column' },
    { obj: 'crate', label: 'Crate' },
    { obj: 'stairs', label: 'Stairs' },
    { obj: 'shrine', label: 'Shrine' },
    { obj: 'enemy_spawn', label: 'Enemy @' },
    { obj: '', label: 'No Obj ✕' },
  ];

  function setLogic(logic: LogicType) {
    activeLogic = logic;
    state.setPaintLogic(logic);
  }

  function setObj(obj: string) {
    activeObj = obj;
    state.setPaintObject(obj as ObjectType | '');
    state.setSelectedSprite(null);
    buildPalette();
  }

  function resize() {
    const w = Math.max(6, Math.min(40, gridW || 12));
    const h = Math.max(6, Math.min(40, gridH || 12));
    state.resizeGrid(w, h);
    onchange?.();
  }

  function clear() {
    state.initGrid();
    onchange?.();
  }

  function newStamp() {
    state.initGrid();
    state.setStampName('Untitled');
    state.setLastLoadedStamp(null);
    const nameEl = document.getElementById('edName') as HTMLInputElement | null;
    if (nameEl) nameEl.value = 'Untitled';
    import('./library').then(lib => lib.setActiveStampId(null));
    onchange?.();
  }

  function resetStamp() {
    if (state.lastLoadedStamp) {
      import('./controls').then(c => c.loadStampIntoEditor(state.lastLoadedStamp!));
    }
  }
</script>

<div class="toolbar">
  <label class="toolbar-label">Logic:</label>
  {#each logicButtons as btn}
    <button
      class="tool-btn"
      class:active={activeLogic === btn.logic}
      onclick={() => setLogic(btn.logic)}
    >{btn.label}</button>
  {/each}

  <span class="separator">│</span>

  <label class="toolbar-label">Object:</label>
  {#each objButtons as btn}
    <button
      class="tool-btn"
      class:active={activeObj === btn.obj}
      onclick={() => setObj(btn.obj)}
    >{btn.label}</button>
  {/each}

  <span class="toolbar-spacer"></span>

  <span class="grid-controls">
    Grid:
    <input type="number" bind:value={gridW} min="6" max="40" class="grid-input" />
    ×
    <input type="number" bind:value={gridH} min="6" max="40" class="grid-input" />
    <button class="tool-btn" onclick={resize}>Resize</button>
    <button class="tool-btn" onclick={clear}>Clear</button>
    <button class="tool-btn new-btn" onclick={newStamp}>New</button>
    <button class="tool-btn" onclick={resetStamp} title="Reload the last loaded stamp">Reset Stamp</button>
  </span>
</div>

<style>
  .toolbar {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
    padding: 6px 0;
  }
  .toolbar-label {
    font-size: 0.8rem;
    color: var(--text-dim);
    font-weight: bold;
  }
  .tool-btn {
    padding: 3px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-mid);
    color: var(--text);
    cursor: pointer;
    font-size: 0.8rem;
  }
  .tool-btn.active {
    border-color: var(--accent);
    color: var(--accent);
  }
  .new-btn {
    border-color: #2ecc71;
    color: #2ecc71;
  }
  .separator {
    color: var(--border);
    margin: 0 2px;
  }
  .toolbar-spacer {
    margin-left: auto;
  }
  .grid-controls {
    font-size: 0.85rem;
    color: var(--text-dim);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .grid-input {
    width: 40px;
    background: var(--bg-dark);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 3px;
    padding: 2px 4px;
  }
</style>
