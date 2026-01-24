<script lang="ts">
  import type { ZtmErrorCode } from "../ztm-types";

  /**
   * TV Error Screen - Fullscreen error display with reload button
   * Shows when departures cannot be loaded
   */

  export let error: {
    code: ZtmErrorCode | "NO_DEPARTURES" | "INVALID_STOP" | "NETWORK";
    message: string;
    retryCount: number;
  };
  export let onReload: () => void;
  export let isLoading: boolean;

  // Map error codes to user-friendly messages
  const errorTitles: Record<string, string> = {
    NO_DEPARTURES: "Brak odjazdów",
    INVALID_STOP: "Nieprawidłowy przystanek",
    NETWORK: "Błąd połączenia",
    ZTM_TIMEOUT: "Przekroczono limit czasu",
    ZTM_UPSTREAM_ERROR: "Błąd serwera ZTM",
    INVALID_INPUT: "Nieprawidłowe dane",
    ZTM_INVALID_RESPONSE: "Nieprawidłowa odpowiedź",
  };

  $: errorTitle = errorTitles[error.code] || "Wystąpił błąd";
  $: showRetryCount = error.retryCount > 0;
</script>

<section class="tv-error-screen" role="alert" aria-live="assertive">
  <div class="tv-error-screen__content">
    <span class="theme-icon tv-error-screen__icon" aria-hidden="true">error</span>

    <h2 class="tv-error-screen__title">{errorTitle}</h2>

    <p class="tv-error-screen__message">{error.message}</p>

    {#if showRetryCount}
      <p class="tv-error-screen__retry-info">Próba: {error.retryCount}/3</p>
    {/if}

    <button
      class="tv-error-screen__button theme-filled theme-noradius theme-clickable theme-focusable"
      on:click={onReload}
      disabled={isLoading}
    >
      <span class="theme-icon" aria-hidden="true">refresh</span>
      {isLoading ? "Ładowanie..." : "Odśwież"}
    </button>
  </div>
</section>

<style>
  .tv-error-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    padding: calc(var(--theme--spacing) * 4);
  }

  .tv-error-screen__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc(var(--theme--spacing) * 3);
    text-align: center;
    max-width: 600px;
  }

  .tv-error-screen__icon {
    font-size: 5rem;
    color: var(--theme--negative);
  }

  .tv-error-screen__title {
    margin: 0;
    font-size: 2.5rem;
    font-weight: normal;
    color: var(--theme--accent-color);
  }

  .tv-error-screen__message {
    margin: 0;
    font-size: 1.5rem;
    color: var(--theme--accent-color);
  }

  .tv-error-screen__retry-info {
    margin: 0;
    font-size: 1.25rem;
    color: var(--theme--accent-color-dim);
  }

  .tv-error-screen__button {
    display: flex;
    align-items: center;
    gap: var(--theme--spacing);
    padding: calc(var(--theme--spacing) * 2) calc(var(--theme--spacing) * 4);
    font-size: 1.5rem;
    border: 2px solid var(--theme--accent-color-dim);
  }

  .tv-error-screen__button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: none;
  }

  .tv-error-screen__button:disabled:hover {
    filter: none;
  }

  /* Large screen optimizations */
  @media (min-width: 1200px) {
    .tv-error-screen__icon {
      font-size: 6rem;
    }

    .tv-error-screen__title {
      font-size: 3rem;
    }

    .tv-error-screen__message {
      font-size: 2rem;
    }

    .tv-error-screen__button {
      font-size: 2rem;
    }
  }
</style>
