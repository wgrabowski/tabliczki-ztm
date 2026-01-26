<script lang="ts">
  import type { ZtmDepartureDTO } from "../ztm-types";

  /**
   * Single departure item displaying:
   * - Route number (line)
   * - Headsign (direction)
   * - Time (relative/absolute based on status)
   * - Accessibility icons (wheelchair, bike) - TODO when API supports it
   */
  export let departure: ZtmDepartureDTO;

  // Calculate relative time from estimatedTime
  function getRelativeTime(estimatedTime: string): string {
    const now = new Date();
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

  $: timeDisplay = getRelativeTime(departure.estimatedTime);
  $: isRealtime = departure.status === "REALTIME";
  $: hasDelay = departure.delayInSeconds && departure.delayInSeconds > 0;
  $: delayMinutes = hasDelay ? Math.floor(departure.delayInSeconds! / 60) : 0;
</script>

<tr class="departure-item">
  <!-- Route Number -->
  <td class="departure-route">
    {departure.routeShortName || "?"}
  </td>

  <!-- Direction (Headsign) -->
  <td class="departure-headsign">
    {departure.headsign || "—"}
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
    white-space: nowrap;
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
