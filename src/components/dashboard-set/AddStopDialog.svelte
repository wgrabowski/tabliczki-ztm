<script lang="ts">
  import Modal from "@components/base/Modal.svelte";
  import Button from "@components/base/Button.svelte";
  import Autocomplete from "@components/base/Autocomplete.svelte";
  import type { AutocompleteItem } from "@components/base/Autocomplete.svelte";
  import { stopsStore } from "@stores/stops.store";
  import { toastsStore } from "@stores/toasts.store";
  import { setGlobalLoading } from "@stores/global-loading.store";
  import type { CreateSetItemResponse } from "@types";

  /**
   * Dialog for adding a new stop to the set
   * Integrates with stopsStore for lazy loading
   * Uses Autocomplete for stop selection
   */
  export let isOpen: boolean = false;
  export let setId: string;
  export let onClose: () => void;
  export let onSuccess: (response: CreateSetItemResponse) => void;

  // Access store state
  $: stopsState = $stopsStore;

  // Local state
  let selectedStopId: number | null = null;
  let searchQuery: string = "";

  // When dialog opens, check if we need to load stops
  $: if (isOpen && (stopsState.status === "idle" || stopsState.status === "error")) {
    stopsStore.load();
  }

  // Reset state when dialog closes
  $: if (!isOpen) {
    selectedStopId = null;
    searchQuery = "";
  }

  // Transform stops for Autocomplete
  let autocompleteItems: AutocompleteItem[] = [];
  $: {
    if (stopsState.status === "ready") {
      autocompleteItems = stopsState.stops.map((stop) => ({
        id: stop.stopId,
        label: `${(stop.stopShortname?.toString() || stop.stopName || stop.stopDesc)} (${stop.stopCode}) `,
        secondaryLabel: `${stop.type} ${stop.stopDesc}`,
        searchableText: `${stop.stopShortname || ""} ${stop.stopCode || ""} ${stop.stopName || ""} ${stop.stopDesc || "" }`,
      }));
    } else {
      autocompleteItems = [];
    }
  }

  // Handle stop selection from autocomplete
  function handleStopSelect(item: AutocompleteItem) {
    selectedStopId = item.id as number;
  }

  // Handle form submit
  async function handleSubmit() {
    if (selectedStopId === null) {
      toastsStore.addToast("warning", "Wybierz przystanek z listy");
      return;
    }

    setGlobalLoading(true);

    try {
      const response = await fetch(`/api/sets/${setId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stop_id: selectedStopId }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle specific error codes
        if (response.status === 409) {
          throw new Error("Przystanek już istnieje w zestawie");
        } else if (error.code === "MAX_ITEMS_PER_SET_EXCEEDED") {
          throw new Error("Osiągnięto maksymalną liczbę przystanków (6)");
        } else {
          throw new Error(error.message || "Nie udało się dodać przystanku");
        }
      }

      const data: CreateSetItemResponse = await response.json();

      // Success
      toastsStore.addToast("success", "Przystanek dodany");
      onSuccess(data);
      onClose();

    } catch (error) {
      console.error("Failed to add stop:", error);
      toastsStore.addToast(
        "error",
        error instanceof Error ? error.message : "Nie udało się dodać przystanku"
      );
    } finally {
      setGlobalLoading(false);
    }
  }

  // Handle retry button click
  function handleRetry() {
    stopsStore.retry();
  }
</script>

<Modal {isOpen} title="Dodaj przystanek" onClose={onClose}>
  {#if stopsState.status === "loading"}
    <!-- Loading State: Skeleton -->
    <div class="loading-state">
      <div class="loading-spinner">
        <span class="theme-icon spinning">progress_activity</span>
      </div>
      <p class="loading-message">Ładowanie przystanków...</p>
      
      <!-- Skeleton for autocomplete -->
      <div class="skeleton-autocomplete">
        <div class="skeleton-input"></div>
      </div>
    </div>

  {:else if stopsState.status === "error"}
    <!-- Error State -->
    <div class="error-state">
      <span class="theme-icon error-icon">error</span>
      <p class="error-message">
        Nie udało się załadować listy przystanków.
      </p>
      <p class="error-details">{stopsState.error}</p>
    </div>

  {:else if stopsState.status === "ready"}
    <!-- Ready State: Autocomplete -->
    <Autocomplete
      bind:value={searchQuery}
      items={autocompleteItems}
      placeholder="Wpisz nazwę lub kod przystanku..."
      minChars={1}
      maxResults={6}
      debounceMs={300}
      onSelect={handleStopSelect}
    />

    {#if selectedStopId !== null}
      {@const selectedItem = autocompleteItems.find((item) => item.id === selectedStopId)}
      {#if selectedItem}
        <p class="selected-info">
          Wybrany przystanek: <strong>{selectedItem.label}</strong>
        </p>
      {/if}
    {/if}
  {/if}

  <div slot="footer" class="footer-actions">
    {#if stopsState.status === "error"}
      <Button variant="primary" onClick={handleRetry}>
        <span class="button-content">
          <span class="theme-icon">refresh</span>
          <span>Spróbuj ponownie</span>
        </span>
      </Button>
      <Button variant="secondary" onClick={onClose}>
        Zamknij
      </Button>
    {:else if stopsState.status === "ready"}
      <Button 
        variant="primary" 
        onClick={handleSubmit}
        disabled={selectedStopId === null}
      >
        Dodaj
      </Button>
      <Button variant="secondary" onClick={onClose}>
        Anuluj
      </Button>
    {/if}
  </div>
</Modal>

<style>
  /* Loading State */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--theme--spacing);
  }

  .loading-spinner {
    font-size: 2rem;
    color: var(--theme--accent-color);
  }

  .loading-spinner :global(.theme-icon.spinning) {
    display: inline-block;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .loading-message {
    margin: 0;
    color: var(--theme--accent-color);
  }

  .skeleton-autocomplete {
    width: 100%;
    margin-top: var(--theme--spacing);
  }

  .skeleton-input {
    height: 2.5em;
    background: var(--theme--accent-color-dim);
    border: 1px solid var(--theme--accent-color-dim);
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  @keyframes skeleton-pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  /* Error State */
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--theme--spacing);
    text-align: center;
  }

  .error-icon {
    font-size: 2rem;
    color: var(--theme--negative);
  }

  .error-message {
    margin: 0;
    color: var(--theme--accent-color);
  }

  .error-details {
    margin: 0;
    font-size: 0.875rem;
    color: var(--theme--accent-color-dim);
  }

  /* Ready State */
  .selected-info {
    margin: calc(var(--theme--spacing) * 2) 0 0 0;
    padding: var(--theme--spacing);
    background: var(--theme--accent-color-dim);
    color: var(--theme--bg-color);
    font-size: 0.875rem;
  }

  /* Footer */
  .footer-actions {
    display: flex;
    gap: var(--theme--spacing);
    justify-content: flex-end;
  }

  .button-content {
    display: flex;
    align-items: center;
    gap: var(--theme--spacing);
  }
</style>
