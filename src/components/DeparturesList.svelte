<script lang="ts">
  import DepartureItem from "./DepartureItem.svelte";
  import IconButton from "./base/IconButton.svelte";
  import type { ZtmDepartureDTO } from "../ztm-types";

  /**
   * Departures list with pagination (6 visible items per page)
   * Navigation with up/down buttons in footer
   */
  export let departures: ZtmDepartureDTO[];

  let currentOffset = 0;
  const itemsPerPage = 6;

  // Calculate pagination values
  $: maxOffset = departures.length - itemsPerPage;
  $: visibleDepartures = departures.slice(currentOffset, currentOffset + itemsPerPage);
  
  $: startIndex = currentOffset + 1;
  $: endIndex = currentOffset + itemsPerPage;
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

<table class="departures-table">
  <colgroup>
    <col width="1%" />
    <col width="100%" />
    <col width="1%" colspan="2"/>
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

  <!-- Pagination Footer (only show if more than 6 items) -->
  {#if departures.length > itemsPerPage}
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
    width: 100%;
    border-collapse: collapse;
    height: 100%;
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
    padding: var(--theme--spacing);
    border-top: 1px solid var(--theme--accent-color-dim);
    text-align: right;
  }

  .page-indicator {
    font-size: 0.875rem;
    color: var(--theme--accent-color);
    white-space: nowrap;
  }
</style>
