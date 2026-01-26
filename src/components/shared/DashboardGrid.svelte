<script lang="ts">
  /**
   * CSS Grid container for set cards
   * Auto-fills columns with minimum 280px width
   */
</script>

<div class="dashboard-grid">
  <slot />
</div>

<style>
  .dashboard-grid {
    display: grid;
  
    grid-template-columns: repeat(auto-fill, minmax(max(300px, calc((100% - 2 * calc(var(--theme--spacing) * 6)) / 3)), 1fr));
    /* Wysokość dopasowana do zawartości */
    grid-auto-rows: auto;
    gap: calc(var(--theme--spacing) * 6);
    width: 100%;
  }


</style>
