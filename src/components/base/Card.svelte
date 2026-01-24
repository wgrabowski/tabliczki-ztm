<script lang="ts">
  /**
   * Card component with header containing title and action slots
   */
  export let title: string;
</script>

<article class="card theme-outlined theme-noradius">
  <header class="card__header theme-filled">
    <div class="card__header-actions">
      <slot name="actions" />
    </div>
    <h3 class="card__title">{title}</h3>
    <div class="card__header-delete">
      <slot name="deleteAction" />
    </div>
  </header>
  <div class="card__content">
    <slot />
  </div>
</article>

<style>
  .card {
    display: flex;
    flex-direction: column;
  }

  .card__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--theme--spacing);
    border-bottom: 1px solid var(--theme--accent-color-dim);
    gap: var(--theme--spacing);
  }

  .card__title {
    margin: 0;
    font-size: 1rem;
    font-weight: normal;
    flex: 1;
    text-align: center;
  }

  .card__header-actions,
  .card__header-delete {
    display: flex;
    align-items: center;
    gap: var(--theme--spacing);
  }

  .card__content {
    padding: calc(var(--theme--spacing) * 2);
  }
</style>
