<script lang="ts">
  import Prompt from "@components/base/Prompt.svelte";
  import Button from "@components/base/Button.svelte";

  /**
   * Confirmation dialog for destructive actions
   */
  export let isOpen: boolean = false;
  export let title: string;
  export let message: string;
  export let confirmText: string = "Usuń";
  export let cancelText: string = "Anuluj";
  export let onConfirm: () => void;
  export let onCancel: () => void;

  function handleConfirm() {
    onConfirm();
  }

  function handleCancel() {
    onCancel();
  }
</script>

<Prompt {isOpen} {title} onClose={handleCancel}>
  <div class="confirm-dialog">
    <p class="confirm-dialog__message">{message}</p>
    <div class="confirm-dialog__actions">
      <Button variant="primary" onClick={handleConfirm}>{confirmText}</Button>
      <Button variant="secondary" onClick={handleCancel}>{cancelText}</Button>
    </div>
  </div>
</Prompt>

<style>
  .confirm-dialog {
    display: flex;
    flex-direction: column;
    gap: calc(var(--theme--spacing) * 4);
  }

  .confirm-dialog__message {
    margin: 0;
    font-size: 1rem;
    line-height: 1.5;
  }

  .confirm-dialog__actions {
    display: flex;
    gap: var(--theme--spacing);
    justify-content: flex-end;
  }
</style>
