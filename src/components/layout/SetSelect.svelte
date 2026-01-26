<script lang="ts">
  import type { SetDTO } from "@types";

  /**
   * Dropdown for switching between user's sets
   * Synced with URL parameter setId
   * On change: navigates to /dashboard/{newSetId}
   */
  export let sets: SetDTO[];
  export let currentSetId: string;
  export let onSetChange: ((setId: string) => void) | undefined = undefined;

  let selectedSetId = currentSetId;

  // Handle select change
  function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newSetId = target.value;
    
    if (newSetId !== currentSetId) {
      if (onSetChange) {
        onSetChange(newSetId);
      } else {
        // Default: navigate to new set
        window.location.href = `/dashboard/${newSetId}`;
      }
    }
  }

  // Update selected value when currentSetId changes
  $: selectedSetId = currentSetId;
</script>


  
  <select
    aria-label="Wybierz zestaw"
    title="Wybierz zestaw"
    bind:value={selectedSetId}
    on:change={handleChange}
    class="set-select-input theme-outlined theme-noradius theme-focusable"
  >
    {#each sets as set (set.id)}
      <option value={set.id} selected={set.id === currentSetId}>
        {set.name}
      </option>
    {/each}
  </select>


<style>
  .set-select-input {
    padding: var(--theme--spacing);
    font-size: 1rem;
    background: var(--theme--bg-color);
    color: var(--theme--accent-color);
    border: 1px solid var(--theme--accent-color-dim);
    cursor: pointer;
    min-width: 150px;
  }

  .set-select-input:hover {
    filter: brightness(1.2);
  }

  .set-select-input option {
    background: var(--theme--bg-color);
    color: var(--theme--accent-color);
  }
</style>
