import { writable } from "svelte/store";
import type { Toast } from "../../types";

/**
 * Custom store for managing toast notifications
 * Provides methods for adding and removing toasts
 */
function createToastsStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  return {
    subscribe,
    /**
     * Add a new toast notification
     * Auto-dismisses success/info toasts after 3 seconds
     */
    addToast: (type: Toast["type"], message: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      const autoDismiss = type === "success" || type === "info";
      const toast: Toast = { id, type, message, autoDismiss };

      update((toasts) => [...toasts, toast]);

      // Auto-dismiss after 3 seconds for success/info
      if (autoDismiss) {
        setTimeout(() => {
          update((toasts) => toasts.filter((t) => t.id !== id));
        }, 3000);
      }

      return id;
    },
    /**
     * Remove a toast by ID
     */
    removeToast: (id: string) => {
      update((toasts) => toasts.filter((t) => t.id !== id));
    },
  };
}

export const toastsStore = createToastsStore();
