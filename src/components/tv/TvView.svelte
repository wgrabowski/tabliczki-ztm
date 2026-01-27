<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import TvHeader from "./TvHeader.svelte";
  import TvErrorScreen from "./TvErrorScreen.svelte";
  import DeparturesList from "@components/shared/departures/DeparturesList.svelte";
  import type {
    ZtmDepartureDTO,
    ZtmDeparturesUpstreamResponseDTO,
    ZtmStopDTO,
    ZtmErrorCode,
  } from "@ztm-types";
  import type { ErrorResponse } from "@types";

  /**
   * TV View - Public fullscreen departure board
   * Fetches and displays departures for a single stop
   * Auto-refreshes every 60 seconds
   */

  export let stopId: number;
  export let initialStopName: string = "";

  // State types (inline, minimal)
  type TvError = {
    code: ZtmErrorCode | "NO_DEPARTURES" | "INVALID_STOP" | "NETWORK";
    message: string;
    retryCount: number;
  };

  type FetchStatus = "idle" | "loading" | "success" | "error";

  // State
  let status: FetchStatus = "idle";
  let departures: ZtmDepartureDTO[] = [];
  let lastUpdate = "";
  let error: TvError | null = null;
  let stopName = initialStopName || `Przystanek ${stopId}`;
  let retryCount = 0;
  let autoRefreshInterval: ReturnType<typeof setInterval> | null = null;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;

  // Constants
  const AUTO_REFRESH_INTERVAL = 60000; // 60 seconds
  const RETRY_DELAY = 5000; // 5 seconds
  const MAX_RETRY_COUNT = 3;

  // Computed values
  $: showError = status === "error" || (status === "success" && departures.length === 0);
  $: isLoading = status === "loading";

  /**
   * Fetch departures for the stop
   */
  async function fetchDepartures() {
    try {
      status = "loading";

      const response = await fetch(`/api/ztm/departures?stopId=${stopId}`);

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.message || "Failed to fetch departures");
      }

      const data: ZtmDeparturesUpstreamResponseDTO = await response.json();

      // Check if we got departures
      if (!data.departures || data.departures.length === 0) {
        error = {
          code: "NO_DEPARTURES",
          message: "Brak dostępnych odjazdów dla tego przystanku",
          retryCount,
        };
        status = "error";
        scheduleRetry();
        return;
      }

      // Try to get stop name if not already set
      if (!initialStopName) {
        try {
          const stopsResponse = await fetch(`/api/ztm/stops?stopIds=${stopId}`);
          if (stopsResponse.ok) {
            const stopsData = await stopsResponse.json();
            if (stopsData.stops && stopsData.stops.length > 0) {
              const stop: ZtmStopDTO = stopsData.stops[0];
              stopName = stop.stopName || stopName;
            }
          }
        } catch (err) {
          // Ignore stop name fetch errors
          console.warn("Failed to fetch stop name:", err);
        }
      }

      // Success
      departures = data.departures;
      lastUpdate = data.lastUpdate;
      status = "success";
      retryCount = 0;
      error = null;
    } catch (err) {
      error = {
        code: "NETWORK",
        message: err instanceof Error ? err.message : "Błąd połączenia z serwerem",
        retryCount,
      };
      status = "error";
      scheduleRetry();
    }
  }

  /**
   * Schedule retry after delay
   */
  function scheduleRetry() {
    if (retryCount < MAX_RETRY_COUNT) {
      retryCount++;
      retryTimeout = setTimeout(fetchDepartures, RETRY_DELAY);
    }
  }

  /**
   * Manual reload triggered by user
   */
  function handleReload() {
    retryCount = 0;
    clearTimeout(retryTimeout!);
    fetchDepartures();
  }

  /**
   * Start auto-refresh cycle
   */
  function startAutoRefresh() {
    autoRefreshInterval = setInterval(fetchDepartures, AUTO_REFRESH_INTERVAL);
  }

  /**
   * Stop auto-refresh cycle
   */
  function stopAutoRefresh() {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
  }

  // Lifecycle
  onMount(() => {
    fetchDepartures();
    startAutoRefresh();
  });

  onDestroy(() => {
    stopAutoRefresh();
    if (retryTimeout) {
      clearTimeout(retryTimeout);
    }
  });
</script>

<div class="tv-view">
  <div class="tv-view__last-update">
    Ostatnia aktualizacja: {new Date(lastUpdate).toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    })}
  </div>
  <TvHeader {stopName} {stopId} />

  <main class="tv-view__content">
    {#if showError}
      <TvErrorScreen
        error={error || {
          code: "NO_DEPARTURES",
          message: "Brak dostępnych odjazdów",
          retryCount,
        }}
        onReload={handleReload}
        {isLoading}
      />
    {:else if status === "success" && departures.length > 0}
      <div class="tv-view__departures">

        <DeparturesList {departures} paginationDisabled={true} isTvMode={true} />
  
      </div>
    {/if}
  </main>
</div>

<style>
  .tv-view {
    display: grid;
    grid-template-rows: auto auto 1fr;
    height: 100vh;
    width: 100vw;
    background-color: var(--theme--bg-color);
    color: var(--theme--accent-color);
  }

  .tv-view__content {
    display: flex;
    flex-direction: column;
    padding: var(--theme--spacing);
    overflow: hidden;
  }

  .tv-view__departures {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .tv-view__last-update {
    margin-top: var(--theme--spacing);
    text-align: center;
    font-size: 1.5rem;
    color: var(--theme--accent-color-dim);
  }
</style>
