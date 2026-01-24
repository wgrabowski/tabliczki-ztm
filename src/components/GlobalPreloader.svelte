<script lang="ts">
  import { globalLoadingStore } from "../lib/stores/global-loading.store";

  /**
   * Full-screen preloader overlay
   * Subscribes to globalLoadingStore
   */
  $: isLoading = $globalLoadingStore;
</script>

{#if isLoading}
  <div class="preloader" aria-live="polite" aria-busy="true">
    <div class="preloader__spinner"></div>
    <p class="preloader__text">Ładowanie...</p>
  </div>
{/if}

<style>
  .preloader {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: calc(var(--theme--spacing) * 2);
    z-index: 9999;
    pointer-events: all;
  }

  .preloader__spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--theme--accent-color);
    border-right-color: transparent;
    border-radius: 50%;
    animation: spinner-rotation 0.8s linear infinite;
  }

  .preloader__text {
    margin: 0;
    color: var(--theme--accent-color);
    font-size: 1rem;
  }

  @keyframes spinner-rotation {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
