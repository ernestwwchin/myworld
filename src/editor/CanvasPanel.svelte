<script lang="ts">
  import { onMount } from 'svelte';
  import { setupTileCanvasEvents, setupLogicCanvasEvents } from './controls';

  let tileCanvasEl: HTMLCanvasElement;
  let logicCanvasEl: HTMLCanvasElement;

  onMount(() => {
    setupTileCanvasEvents();
    setupLogicCanvasEvents();
  });
</script>

<div class="canvas-row">
  <div class="canvas-col">
    <div class="canvas-label">Tile View
      <span class="canvas-hint">click to place objects · palette overrides visual</span>
    </div>
    <div class="canvas-wrap">
      <canvas id="edTileCanvas" bind:this={tileCanvasEl} style="image-rendering:pixelated;cursor:crosshair;"></canvas>
    </div>
  </div>
  <div class="canvas-col">
    <div class="canvas-label">Logic View
      <span class="canvas-hint">click to set · 🟩walk 🟥block ⬛void 🟦door</span>
    </div>
    <div class="canvas-wrap">
      <canvas id="edLogicCanvas" bind:this={logicCanvasEl} style="image-rendering:pixelated;cursor:crosshair;"></canvas>
    </div>
  </div>
</div>

<style>
  .canvas-row {
    display: flex;
    gap: 12px;
    flex: 1;
    min-height: 0;
  }
  .canvas-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .canvas-label {
    font-size: 0.85rem;
    color: var(--accent);
    margin-bottom: 4px;
    font-weight: bold;
  }
  .canvas-hint {
    font-weight: normal;
    color: var(--text-dim);
    font-size: 0.7rem;
    margin-left: 6px;
  }
  .canvas-wrap {
    flex: 1;
    overflow: auto;
    background: var(--bg-dark);
    border: 1px solid var(--border);
    border-radius: 6px;
  }
</style>
