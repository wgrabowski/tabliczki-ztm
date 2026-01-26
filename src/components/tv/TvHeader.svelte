<script lang="ts">
  import Clock from "./Clock.svelte";
  import ThemeToggle from "./ThemeToggle.svelte";

  /**
   * TV Header - Top bar with stop name, clock and theme toggle
   * Designed for large-screen readability
   */

  export let stopName: string;
  export let stopId: number;

  // Fallback if stop name is empty
  $: displayName = stopName || `Tablica ${stopId}`;
</script>

<header class="tv-header theme-outlined">
  <h1 class="tv-header__stop-name">{displayName}</h1>
  <div class="tv-header__clock">
    <Clock />
  </div>
  <div class="tv-header__theme">
    <ThemeToggle />
  </div>
</header>

<style>
  .tv-header {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: calc(var(--theme--spacing) * 4);
    padding: calc(var(--theme--spacing) * 2);
    border-bottom: 2px solid var(--theme--accent-color-dim);
  }

  .tv-header__stop-name {
    margin: 0;

    font-weight: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tv-header__clock {
 
  }

  .tv-header__theme {
    display: flex;
    align-items: center;
  }


  
</style>
