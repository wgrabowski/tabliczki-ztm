<script lang="ts">
  import Card from "./base/Card.svelte";
  import IconButton from "./base/IconButton.svelte";
  import StateInfo from "./base/StateInfo.svelte";
  import DeparturesList from "./DeparturesList.svelte";
  import Ticker from "./Ticker.svelte";
  import type { ZtmStopDTO, ZtmDepartureDTO, ZtmSetStopDeparturesErrorDTO } from "../ztm-types";

  /**
   * Stop card displaying departures for a single stop
   * Supports 4 content states: loading, error, global error, ready
   */
  export let stopId: number;
  export let itemId: string; // UUID set_item
  export let stop: ZtmStopDTO | null;
  export let position: number; // Position in set (for future use)
  export let departures: ZtmDepartureDTO[] | null; // null during loading
  export let error: ZtmSetStopDeparturesErrorDTO | null; // error for this specific stop
  export let hasGlobalError: boolean; // true if errorCount >= 3
  export let onDelete: (itemId: string) => void;
  export let onOpenTv: (stopId: number) => void;

  // Suppress unused warning - position may be used for sorting/display in future
  $: void position;

  // Card title: stop name + code
  $: cardTitle = stop 
    ? `${stop.stopName || stop.stopId} ${stop.stopCode ? `(${stop.stopCode})` : ''}`
    : `Przystanek ${stopId}`;

  // Ticker message (placeholder - will be populated when API supports it)
  $: tickerMessage = null; // TODO: Extract from departures data when available

  // Determine content state
  $: isLoading = departures === null && error === null;
  $: hasError = error !== null;
</script>

<Card title={cardTitle} noPadding>
  <!-- Header Actions Slot -->
  <div slot="actions">
    <IconButton 
    size="small"
      icon="tv" 
      title="Otwórz w trybie TV" 
      onClick={() => onOpenTv(stopId)}
    />
  </div>

  <!-- Header Delete Slot -->
  <div slot="deleteAction">
    <IconButton 
    size="small"
      icon="delete" 
      title="Usuń przystanek" 
      onClick={() => onDelete(itemId)}
    />
  </div>

  <!-- Content (state-dependent) -->
    {#if isLoading}
      <!-- Loading State: Skeleton -->
     <StateInfo type="info" text="Ładowanie odjazdów..." />

    {:else if hasGlobalError}
      <!-- Global Error State -->
      <StateInfo 
        type="error" 
        text="Nie można pobrać danych odjazdów.<br>Spróbuj odświeżyć stronę." 
      />

    {:else if hasError}
      <!-- Per-Card Error State -->
      <StateInfo 
        type="warning" 
        text="Nie można załadować odjazdów dla tego przystanku." 
        details={error?.message || null}
      />

    {:else if departures}
      <!-- Ready State: Departures List -->
      {#if departures.length > 0}
        <DeparturesList {departures} />
      {:else}
        <StateInfo type="info" text="Brak odjazdów" />
      {/if}

      <!-- Ticker (if message exists) -->
      {#if tickerMessage}
        <Ticker message={tickerMessage} />
      {/if}
    {/if}

</Card>

<style>
  /* Loading State */
  .skeleton-container {
    display: flex;
    flex-direction: column;
    gap: var(--theme--spacing);
  }

  .loading-message {
    margin: 0 0 var(--theme--spacing) 0;
    font-size: 0.875rem;
    color: var(--theme--accent-color);
    text-align: center;
  }


  @keyframes skeleton-pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

</style>
