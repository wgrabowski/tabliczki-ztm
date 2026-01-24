<script lang="ts">
  /**
   * Icon button component using Material Symbols
   * Requires title attribute for accessibility
   */
  export let icon: string;
  export let title: string;
  export let variant: "default" | "inverted" = "default";
  export let size: "small" | "medium" | "large" = "medium";
  export let type: "button" | "submit" | "reset" = "button";
  export let disabled: boolean = false;
  export let onClick: (() => void) | undefined = undefined;

  function handleClick() {
    if (!disabled && onClick) {
      onClick();
    }
  }
</script>

<button
  {type}
  {title}
  class="icon-button theme-noradius theme-focusable theme-clickable"
  class:theme-filled={variant === "default"}
  class:theme-outlined={variant === "inverted"}
  class:icon-button--small={size === "small"}
  class:icon-button--medium={size === "medium"}
  class:icon-button--large={size === "large"}
  class:icon-button--disabled={disabled}
  {disabled}
  on:click={handleClick}
>
  <span class="theme-icon" aria-hidden="true">{icon}</span>
</button>

<style>
  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--theme--spacing);
    min-height: 20px;
    min-width: 20px;
    border:0;
  }

  /* Sizes */
  .icon-button--small .theme-icon {
    font-size: 18px;
  }

  .icon-button--medium .theme-icon {
    font-size: 24px;
  }

  .icon-button--large .theme-icon {
    font-size: 32px;
  }

  .icon-button--disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: none !important;
  }
</style>
