<script lang="ts">
  import Button from "../base/Button.svelte";
  import Prompt from "../base/Prompt.svelte";
  import { toastsStore } from "../../lib/stores/toasts.store";

  /**
   * Account management component
   * Displays user information and allows account deletion with confirmation
   */

  export let userEmail: string = "";

  let showDeleteConfirm: boolean = false;
  let isDeleting: boolean = false;
  let isLoggingOut: boolean = false;

  function handleOpenDeleteConfirm() {
    showDeleteConfirm = true;
  }

  function handleCloseDeleteConfirm() {
    showDeleteConfirm = false;
  }

  async function handleDeleteAccount() {
    isDeleting = true;

    try {
      const response = await fetch("/api/auth/account", {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Nie udało się usunąć konta");
      }

      // Success - redirect to home page
      toastsStore.addToast("success", "Konto zostało usunięte");
      window.location.href = "/";
    } catch (error) {
      console.error("Delete account error:", error);
      toastsStore.addToast(
        "error",
        error instanceof Error ? error.message : "Nie udało się usunąć konta"
      );
      isDeleting = false;
    }
  }

  async function handleLogout() {
    isLoggingOut = true;

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Nie udało się wylogować");
      }

      // Success - redirect to home page
      toastsStore.addToast("success", "Wylogowano pomyślnie");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      toastsStore.addToast(
        "error",
        error instanceof Error ? error.message : "Nie udało się wylogować"
      );
      isLoggingOut = false;
    }
  }
</script>

<div class="account-management">
  <section class="account-info">
    <h2 class="section-title">Informacje o koncie</h2>
    <div class="info-group">
      <span class="info-label">E-mail:</span>
      <span class="info-value">{userEmail}</span>
    </div>
  </section>

  <section class="account-actions">
    <h2 class="section-title">Akcje</h2>
    
    <div class="action-group">
      <Button
        variant="secondary"
        onClick={handleLogout}
        loading={isLoggingOut}
        testid="logout-button"
      >
        <span class="button-content">
          <span class="theme-icon">logout</span>
          <span>Wyloguj się</span>
        </span>
      </Button>
    </div>

    <div class="action-group action-group--danger">
      <p class="action-warning">
        <span class="theme-icon warning-icon">warning</span>
        <span>Usunięcie konta jest nieodwracalne i spowoduje trwałe usunięcie wszystkich Twoich danych.</span>
      </p>
      <Button
        variant="secondary"
        onClick={handleOpenDeleteConfirm}
        disabled={isDeleting}
      >
        <span class="button-content">
          <span class="theme-icon">delete_forever</span>
          <span>Usuń konto</span>
        </span>
      </Button>
    </div>
  </section>
</div>

<Prompt
  isOpen={showDeleteConfirm}
  title="Potwierdzenie usunięcia konta"
  onClose={handleCloseDeleteConfirm}
>
  <div class="delete-confirm-content">
    <p class="confirm-message">
      Czy na pewno chcesz usunąć swoje konto?
    </p>
    <p class="confirm-warning">
      <span class="theme-icon warning-icon">warning</span>
      <span>Ta operacja jest nieodwracalna. Wszystkie Twoje zestawy i przystanki zostaną trwale usunięte.</span>
    </p>
  </div>

  <div class="confirm-actions">
    <Button
      variant="primary"
      onClick={handleDeleteAccount}
      loading={isDeleting}
    >
      <span class="button-content">
        <span class="theme-icon">delete_forever</span>
        <span>Usuń konto</span>
      </span>
    </Button>
    <Button
      variant="secondary"
      onClick={handleCloseDeleteConfirm}
      disabled={isDeleting}
    >
      Anuluj
    </Button>
  </div>
</Prompt>

<style>
  .account-management {
    display: flex;
    flex-direction: column;
    gap: calc(var(--theme--spacing) * 8);
    max-width: 600px;
    margin: 0 auto;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: normal;
    margin: 0 0 calc(var(--theme--spacing) * 4) 0;
    color: var(--theme--accent-color);
    padding-bottom: var(--theme--spacing);
    border-bottom: 1px solid var(--theme--accent-color-dim);
  }

  .account-info {
    display: flex;
    flex-direction: column;
  }

  .info-group {
    display: flex;
    gap: calc(var(--theme--spacing) * 2);
    padding: calc(var(--theme--spacing) * 2);
    background-color: var(--theme--accent-color-dim);
    color: var(--theme--bg-color);
  }

  .info-label {
    font-weight: normal;
  }

  .info-value {
    font-weight: normal;
  }

  .account-actions {
    display: flex;
    flex-direction: column;
  }

  .action-group {
    display: flex;
    flex-direction: column;
    gap: calc(var(--theme--spacing) * 2);
    padding: calc(var(--theme--spacing) * 4) 0;
    border-bottom: 1px solid var(--theme--accent-color-dim);
  }

  .action-group:last-child {
    border-bottom: none;
  }

  .action-group--danger {
    padding-top: calc(var(--theme--spacing) * 6);
  }

  .action-warning {
    display: flex;
    align-items: flex-start;
    gap: var(--theme--spacing);
    margin: 0;
    padding: var(--theme--spacing);
    background-color: var(--theme--negative);
    color: var(--theme--bg-color);
    font-size: 0.875rem;
  }

  .warning-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .button-content {
    display: flex;
    align-items: center;
    gap: var(--theme--spacing);
  }

  /* Delete confirmation dialog */
  .delete-confirm-content {
    display: flex;
    flex-direction: column;
    gap: calc(var(--theme--spacing) * 2);
  }

  .confirm-message {
    margin: 0;
    font-size: 1rem;
    color: var(--theme--accent-color);
  }

  .confirm-warning {
    display: flex;
    align-items: flex-start;
    gap: var(--theme--spacing);
    margin: 0;
    padding: var(--theme--spacing);
    background-color: var(--theme--negative);
    color: var(--theme--bg-color);
    font-size: 0.875rem;
  }

  .confirm-actions {
    display: flex;
    gap: var(--theme--spacing);
    justify-content: flex-end;
    margin-top: calc(var(--theme--spacing) * 4);
  }
</style>
