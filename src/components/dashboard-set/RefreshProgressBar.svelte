<script lang="ts">
  /**
   * Progress bar for refresh countdown
   * Shows determinate progress during countdown, indeterminate during fetch
   * Uses CSS animation for smooth progress without JavaScript updates
   */
  export let isRefreshing: boolean; // true during fetch
  export let animationKey: number; // Changes to restart animation
  export let refreshIntervalSeconds: number = 60; // Duration of the countdown


</script>

<div class="refresh-progress-bar">
  <div class="progress-container theme-outlined">
    {#if isRefreshing}
      <!-- Indeterminate mode during fetch -->
      <div class="progress-fill indeterminate"></div>
    {:else}
      <!-- Determinate mode with CSS animation -->
      <div 
        class="progress-fill"
        data-animating="true"
        data-key={animationKey}
        style="--animation-duration: {refreshIntervalSeconds}s"
      ></div>
    {/if}
  </div>
  </div>

<style>
  .refresh-progress-bar {
    display: flex;
    flex-direction: column;
    gap: var(--theme--spacing);
    padding: var(--theme--spacing) 0;
  }

  /* Container uses <outlined> style - empty state */
  .progress-container {
    width: 100%;
    height: 1em;
    position: relative;
    overflow: hidden;
    /* outlined: bg-color background, accent-color-dim border */
    background: var(--theme--bg-color);
    border: 1px solid var(--theme--accent-color-dim);
  }

  /* Fill uses <filled> style - full state */
  .progress-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 0%;
    /* filled: accent-color-dim background */
    background: var(--theme--accent-color-dim);
  }

  /* Determinate animation - countdown with configurable duration */
  .progress-fill[data-animating="true"] {
    animation: progress-countdown var(--animation-duration, 60s) linear forwards;
  }

  @keyframes progress-countdown {
    from {
      width: 0%;
    }
    to {
      width: 100%;
    }
  }

  /* Indeterminate animation */
  .progress-fill.indeterminate {
    width: 50%;
    animation: indeterminate-progress 1.5s infinite linear;
  }

  @keyframes indeterminate-progress {
    0% {
      left: -50%;
    }
    100% {
      left: 100%;
    }
  }
</style>
