import { writable } from "svelte/store";

/**
 * Global loading store for full-screen preloader
 * Used during POST (create) and DELETE operations
 */
export const globalLoadingStore = writable<boolean>(false);

/**
 * Helper function to set global loading state
 */
export function setGlobalLoading(isLoading: boolean) {
  globalLoadingStore.set(isLoading);
}
