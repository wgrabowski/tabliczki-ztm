<script lang="ts">
  import Card from "@components/base/Card.svelte";
  import IconButton from "@components/base/IconButton.svelte";
  import TextInput from "@components/base/TextInput.svelte";
  import type { SetDTO } from "@types";

  /**
   * Card displaying a single set with inline editing
   */
  export let set: SetDTO;
  export let onUpdate: (setId: string, name: string) => Promise<void>;
  export let onDelete: (setId: string) => void;
  export let onNavigate: (setId: string) => void;

  let isEditing = false;
  let isLoading = false;
  let editedName = set.name;
  let originalName = set.name;

  // Update local state when set prop changes
  $: {
    originalName = set.name;
    if (!isEditing) {
      editedName = set.name;
    }
  }

  function startEditing() {
    isEditing = true;
    editedName = set.name;
  }

  function cancelEditing() {
    isEditing = false;
    editedName = originalName;
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!editedName.trim() || editedName.trim() === originalName || isLoading) {
      cancelEditing();
      return;
    }

    isLoading = true;
    try {
      await onUpdate(set.id, editedName.trim());
      isEditing = false;
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      isLoading = false;
    }
  }

  function handleCardClick(event: MouseEvent) {
    // Don't navigate if clicking on interactive elements
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("form") || target.closest("input")) {
      return;
    }
    onNavigate(set.id);
  }
</script>

<Card title={isEditing ? editedName : set.name}>
  <div slot="actions">
    <IconButton
      icon="visibility"
      title="Zobacz zestaw"
      variant="default"
      size="small"
      onClick={() => onNavigate(set.id)}
    />
  </div>
  <div slot="deleteAction">
    <IconButton
      icon="delete"
      title="Usuń"
      variant="default"
      size="small"
      onClick={() => onDelete(set.id)}
    />
  </div>

  <div class="set-card__content">
    {#if !isEditing}
      <div class="set-card__info">
        <button
          class="set-card__name-button theme-clickable"
          on:click={startEditing}
          aria-label="Edytuj nazwę zestawu"
        >
          <span class="theme-icon">edit</span>
          Edytuj nazwę
        </button>
        <button class="set-card__count theme-clickable" on:click={() => onNavigate(set.id)}>
          <span class="theme-icon">departure_board</span>
          {set.item_count} {set.item_count === 1 ? "przystanek" : "przystanków"}
        </button>
      </div>
    {:else}
      <form class="set-card__edit-form" on:submit={handleSubmit}>
        <TextInput
          bind:value={editedName}
          maxlength={20}
          pattern=".*\S.*"
          required
          autofocus
          disabled={isLoading}
        />
        <div class="set-card__edit-actions">
          <IconButton
            icon="check"
            title="Zapisz"
            type="submit"
            variant="default"
            size="small"
            disabled={isLoading}
            width="40px"
          />
          <IconButton
            icon="close"
            title="Anuluj"
            type="button"
            variant="inverted"
            size="small"
            onClick={cancelEditing}
            disabled={isLoading}
            width="40px"
          />
        </div>
        {#if isLoading}
          <div class="set-card__loader">
            <span class="set-card__spinner"></span>
            Zapisywanie...
          </div>
        {/if}
      </form>
    {/if}
  </div>
</Card>

<style>
  .set-card__content {
    display: grid;
    place-items: center;
    gap: calc(var(--theme--spacing) * 2);
    min-height: 120px;
  }

  .set-card__info {
    display: flex;
    flex-direction: column;
    gap: var(--theme--spacing);
  }

  .set-card__name-button,
  .set-card__count{
    display: flex;
    align-items: center;
    gap: var(--theme--spacing);
    background: none;
    border: none;
    padding: var(--theme--spacing);
    font-size: 0.875rem;
    color: var(--theme--accent-color);
    text-align: left;
  }

  .set-card__count {
    display: flex;
    align-items: center;
    gap: var(--theme--spacing);
    margin: 0;
    font-size: 1rem;
    color: var(--theme--accent-color);
  }

  .set-card__edit-form {
    display: flex;
    flex-direction: row;
    gap: calc(3* var(--theme--spacing));
  }

  .set-card__edit-actions {
    display: flex;
    gap: var(--theme--spacing);
    justify-content: flex-end;
  }

  .set-card__loader {
    display: flex;
    align-items: center;
    gap: var(--theme--spacing);
    font-size: 0.875rem;
    color: var(--theme--accent-color);
  }

  .set-card__spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
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
