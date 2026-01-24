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
  export let variant: "default" | "tv" = "default";

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

<tr class="departure-item" class:tv-variant={variant === "tv"}>
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
    <span class="time-display">{timeDisplay}</span>
    
    <!-- Delay Badge (if applicable) -->
    {#if hasDelay}
      <span class="delay-badge" title="Opóźnienie: +{delayMinutes} min">
        +{delayMinutes}
      </span>
    {/if}

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
    font-size: 0.75rem;
    padding: calc(var(--theme--spacing) / 2);
    background: var(--theme--negative);
    color: var(--theme--bg-color);
    border: 1px solid var(--theme--negative);
    white-space: nowrap;
  }

  /* TV Variant - Larger fonts */
  .tv-variant td {
    padding: calc(var(--theme--spacing) * 2);
    font-size: 1.75rem;
    border-bottom: 2px solid var(--theme--accent-color-dim);
  }

  .tv-variant .delay-badge {
    font-size: 1.25rem;
    padding: var(--theme--spacing);
  }

  /* Large screen optimizations for TV */
  @media (min-width: 1200px) {
    .tv-variant td {
      font-size: 2.25rem;
      padding: calc(var(--theme--spacing) * 3);
    }

    .tv-variant .delay-badge {
      font-size: 1.5rem;
    }
  }

  /* Accessibility icons - will be used when API supports them */
  /* .theme-icon {
    font-size: 1.25rem;
    color: var(--theme--accent-color);
  } */
</style>
