<script lang="ts">
  import IconButton from "./base/IconButton.svelte";
  import Prompt from "./base/Prompt.svelte";
  import TextInput from "./base/TextInput.svelte";
  import Button from "./base/Button.svelte";

  /**
   * Button that opens a dialog to create a new set
   * Visible only when user has < 6 sets
   */
  export let onCreate: (name: string) => Promise<void>;
  export let disabled: boolean = false;

  let isDialogOpen = false;
  let newSetName = "";
  let isLoading = false;

  function openDialog() {
    isDialogOpen = true;
    newSetName = "";
  }

  function closeDialog() {
    isDialogOpen = false;
    newSetName = "";
    isLoading = false;
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!newSetName.trim() || isLoading) return;

    isLoading = true;
    try {
      await onCreate(newSetName.trim());
      closeDialog();
    } catch (error) {
      // Error handling is done in parent component (SetsDashboard)
      isLoading = false;
    }
  }
</script>

<button
  class="create-set-button theme-outlined theme-noradius theme-focusable theme-clickable"
  {disabled}
  on:click={openDialog}
  aria-label="Dodaj nowy zestaw"
>
  <span class="theme-icon create-set-button__icon">add</span>
  <span class="create-set-button__text">Dodaj zestaw</span>
</button>

<Prompt isOpen={isDialogOpen} title="Nowy zestaw" onClose={closeDialog}>
  <form class="create-set-form" on:submit={handleSubmit} method="dialog">
    <TextInput
      bind:value={newSetName}
      placeholder="Nazwa zestawu"
      maxlength={10}
      pattern=".*\S.*"
      required
      autofocus
      name="name"
    />
    <div class="create-set-form__actions">
      <Button type="submit" variant="primary" loading={isLoading} disabled={isLoading}>
        Zapisz
      </Button>
      <Button type="button" variant="secondary" onClick={closeDialog} disabled={isLoading}>
        Anuluj
      </Button>
    </div>
  </form>
</Prompt>

<style>
  .create-set-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--theme--spacing);
    padding: calc(var(--theme--spacing) * 4);
    min-height: 200px;
    width: 100%;
    border-style: dashed;
    border-width: 2px;
  }

  .create-set-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: none !important;
  }

  .create-set-button__icon {
    font-size: 48px;
  }

  .create-set-button__text {
    font-size: 1rem;
  }

  .create-set-form {
    display: flex;
    flex-direction: column;
    gap: calc(var(--theme--spacing) * 4);
    min-width: 300px;
  }

  .create-set-form__actions {
    display: flex;
    gap: var(--theme--spacing);
    justify-content: flex-end;
  }
</style>
