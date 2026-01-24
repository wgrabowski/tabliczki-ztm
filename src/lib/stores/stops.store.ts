import { writable } from "svelte/store";
import type { ZtmStopDTO } from "../../ztm-types";

/**
 * State for stops store
 * Implements progressive loading with lazy initialization
 */
type StopsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; stops: ZtmStopDTO[] }
  | { status: "error"; error: string };

/**
 * Store for ZTM stops data with lazy loading
 *
 * Strategy:
 * - Loads data only when needed (lazy initialization)
 * - Prevents duplicate requests
 * - Supports retry on error
 * - Used by AddStopDialog for Autocomplete
 *
 * Usage:
 * ```ts
 * import { stopsStore } from '$lib/stores/stops.store';
 *
 * // In onMount or when dialog opens
 * stopsStore.load();
 *
 * // In component
 * $: stopsState = $stopsStore;
 *
 * // On error, retry
 * stopsStore.retry();
 * ```
 */
function createStopsStore() {
  const { subscribe, set, update } = writable<StopsState>({ status: "idle" });

  // Track ongoing fetch to prevent duplicates
  let fetchPromise: Promise<void> | null = null;

  return {
    subscribe,

    /**
     * Load stops data from API
     * Prevents duplicate requests if already loading
     * @returns Promise that resolves when loading completes
     */
    async load(): Promise<void> {
      // Prevent duplicate requests
      if (fetchPromise) {
        return fetchPromise;
      }

      // Only start loading if idle
      update((state) => (state.status === "idle" ? { status: "loading" } : state));

      fetchPromise = fetch("/api/ztm/stops")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          set({ status: "ready", stops: data.stops });
        })
        .catch((err) => {
          const errorMessage = err instanceof Error ? err.message : "Failed to fetch stops";
          set({ status: "error", error: errorMessage });
        })
        .finally(() => {
          fetchPromise = null;
        });

      return fetchPromise;
    },

    /**
     * Reset store to idle and retry loading
     * @returns Promise from load()
     */
    retry(): Promise<void> {
      set({ status: "idle" });
      return this.load();
    },

    /**
     * Reset store to idle state
     * Useful for cleanup or testing
     */
    reset(): void {
      set({ status: "idle" });
      fetchPromise = null;
    },
  };
}

export const stopsStore = createStopsStore();
