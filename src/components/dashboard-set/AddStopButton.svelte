<script lang="ts">
  /**
   * Button to add a new stop to the set
   * Visible only when items.length < 6
   */
  export let onClick: () => void;
  export let disabled: boolean = false;
</script>

<button
  class="add-stop-button theme-outlined theme-noradius theme-focusable theme-clickable"
  {disabled}
  on:click={onClick}
  aria-label="Dodaj nowy przystanek"
>
  <span class="theme-icon add-stop-button__icon">add</span>
  <span class="add-stop-button__text">Dodaj przystanek</span>
</button>

<style>
  .add-stop-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--theme--spacing);
    padding: calc(var(--theme--spacing) * 4);
    min-height: 200px;
    width: 100%;
    border-style: dashed;
    border-width: 2px;
  }

  .add-stop-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: none !important;
  }

  .add-stop-button__icon {
    font-size: 48px;
  }

  .add-stop-button__text {
    font-size: 1rem;
  }
</style>
