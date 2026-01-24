<script lang="ts">
  /**
   * StateInfo component for displaying errors, warnings, and info messages
   * with consistent styling and icon
   */
  export let type: 'error' | 'warning' | 'info';
  export let text: string;
  export let details: string | null = null;

  // Map type to icon name (same as type)
  $: icon = type;
</script>

<div class="state-info state-info--{type}">
  <span class="theme-icon state-info__icon">{icon}</span>
  <p class="state-info__message">
    {@html text}
    {#if details}
      <span class="state-info__details">{details}</span>
    {/if}
  </p>
</div>

<style>
  .state-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--theme--spacing);
    padding: calc(var(--theme--spacing) * 2);
    text-align: center;
  }

  .state-info__icon {
    font-size: 2rem;
  }

  .state-info--error .state-info__icon,
  .state-info--warning .state-info__icon {
    color: var(--theme--negative);
  }

  .state-info--info .state-info__icon {
    color: var(--theme--accent-color-dim);
  }

  .state-info__message {
    margin: 0;
    color: var(--theme--accent-color);
    line-height: 1.5;
  }

  .state-info--info .state-info__message {
    color: var(--theme--accent-color-dim);
  }

  .state-info__details {
    display: block;
    margin-top: 0.5em;
    font-size: 0.875rem;
    color: var(--theme--accent-color-dim);
  }
</style>
