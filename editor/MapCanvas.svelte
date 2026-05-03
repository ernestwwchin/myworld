<script lang="ts">
  import { onMount } from 'svelte';
  import { setupCanvasEvents } from './controls';

  onMount(() => {
    setupCanvasEvents();
  });
</script>

<div class="canvas-col">
  <div class="canvas-wrap">
    <canvas id="edCanvas" style="image-rendering:pixelated;cursor:crosshair;"></canvas>
  </div>
</div>

<style>
  .canvas-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .canvas-wrap {
    flex: 1;
    overflow: auto;
    background: #111318;
    border: 1px solid var(--border);
    border-radius: 4px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 8px;
  }
  .canvas-wrap canvas {
    max-width: 100%;
    height: auto;
  }
</style>
