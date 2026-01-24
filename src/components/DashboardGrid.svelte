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
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    grid-auto-rows: minmax(100px, 1fr);
    gap: calc(var(--theme--spacing) * 6);
    width: 100%;
  }
</style>
