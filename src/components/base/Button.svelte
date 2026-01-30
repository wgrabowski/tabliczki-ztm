<script lang="ts">
  /**
   * Universal button component with variants and states
   */
  export let type: "button" | "submit" | "reset" = "button";
  export let variant: "primary" | "secondary" = "primary";
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let onClick: (() => void) | undefined = undefined;
  export let testid: string | undefined = undefined;

  function handleClick() {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  }
</script>

<button
  {type}
  data-testid={testid}
  class="button theme-noradius theme-focusable theme-clickable"
  class:theme-filled={variant === "primary"}
  class:theme-outlined={variant === "secondary"}
  class:button--disabled={disabled || loading}
  disabled={disabled || loading}
  on:click={handleClick}
>
  {#if loading}
    <span class="button__spinner" aria-hidden="true"></span>
  {/if}
  <slot />
</button>

<style>
  .button {
    padding: var(--theme--spacing) calc(var(--theme--spacing) * 3);
    font-size: 1rem;
    line-height: 1.5;
    text-align: center;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--theme--spacing);
    min-height: 44px;
    min-width: 44px;
  }

  .button--disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: none !important;
  }

  .button__spinner {
    display: inline-block;
    width: 1em;
    height: 1em;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spinner-rotation 0.6s linear infinite;
  }

  @keyframes spinner-rotation {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
