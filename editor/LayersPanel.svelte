<script lang="ts">
  import * as editorState from './state';
  import { renderAll } from './renderer';
  import { buildPalette } from './controls';
  import type { LayerType, LayerState } from './types';

  let { onlayerchange }: { onlayerchange?: () => void } = $props();

  let layers = $state(editorState.layers.map(l => ({ ...l })));
  let activeId = $state<LayerType>(editorState.activeLayer);

  function syncFromState() {
    layers = editorState.layers.map(l => ({ ...l }));
    activeId = editorState.activeLayer;
  }

  function selectLayer(id: LayerType) {
    activeId = id;
    editorState.setActiveLayer(id);
    onlayerchange?.();
    buildPalette();
    renderAll();
    syncFromState();
  }

  function toggleVisibility(id: LayerType) {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    editorState.setLayerVisible(id, !layer.visible);
    renderAll();
    syncFromState();
  }

  function changeOpacity(id: LayerType, value: number) {
    editorState.setLayerOpacity(id, value);
    renderAll();
    syncFromState();
  }

  // Expose refresh for parent
  export function refresh() { syncFromState(); }
</script>

<div class="layers-panel">
  <h4 class="panel-title">Layers</h4>
  <div class="layer-list">
    {#each [...layers].reverse() as layer (layer.id)}
      <div
        class="layer-row"
        class:active={activeId === layer.id}
        onclick={() => selectLayer(layer.id)}
      >
        <button
          class="eye-btn"
          class:off={!layer.visible}
          onclick={(e: MouseEvent) => { e.stopPropagation(); toggleVisibility(layer.id); }}
          title={layer.visible ? 'Hide' : 'Show'}
        >{layer.visible ? '👁' : '👁‍🗨'}</button>
        {#if layer.locked}<span class="lock-icon" title="Editing locked">🔒</span>{/if}
        <span class="layer-name">{layer.label}</span>
        <input
          type="range"
          class="opacity-slider"
          min="0" max="100"
          value={Math.round(layer.opacity * 100)}
          oninput={(e: Event) => changeOpacity(layer.id, parseInt((e.target as HTMLInputElement).value) / 100)}
          onclick={(e: MouseEvent) => e.stopPropagation()}
          title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
        />
      </div>
    {/each}
  </div>
  {#if activeId === 'logic'}
    <div class="logic-legend">
      <span class="legend-title">Logic Types</span>
      <div class="legend-items">
        <span class="legend-item"><span class="swatch" style="background:#22c55e"></span>walkable</span>
        <span class="legend-item"><span class="swatch" style="background:#ef4444"></span>blocked</span>
        <span class="legend-item"><span class="swatch" style="background:#1a1d24; border:1px solid var(--border)"></span>void</span>
      </div>
      <span class="legend-title" style="margin-top:6px">Connector Edges</span>
      <div class="legend-items">
        <span class="legend-item"><span class="swatch" style="background:rgba(34,197,94,0.5); border:2px solid rgba(34,197,94,0.7)"></span>open (no door)</span>
        <span class="legend-item"><span class="swatch" style="background:rgba(56,189,248,0.5); border:2px solid rgba(56,189,248,0.7)"></span>doorable (wall break)</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .layers-panel {
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-mid);
    padding: 6px;
  }
  .panel-title {
    color: var(--accent);
    font-size: 0.8rem;
    margin-bottom: 4px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border);
  }
  .layer-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .layer-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: background 0.1s;
  }
  .layer-row:hover { background: var(--bg-light); }
  .layer-row.active {
    background: var(--bg-light);
    border-left: 3px solid var(--accent);
    padding-left: 3px;
  }
  .eye-btn {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0 2px;
    opacity: 1;
  }
  .eye-btn.off { opacity: 0.3; }
  .lock-icon {
    font-size: 0.7rem;
    opacity: 0.5;
    cursor: default;
  }
  .layer-name { flex: 1; color: var(--text); }
  .logic-legend {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--border);
  }
  .legend-title {
    font-size: 0.7rem;
    color: var(--text-dim);
    display: block;
    margin-bottom: 4px;
  }
  .legend-items {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.7rem;
    color: var(--text);
  }
  .swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }
  .opacity-slider {
    width: 60px;
    height: 14px;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }
  .opacity-slider::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 3px;
    background: var(--bg-dark, #1a1d24);
    border: 1px solid var(--border);
  }
  .opacity-slider::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: var(--bg-dark, #1a1d24);
    border: 1px solid var(--border);
  }
  .opacity-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid var(--bg-mid);
    margin-top: -5px;
    cursor: pointer;
  }
  .opacity-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid var(--bg-mid);
    cursor: pointer;
  }
</style>
