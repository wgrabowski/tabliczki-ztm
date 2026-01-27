<script lang="ts">
  /**
   * Departures list skeleton loader
   * Shows empty table structure with pulsing animation while loading
   * Prevents UI layout shift during data fetch
   */
  export let itemCount = 6;
</script>

<table class="departures-table departures-table--skeleton" data-testid="departures-list">
  <colgroup>
    <col style="width: 1%" />
    <col style="width: 100%" />
    <col style="width: 1%" span="2" />
  </colgroup>
  <thead>
    <tr>
      <th class="theme-filled">Nr</th>
      <th class="theme-filled">Kierunek</th>
      <th class="theme-filled" colspan="2">Odjazd</th>
    </tr>
  </thead>

  <tbody>
    {#each Array(itemCount) as _, index (index)}
      <tr class="skeleton-row">
        <td class="skeleton-cell">
          <div class="skeleton-box skeleton-box--small">XX</div>
        </td>
        <td class="skeleton-cell">
          <div class="skeleton-box skeleton-box--large">XXXX XXXXXX</div>
        </td>
        <td class="skeleton-cell" span="2">
          <div class="skeleton-box skeleton-box--medium">XX:XX</div>
        </td>
       
      </tr>
    {/each}
  </tbody>

  <tfoot>
    <tr>
      <td colspan="4" class="departures-footer">
        <div class="skeleton-footer">
          <div class="skeleton-box skeleton-box--icon">X</div>
          <div class="skeleton-box skeleton-box--icon">X</div>
        </div>
      </td>
    </tr>
  </tfoot>
</table>

<style>
  .departures-table--skeleton {
    opacity: 0.7;
    font-size: clamp(1rem, 2dvmin, 2.5rem);
    width: 100%;
    border-collapse: collapse;
    height: 100%;
  }

  .departures-table--skeleton thead th {
    padding: var(--theme--spacing);
    text-align: left;
    font-weight: bold;
    
  }

 


  .skeleton-row {
    border-bottom: 1px solid var(--theme--accent-color-dim);
  }

  .skeleton-cell {
    padding: var(--theme--spacing);
    height: 33px;
  }

  .skeleton-box {
    border-radius: 0;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
    height: 1lh;
  }

  .skeleton-box--small {
    width: 2ch;
    height: 1lh;
  }

  .skeleton-box--medium {
    width: 4ch;
    height: 1lh;  
  }

  .skeleton-box--large {
    width: 80%;
    height: 1lh;
  }

  .skeleton-box--icon {
    width: 1.5em;
    height: 33px; 
  }

  .skeleton-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--theme--spacing);
    padding: 0;
  }

  @keyframes skeleton-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  .departures-footer {
    padding: 0 var(--theme--spacing);
    text-align: right;
    min-height: 33px;
  }
</style>
