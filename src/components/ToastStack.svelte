<script lang="ts">
  import { toastsStore } from "../lib/stores/toasts.store";
  import type { Toast } from "../types";

  /**
   * Toast notifications container
   * Subscribes to toastsStore
   */
  $: toasts = $toastsStore;

  function handleClose(id: string) {
    toastsStore.removeToast(id);
  }

  function getToastIcon(type: Toast["type"]): string {
    switch (type) {
      case "success":
        return "check_circle";
      case "error":
        return "error";
      case "warning":
        return "warning";
      case "info":
        return "info";
      default:
        return "info";
    }
  }
</script>

<div class="toast-stack" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <div
      class="toast theme-noradius"
      class:toast--success={toast.type === "success"}
      class:toast--error={toast.type === "error"}
      class:toast--warning={toast.type === "warning"}
      class:toast--info={toast.type === "info"}
      role="alert"
    >
      <span class="toast__icon theme-icon" aria-hidden="true">
        {getToastIcon(toast.type)}
      </span>
      <p class="toast__message">{toast.message}</p>
      {#if !toast.autoDismiss}
        <button
          class="toast__close theme-clickable"
          on:click={() => handleClose(toast.id)}
          aria-label="Zamknij powiadomienie"
        >
          <span class="theme-icon">close</span>
        </button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .toast-stack {
    position: fixed;
    top: calc(var(--theme--spacing) * 2);
    right: calc(var(--theme--spacing) * 2);
    display: flex;
    flex-direction: column;
    gap: var(--theme--spacing);
    z-index: 9998;
    max-width: 400px;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--theme--spacing);
    padding: var(--theme--spacing) calc(var(--theme--spacing) * 2);
    border: 2px solid;
    animation: toast-slide-in 0.3s ease-out;
  }

  .toast--success {
    background-color: var(--theme--positive);
    border-color: var(--theme--positive);
    color: var(--theme--accent-color);
  }

  .toast--error {
    background-color: var(--theme--negative);
    border-color: var(--theme--negative);
    color: var(--theme--bg-color);
  }

  .toast--warning {
    background-color: orange;
    border-color: orange;
    color: var(--theme--accent-color);
  }

  .toast--info {
    background-color: var(--theme--accent-color);
    border-color: var(--theme--accent-color);
    color: var(--theme--bg-color);
  }

  .toast__icon {
    flex-shrink: 0;
  }

  .toast__message {
    margin: 0;
    flex: 1;
    font-size: 0.875rem;
  }

  .toast__close {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: inherit;
  }

  .toast__close .theme-icon {
    font-size: 20px;
  }

  @keyframes toast-slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
