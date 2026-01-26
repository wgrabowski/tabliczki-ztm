<script lang="ts">
  import { setGlobalLoading } from "@stores/global-loading.store";
  import { toastsStore } from "@stores/toasts.store";
  import DashboardGrid from "@components/shared/DashboardGrid.svelte";
  import SetCard from "./SetCard.svelte";
  import CreateSetButton from "./CreateSetButton.svelte";
  import ConfirmDialog from "@components/shared/ConfirmDialog.svelte";
  import type { SetDTO, ConfirmDialogState, ErrorResponse } from "@types";

  /**
   * Main dashboard component orchestrating set management
   */
  export let initialSets: SetDTO[];
  
  // @ts-expect-error - totalCount passed from SSR for future use (pagination/statistics)
  export let totalCount: number;

  let sets = initialSets;
  let confirmDialog: ConfirmDialogState = {
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  };

  function openConfirmDialog(title: string, message: string, onConfirm: () => void) {
    confirmDialog = {
      isOpen: true,
      title,
      message,
      onConfirm,
    };
  }

  function closeConfirmDialog() {
    confirmDialog = {
      isOpen: false,
      title: "",
      message: "",
      onConfirm: () => {},
    };
  }

  function getErrorMessage(error: ErrorResponse): string {
    const messages: Record<string, string> = {
      MAX_SETS_PER_USER_EXCEEDED: "Osiągnięto limit 6 zestawów",
      DUPLICATE_SET_NAME: "Zestaw o tej nazwie już istnieje",
      SET_NOT_FOUND: "Zestaw nie istnieje",
      INVALID_SET_NAME: "Nieprawidłowa nazwa zestawu",
      INTERNAL_ERROR: "Wystąpił błąd serwera. Spróbuj ponownie.",
    };
    return messages[error.code] || error.message || "Wystąpił nieoczekiwany błąd";
  }

  async function handleCreateSet(name: string) {
    setGlobalLoading(true);
    try {
      const response = await fetch("/api/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.status === 401) {
        window.location.href = "/auth/login";
        return;
      }

      if (!response.ok) {
        const error: ErrorResponse = await response.json();
        toastsStore.addToast("error", getErrorMessage(error));
        throw new Error(error.message);
      }

      const data = await response.json();
      sets = data.sets;
      toastsStore.addToast("success", `Utworzono zestaw "${data.created_set.name}"`);
    } catch (err) {
      if (err instanceof Error && err.message !== "Failed to fetch") {
        // Error already handled above
        throw err;
      } else {
        toastsStore.addToast("error", "Brak połączenia z serwerem");
        throw err;
      }
    } finally {
      setGlobalLoading(false);
    }
  }

  async function handleUpdateSet(setId: string, name: string) {
    try {
      const response = await fetch(`/api/sets/${setId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.status === 401) {
        window.location.href = "/auth/login";
        return;
      }

      if (!response.ok) {
        const error: ErrorResponse = await response.json();
        toastsStore.addToast("error", getErrorMessage(error));
        throw new Error(error.message);
      }

      const data = await response.json();
      sets = data.sets;
      toastsStore.addToast("success", `Zmieniono nazwę na "${data.updated_set.name}"`);
    } catch (err) {
      if (err instanceof Error && err.message !== "Failed to fetch") {
        // Error already handled above
        throw err;
      } else {
        toastsStore.addToast("error", "Brak połączenia z serwerem");
        throw err;
      }
    }
  }

  async function handleDeleteSet(setId: string) {
    setGlobalLoading(true);
    try {
      const response = await fetch(`/api/sets/${setId}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        window.location.href = "/auth/login";
        return;
      }

      if (!response.ok) {
        const error: ErrorResponse = await response.json();
        toastsStore.addToast("error", getErrorMessage(error));
        return;
      }

      const data = await response.json();
      sets = data.sets;
      toastsStore.addToast("success", "Zestaw został usunięty");
    } catch (err) {
      toastsStore.addToast("error", "Brak połączenia z serwerem");
    } finally {
      setGlobalLoading(false);
      closeConfirmDialog();
    }
  }

  function handleDeleteRequest(setId: string) {
    const set = sets.find((s) => s.id === setId);
    if (!set) return;

    openConfirmDialog(
      "Potwierdzenie",
      `Czy na pewno chcesz usunąć zestaw "${set.name}"?`,
      () => handleDeleteSet(setId)
    );
  }

  function handleNavigateToSet(setId: string) {
    window.location.href = `/dashboard/${setId}`;
  }
</script>

<div class="sets-dashboard">
  <DashboardGrid>
    {#each sets as set (set.id)}
      <SetCard
        {set}
        onUpdate={handleUpdateSet}
        onDelete={handleDeleteRequest}
        onNavigate={handleNavigateToSet}
      />
    {/each}

    {#if sets.length < 6}
      <CreateSetButton onCreate={handleCreateSet} disabled={sets.length >= 6} />
    {/if}
  </DashboardGrid>
</div>

<ConfirmDialog
  isOpen={confirmDialog.isOpen}
  title={confirmDialog.title}
  message={confirmDialog.message}
  onConfirm={confirmDialog.onConfirm}
  onCancel={closeConfirmDialog}
/>

<style>
  .sets-dashboard {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: calc(var(--theme--spacing) * 4);
  }
</style>
