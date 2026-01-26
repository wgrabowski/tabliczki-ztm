<script lang="ts">
  /**
   * Ticker component for special messages (marquee animation)
   * Currently a placeholder - will be activated when API returns messages
   */
  export let message: string | null;
</script>

{#if message}
  <div class="ticker">
    <div class="ticker-content">
      <span class="ticker-text">{message}</span>
    </div>
  </div>
{/if}

<style>
  .ticker {
    background: var(--theme--accent-color);
    color: var(--theme--bg-color);
    padding: var(--theme--spacing);
    overflow: hidden;
    border-top: 1px solid var(--theme--accent-color-dim);
  }

  .ticker-content {
    display: flex;
    width: 100%;
  }

  .ticker-text {
    display: inline-block;
    white-space: nowrap;
    animation: ticker-scroll 20s linear infinite;
  }

  @keyframes ticker-scroll {
    0% {
      transform: translateX(100%);
    }
    100% {
      transform: translateX(-100%);
    }
  }

  /* Pause animation on hover */
  .ticker:hover .ticker-text {
    animation-play-state: paused;
  }
</style>
