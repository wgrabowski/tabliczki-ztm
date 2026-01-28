<script lang="ts">
  import { onMount } from "svelte";
  import type { ZtmDepartureDTO } from "@ztm-types";

  /**
   * Single departure item displaying:
   * - Route number (line)
   * - Headsign (direction)
   * - Time (relative/absolute based on status)
   * - Accessibility icons (wheelchair, bike) - TODO when API supports it
   */
  interface Props {
    departure: ZtmDepartureDTO;
  }

  const { departure }: Props = $props();

  let mounted = $state(false);
  let currentTime = $state(new Date());

  // Calculate relative time from estimatedTime
  function getRelativeTime(estimatedTime: string, now: Date): string {
    const estimated = new Date(estimatedTime);
    const diffMs = estimated.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 0) {
      return ">>";
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    } else {
      // Format as HH:mm
      const hours = estimated.getHours().toString().padStart(2, "0");
      const minutes = estimated.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }
  }

  // Update time only on client side
  onMount(() => {
    mounted = true;
    currentTime = new Date();
    
    const interval = setInterval(() => {
      currentTime = new Date();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  });

  const timeDisplay = $derived(
    mounted ? getRelativeTime(departure.estimatedTime, currentTime) : "--"
  );
  const isRealtime = $derived(departure.status === "REALTIME");
  const hasDelay = $derived(
    departure.delayInSeconds && departure.delayInSeconds > 0
  );
  const delayMinutes = $derived(
    hasDelay ? Math.floor(departure.delayInSeconds! / 60) : 0
  );
</script>

<tr class="departure-item">
  <!-- Route Number -->
  <td class="departure-route">
    {departure.routeShortName || "?"}
  </td>

  <!-- Direction (Headsign) -->
  <td class="departure-headsign">
    <span class="departure-headsign-text">{departure.headsign || "—"}</span>
  </td>
  <td>

  </td>

  <!-- Time & Icons -->
  <td class="departure-time" class:realtime={isRealtime}>
   
    
    <!-- Delay Badge (if applicable) -->
    {#if hasDelay}
      <span class="delay-badge" title="Opóźnienie: +{delayMinutes} min">
        +{delayMinutes}
      </span>
    
    {/if}
    <span class="time-display">{timeDisplay}</span>

    <!-- TODO: Accessibility icons when API supports them -->
    <!-- Bike icon: {#if departure.bikeAllowed}<span class="theme-icon">pedal_bike</span>{/if} -->
    <!-- Wheelchair icon: from stop.wheelchairBoarding -->
  </td>
</tr>

<style>
  .departure-item td {
    padding: var(--theme--spacing);
    color: var(--theme--accent-color);
    border-bottom: 1px solid var(--theme--accent-color-dim);
  }

  .departure-route {
    text-align: center;
  }

  .departure-headsign {
    overflow: hidden;
    text-overflow: ellipsis;

    position: relative;
  }

  .departure-headsign-text {
    display: block;
    width: 100%;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: 0;
    z-index: 1;
  }

  .departure-time {
    white-space: nowrap;
  }

  .delay-badge {
    padding: calc(var(--theme--spacing) / 2);
    color: var(--theme--negative);
    background-color: var(--theme--bg-color);
    border: 1px solid var(--theme--negative);
    white-space: nowrap;
    display: none;
  }

 


  /* Accessibility icons - will be used when API supports them */
  /* .theme-icon {
    font-size: 1.25rem;
    color: var(--theme--accent-color);
  } */
</style>
