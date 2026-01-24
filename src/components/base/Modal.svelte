<script lang="ts">
  /**
   * Modal wrapper for native <dialog> with focus management
   * Larger version for complex content like forms with autocomplete
   */
  export let isOpen: boolean = false;
  export let title: string | undefined = undefined;
  export let onClose: (() => void) | undefined = undefined;

  let dialogElement: HTMLDialogElement;

  // Reactive statement to handle open/close
  $: if (isOpen && dialogElement && !dialogElement.open) {
    dialogElement.showModal();
  } else if (!isOpen && dialogElement?.open) {
    dialogElement.close();
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
</script>

<dialog bind:this={dialogElement} class="theme-outlined theme-noradius" on:cancel={handleCancel}>
    {#if title}
      <header class="theme-filled">
        <h2 class="modal__title">{title}</h2>
      </header>
    {/if}
    <main>
      <slot />
    </main>
    {#if $$slots.footer}
      <footer>
        <slot name="footer" />
      </footer>
    {/if}
</dialog>

<style>
  dialog {
    padding: 0;
    width: min(800px, 90vw);
    max-width: 90vw;
    min-height: 60vh;
    max-height: 85vh;
    display: none;
  }
  dialog[open] {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(1px) saturate(180%);
  }

  

  header {
    padding: var(--theme--spacing) calc(var(--theme--spacing) * 2);
    border-bottom: 1px solid var(--theme--accent-color-dim);
    flex: 0 1 auto;
  }

  .modal__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: normal;
  }

  main {
    padding: calc(var(--theme--spacing) * 2);
    overflow: auto;
    flex: 1 1 100%;
    min-height: 0;
  }

  footer {
    padding: calc(var(--theme--spacing) * 2);
    border-top: 1px solid var(--theme--accent-color-dim);
    flex: 0 1 auto;
  }
</style>
