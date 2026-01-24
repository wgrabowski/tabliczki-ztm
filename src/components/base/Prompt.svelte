<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  /**
   * Prompt wrapper for native <dialog> with focus management
   */
  export let isOpen: boolean = false;
  export let title: string | undefined = undefined;
  export let onClose: (() => void) | undefined = undefined;

  let dialogElement: HTMLDialogElement;

  // Reactive statement to handle open/close
  $: if (dialogElement) {
    if (isOpen && !dialogElement.open) {
      dialogElement.showModal();
    } else if (!isOpen && dialogElement.open) {
      dialogElement.close();
    }
  }

  function handleClose() {
    if (onClose) {
      onClose();
    }
  }

  function handleCancel(event: Event) {
    event.preventDefault();
    handleClose();
  }

  onMount(() => {
    // Handle Escape key
    dialogElement.addEventListener("cancel", handleCancel);
  });

  onDestroy(() => {
    if (dialogElement) {
      dialogElement.removeEventListener("cancel", handleCancel);
    }
  });
</script>

<dialog bind:this={dialogElement} class="dialog theme-outlined theme-noradius">
  <div class="dialog__content">
    {#if title}
      <header class="dialog__header theme-filled">
        <h2 class="dialog__title">{title}</h2>
      </header>
    {/if}
    <div class="dialog__body">
      <slot />
    </div>
  </div>
</dialog>

<style>
  .dialog {
    padding: 0;
    max-width: 90vw;
    max-height: 90vh;
  }

  .dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(1px) saturate(180%);
  }

  .dialog__content {
    display: flex;
    flex-direction: column;
  }

  .dialog__header {
    padding: var(--theme--spacing) calc(var(--theme--spacing) * 2);
    border-bottom: 1px solid var(--theme--accent-color-dim);
  }

  .dialog__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: normal;
  }

  .dialog__body {
    padding: calc(var(--theme--spacing) * 2);
    overflow-y: auto;
  }
</style>
