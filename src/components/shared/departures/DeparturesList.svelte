<script lang="ts">
  import DepartureItem from "./DepartureItem.svelte";
  import IconButton from "@components/base/IconButton.svelte";
  import type { ZtmDepartureDTO } from "@ztm-types";

  /**
   * Departures list with pagination (6 visible items per page)
   * Navigation with up/down buttons in footer
   * TV variant: no pagination, larger fonts
   */
  export let departures: ZtmDepartureDTO[];
  export let paginationDisabled = false;
  export let isTvMode = false;

  let currentOffset = 0;
  const itemsPerPage = 6;

  // When pagination disabled, show all items
  $: effectiveItemsPerPage = paginationDisabled ? departures.length : itemsPerPage;
  $: showPagination = !paginationDisabled && departures.length > itemsPerPage;

  // Calculate pagination values
  $: maxOffset = departures.length - effectiveItemsPerPage;
  $: visibleDepartures = departures.slice(currentOffset, currentOffset + effectiveItemsPerPage);
  
  $: startIndex = currentOffset + 1;
  $: endIndex = currentOffset + effectiveItemsPerPage;
  $: totalCount = departures.length;

  // Page indicator text
  $: pageIndicator = `${startIndex}-${endIndex} z ${totalCount}`;

  // Navigation functions
  function goToPreviousPage() {
    if (currentOffset > 0) {
      currentOffset -= 1;
  }
  }


  function goToNextPage() {
    if (currentOffset < maxOffset) {
      currentOffset += 1;
    }
  }

  // Reset to first page when departures change
  $: if (departures) {
    currentOffset = 0;
  }
</script>

<table class="departures-table" class:tv-mode={isTvMode} data-testid="departures-list">
  <colgroup>
    <col style="width: 1%" />
    <col style="width: 100%" />
    <col style="width: 1%" span="2"/>
  </colgroup>
  <thead>
    <tr>
      <th class="theme-filled">Nr</th>
      <th class="theme-filled">Kierunek</th>
      <th class="theme-filled" colspan="2">Odjazd</th>
    </tr>
  </thead>

  <tbody>
    {#each visibleDepartures as departure,index (departure.id + index) }
      <DepartureItem {departure} />
    {/each}
  </tbody>

  <!-- Pagination Footer (only show if more than 6 items and not TV) -->
  {#if showPagination}
    <tfoot>
      <tr>
        <td colspan="4" class="departures-footer">
          <IconButton
            variant="inverted"
            icon="keyboard_arrow_up"
            title="Poprzednie odjazdy"
            onClick={goToPreviousPage}
            disabled={currentOffset=== 0}
          />

          <!-- <span class="page-indicator">{pageIndicator}</span> -->

          <IconButton
            variant="inverted"
            icon="keyboard_arrow_down"
            title="Następne odjazdy"
            onClick={goToNextPage}
            disabled={currentOffset === maxOffset}
          />
        </td>
      </tr>
    </tfoot>
  {/if}
</table>

<style>
  .departures-table {
    font-size: clamp(1rem, 2dvmin, 3rem);
    width: 100%;
    border-collapse: collapse;
    height: 100%;
  }

  .departures-table.tv-mode {
    font-size: clamp(1rem, 4dvmin, 3rem);
  }

  thead th {
    padding: var(--theme--spacing);
    text-align: left;
    font-weight: bold;
  }


  tbody {
    /* Fixed height for 6 items to prevent layout shift */
    min-height: calc(6 * 3em);
  }

  tfoot td {
    padding: 0;
  }

  .departures-footer {
    padding:0 var(--theme--spacing);
    text-align: right;
   
  }


  
</style>
