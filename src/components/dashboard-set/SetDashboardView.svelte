<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type {
    SetDashboardState,
    SetItemDTO,
    SetDTO,
    CreateSetItemResponse,
  } from "@types";
  import type { GetZtmSetDeparturesResponse } from "@ztm-types";
  import { toastsStore } from "@stores/toasts.store";
  import { setGlobalLoading } from "@stores/global-loading.store";
  import { stopsStore } from "@stores/stops.store";
  import DashboardGrid from "@components/shared/DashboardGrid.svelte";
  import ConfirmDialog from "@components/shared/ConfirmDialog.svelte";
  import RefreshProgressBar from "./RefreshProgressBar.svelte";
  import StopCard from "./StopCard.svelte";
  import AddStopButton from "./AddStopButton.svelte";
  import AddStopDialog from "./AddStopDialog.svelte";

  // ============================================================================
  // Configuration
  // ============================================================================

  const REFRESH_INTERVAL_SECONDS = 60; // Time between departures refreshes

  // ============================================================================
  // Props (Initial Data from SSR)
  // ============================================================================

  export let setId: string;
  export let initialItems: SetItemDTO[];
  // Note: sets prop removed - used directly in parent .astro for SetSelect

  // Note: departures are NOT passed as props - loaded in onMount() without blocking
  // Note: stops metadata is NOT passed as props - loaded in onMount() without blocking
  // Note: header-left components are rendered in parent .astro file

  // ============================================================================
  // Local State
  // ============================================================================

  let state: SetDashboardState = {
    items: initialItems,
    departuresData: null, // Loaded in onMount()
    stopsData: {}, // Loaded in onMount()
    errorCount: 0,
    isRefreshing: false,
    isInitialLoad: true, // True until first departures load
    isCycleStopped: false,
    isAddDialogOpen: false,
    confirmDialog: {
      isOpen: false,
      title: "",
      message: "",
      onConfirm: () => {},
    },
  };

  let progressAnimationKey = 0; // Used to restart CSS animation

  let refreshIntervalId: ReturnType<typeof setInterval> | null = null;
  let visibilityChangeHandler: (() => void) | null = null;

  // ============================================================================
  // Lifecycle: Mount
  // ============================================================================

  onMount(async () => {
    // 1. Start loading stops in background (for AddStopDialog)
    stopsStore.load(); // Lazy loading - doesn't block rendering

    // 2. Load stops metadata (for StopCards)
    // ONLY if there are items in the set
    if (state.items.length > 0) {
      loadStops();
    }

    // 3. Load initial departures data WITHOUT waiting (doesn't block rendering)
    // ONLY if there are items in the set
    if (state.items.length > 0) {
      loadDeparturesAndStartCycle();
    }

    // 4. Setup Page Visibility API - pause cycle when tab is hidden
    visibilityChangeHandler = handleVisibilityChange;
    document.addEventListener("visibilitychange", visibilityChangeHandler);
  });

  // ============================================================================
  // Lifecycle: Destroy
  // ============================================================================

  onDestroy(() => {
    // Cleanup interval and listener
    if (refreshIntervalId !== null) {
      clearInterval(refreshIntervalId);
    }
    if (visibilityChangeHandler) {
      document.removeEventListener("visibilitychange", visibilityChangeHandler);
    }
  });

  // ============================================================================
  // Reactive: Pause/Resume cycle based on dialogs and tab visibility
  // ============================================================================

  // Pause cycle when dialogs are open
  $: isDialogOpen = state.isAddDialogOpen || state.confirmDialog.isOpen;
  
  $: {
    // Guard: only run in browser (document is not available during SSR)
    if (typeof document !== 'undefined') {
      if (isDialogOpen) {
        // Dialog opened - pause cycle
        stopRefreshCycle();
      } else if (!document.hidden && !state.isCycleStopped && state.items.length > 0) {
        // Dialog closed, tab visible, cycle not stopped, and has items - resume cycle
        // Only resume if we have departures data loaded
        if (state.departuresData !== null && refreshIntervalId === null) {
          startRefreshCycle();
        }
      }
    }
  }

  // ============================================================================
  // Refresh Cycle Functions
  // ============================================================================

  async function loadDeparturesAndStartCycle() {
    // Load departures data
    await refreshDepartures();

    // Start refresh cycle ONLY after first successful load
    if (state.departuresData !== null) {
      startRefreshCycle();
    }
  }

  function startRefreshCycle() {
    // Clear any existing timeout
    if (refreshIntervalId !== null) {
      clearTimeout(refreshIntervalId);
    }
    
    // Use setTimeout for exact delay
    refreshIntervalId = setTimeout(() => {
      refreshDepartures();
    }, REFRESH_INTERVAL_SECONDS * 1000); // Convert seconds to milliseconds
  }

  function stopRefreshCycle() {
    if (refreshIntervalId !== null) {
      clearTimeout(refreshIntervalId);
      refreshIntervalId = null;
    }
  }

  async function refreshDepartures() {
    state.isRefreshing = true;

    try {
      const response = await fetch(`/api/ztm/sets/${setId}/departures`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: GetZtmSetDeparturesResponse = await response.json();

      // Success
      state.departuresData = data;
      state.isInitialLoad = false;
      state.errorCount = 0;
      
      // Restart progress animation
      progressAnimationKey++;

    } catch (error) {
      // Error handling with escalation
      state.errorCount++;

      if (state.errorCount === 1) {
        toastsStore.addToast("warning", "Problem z odświeżeniem danych. Spróbujemy ponownie za minutę.");
      } else if (state.errorCount === 2) {
        toastsStore.addToast("warning", "Ponowny problem z danymi. Sprawdź połączenie.");
      } else if (state.errorCount >= 3) {
        toastsStore.addToast("error", "Nie można pobrać danych odjazdów");
        state.isCycleStopped = true;
        stopRefreshCycle();
        state.isRefreshing = false;
        return; // Don't restart cycle
      }

      console.error("Failed to refresh departures:", error);
      
      // Restart progress animation even on error
      progressAnimationKey++;
    } finally {
      state.isRefreshing = false;
      
      // Schedule next refresh if cycle is not stopped
      if (!state.isCycleStopped) {
        startRefreshCycle();
      }
    }
  }

  function handleVisibilityChange() {
    // Guard: should never happen since this is only called from browser event, but be safe
    if (typeof document !== 'undefined') {
      if (document.hidden) {
        // Tab is hidden - stop refresh cycle
        stopRefreshCycle();
      } else {
        // Tab is visible again - fetch latest data and restart cycle
        state.errorCount = 0; // Reset error count on return
        loadDeparturesAndStartCycle();
      }
    }
  }

  // ============================================================================
  // User Actions
  // ============================================================================

  function handleReloadPage() {
    window.location.reload();
  }

  function handleSetChange(newSetId: string) {
    // Navigate to new set
    window.location.href = `/dashboard/${newSetId}`;
  }

  function handleAddStop() {
    state.isAddDialogOpen = true;
  }

  async function handleAddStopSuccess(response: CreateSetItemResponse) {
    // Update items list
    state.items = response.items;

    // Load updated stops data with the new stop
    await loadStops();

    // If this was the first item added, start the cycle
    if (response.items.length === 1) {
      await loadDeparturesAndStartCycle();
    } else {
      // Otherwise just refresh departures to get data for new stop
      await refreshDepartures();
    }
  }

  function handleDeleteStop(itemId: string, stopName: string) {
    state.confirmDialog = {
      isOpen: true,
      title: "Usunąć przystanek?",
      message: `Czy na pewno chcesz usunąć przystanek ${stopName} z zestawu?`,
      onConfirm: () => executeDeleteStop(itemId),
    };
  }

  async function executeDeleteStop(itemId: string) {
    setGlobalLoading(true);

    // Find stop_id before deleting (we'll need it to clean up departures data)
    const itemToDelete = state.items.find(i => i.id === itemId);
    const stopIdKey = itemToDelete?.stop_id.toString();

    try {
      const response = await fetch(`/api/sets/${setId}/items/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete stop");
      }

      const data = await response.json();

      // Update items list
      state.items = data.items;

      // Remove departures/error for deleted item
      if (state.departuresData && stopIdKey) {
        if (state.departuresData.ok) {
          delete state.departuresData.data[stopIdKey];
        } else {
          delete state.departuresData.error[stopIdKey];
        }
      }

      // If all items were removed, stop the cycle
      if (data.items.length === 0) {
        stopRefreshCycle();
        state.departuresData = null;
        state.isInitialLoad = true;
      }

      toastsStore.addToast("success", "Przystanek usunięty");

    } catch (error) {
      console.error("Failed to delete stop:", error);
      toastsStore.addToast("error", error instanceof Error ? error.message : "Nie udało się usunąć przystanku");
    } finally {
      setGlobalLoading(false);
      state.confirmDialog.isOpen = false;
    }
  }

  function handleOpenTv(stopId: number) {
    window.open(`/tv/${stopId}`, "_blank");
  }



  async function loadStops() {
    try {
      const response = await fetch(`/api/ztm/sets/${setId}/stops`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: import("@ztm-types").GetZtmSetStopsResponse = await response.json();

      // Convert string keys to numbers for compatibility with item.stop_id
      state.stopsData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [Number(key), value as import("@ztm-types").ZtmStopDTO | null])
      ) as Record<number, import("@ztm-types").ZtmStopDTO | null>;

    } catch (error) {
      console.error("Failed to load stops:", error);
      // Don't show toast - this is a background operation
      // Stop names will just be missing from the UI but won't break functionality
    }
  }
</script>

<!-- Main Content (header-left is handled in .astro file) -->
<div class="set-dashboard">
    <!-- Progress Bar or Retry CTA (only show when there are items) -->
    {#if state.items.length > 0}
      {#if state.isCycleStopped}
        <div class="retry-section">
          <p class="error-message">Nie można pobrać danych odjazdów</p>
          <button class="retry-button theme-filled theme-clickable theme-focusable" on:click={handleReloadPage}>
            <span class="theme-icon">refresh</span>
            Spróbuj ponownie
          </button>
        </div>
      {:else}
        <RefreshProgressBar 
          isRefreshing={state.isRefreshing}
          animationKey={progressAnimationKey}
          refreshIntervalSeconds={REFRESH_INTERVAL_SECONDS}
        />
      {/if}
    {/if}


    <!-- Dashboard Grid -->
    <DashboardGrid>
      <!-- Stop Cards -->
      {#each state.items as item (item.id)}
        {@const stopData = state.stopsData[item.stop_id]}
        {@const stopIdKey = item.stop_id.toString()}
        {@const departures = state.departuresData?.ok ? (state.departuresData.data[stopIdKey] || null) : null}
        {@const error = state.departuresData?.ok === false ? (state.departuresData.error[stopIdKey] || null) : null}
        
        <StopCard
          stopId={item.stop_id}
          itemId={item.id}
          stop={stopData || null}
          position={item.position}
          departures={departures}
          error={error}
          hasGlobalError={state.isCycleStopped}
          onDelete={(itemId) => handleDeleteStop(itemId, stopData?.stopShortname?.toString() || `${item.stop_id}`)}
          onOpenTv={handleOpenTv}
        />
      {/each}

      <!-- Add Stop Button (visible when < 6 items) -->
      {#if state.items.length < 6}
        <AddStopButton onClick={handleAddStop} />
      {/if}
    </DashboardGrid>

    <!-- Add Stop Dialog -->
    <AddStopDialog
      isOpen={state.isAddDialogOpen}
      {setId}
      onClose={() => { state.isAddDialogOpen = false; }}
      onSuccess={handleAddStopSuccess}
    />
    
    <!-- Confirm Dialog -->
    <ConfirmDialog
      isOpen={state.confirmDialog.isOpen}
      title={state.confirmDialog.title}
      message={state.confirmDialog.message}
      onConfirm={state.confirmDialog.onConfirm}
      onCancel={() => { state.confirmDialog.isOpen = false; }}
    />
</div>

<style>

  .retry-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--theme--spacing);
    padding: var(--theme--spacing);
    margin-bottom: var(--theme--spacing);
  }

  .error-message {
    color: var(--theme--negative);
  }

  .retry-button {
    display: flex;
    align-items: center;
    gap: var(--theme--spacing);
    padding: var(--theme--spacing);
    border: 1px solid var(--theme--accent-color-dim);
    cursor: pointer;
  }
</style>
