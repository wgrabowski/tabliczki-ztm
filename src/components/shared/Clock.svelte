<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  /**
   * Clock component displaying current time (HH:MM)
   * Updates every minute
   */

  let currentTime = "--:--";// initial value to prevent layout shift
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function updateTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    currentTime = `${hours}:${minutes}`;
  }

  onMount(() => {
    updateTime(); // Initial update
    intervalId = setInterval(updateTime, 60000); // Update every minute
  });

  onDestroy(() => {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  });
</script>

<time class="clock" data-testid="clock">{currentTime}</time>

<style>
  .clock {
    font-size: 2rem;
    color: var(--theme--accent-color);
    font-variant-numeric: tabular-nums;
  }
</style>
