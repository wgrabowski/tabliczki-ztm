<script lang="ts">
  /**
   * Text input component with HTML5 validation
   */
  export let type: "text" | "email" | "password" | "search" = "text";
  export let name: string | undefined = undefined;
  export let value: string = "";
  export let placeholder: string | undefined = undefined;
  export let required: boolean = false;
  export let maxlength: number | undefined = undefined;
  export let pattern: string | undefined = undefined;
  export let disabled: boolean = false;
  export let autofocus: boolean = false;
  export let autocomplete: string | undefined = undefined;
  export let testid: string | undefined = undefined;
</script>

<!-- svelte-ignore a11y_autofocus -->
<input
  {type}
  {name}
  bind:value
  {placeholder}
  {required}
  {maxlength}
  {pattern}
  {disabled}
  autofocus={autofocus}
  autocomplete={autocomplete}
  data-testid={testid}
  class="text-input theme-outlined theme-noradius theme-focusable"
/>

<style>
  .text-input {
    padding: var(--theme--spacing) calc(var(--theme--spacing) * 2);
    font-size: 1rem;
    line-height: 1.5;
    width: 100%;
    min-height: 44px;
  }

  .text-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
