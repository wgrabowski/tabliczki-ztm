<script lang="ts">
  import Button from "../base/Button.svelte";
  import TextInput from "../base/TextInput.svelte";
  import { onMount } from "svelte";
  import { toastsStore } from "../../lib/stores/toasts.store";

  /**
   * Login form component
   * Handles user authentication with email and password
   */

  let email: string = "";
  let password: string = "";
  let isSubmitting: boolean = false;
  let formError: string = "";
  let returnUrl: string = "/dashboard";
  $: registerHref = `/auth/register?returnUrl=${encodeURIComponent(returnUrl)}`;

  onMount(() => {
    const raw = new URLSearchParams(window.location.search).get("returnUrl");
    if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
      returnUrl = raw;
    }
  });

  // Client-side validation
  function validateForm(): boolean {
    if (!email.trim()) {
      formError = "Adres e-mail jest wymagany";
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      formError = "Nieprawidłowy format adresu e-mail";
      return false;
    }

    if (!password) {
      formError = "Hasło jest wymagane";
      return false;
    }

    if (password.length < 6) {
      formError = "Hasło musi mieć co najmniej 6 znaków";
      return false;
    }

    formError = "";
    return true;
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    isSubmitting = true;
    formError = "";

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Błąd logowania");
      }

      // Success - redirect to dashboard
      toastsStore.addToast("success", "Zalogowano pomyślnie");
      window.location.href = returnUrl;
    } catch (error) {
      console.error("Login error:", error);
      formError =
        error instanceof Error ? error.message : "Błędne dane logowania";
      toastsStore.addToast("error", formError);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form class="login-form" on:submit={handleSubmit} novalidate data-testid="login-form">
  <div class="form-group">
    <label for="email" class="form-label">E-mail</label>
    <TextInput
      type="email"
      name="email"
      bind:value={email}
      placeholder="twoj@email.pl"
      required
      autocomplete="email"
      disabled={isSubmitting}
      testid="login-email-input"
    />
  </div>

  <div class="form-group">
    <label for="password" class="form-label">Hasło</label>
    <TextInput
      type="password"
      name="password"
      bind:value={password}
      placeholder="Twoje hasło"
      required
      autocomplete="current-password"
      disabled={isSubmitting}
      testid="login-password-input"
    />
  </div>

  {#if formError}
    <div class="form-error" role="alert">
      <span class="theme-icon error-icon">error</span>
      <span>{formError}</span>
    </div>
  {/if}

  <div class="form-actions">
    <Button type="submit" variant="primary" loading={isSubmitting} testid="login-submit-button">
      Zaloguj się
    </Button>
  </div>

  <div class="form-footer">
    <p class="form-footer-text">
      Nie masz konta?
      <a href={registerHref} class="form-link">Zarejestruj się</a>
    </p>
  </div>
</form>

<style>
  .login-form {
    display: flex;
    flex-direction: column;
    gap: calc(var(--theme--spacing) * 4);
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--theme--spacing);
  }

  .form-label {
    font-size: 0.875rem;
    color: var(--theme--accent-color);
  }

  .form-error {
    display: flex;
    align-items: center;
    gap: var(--theme--spacing);
    padding: var(--theme--spacing);
    background-color: var(--theme--negative);
    color: var(--theme--bg-color);
    font-size: 0.875rem;
  }

  .error-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .form-actions {
    display: flex;
    flex-direction: column;
    gap: var(--theme--spacing);
  }

  .form-actions :global(.button) {
    width: 100%;
  }

  .form-footer {
    text-align: center;
    padding-top: calc(var(--theme--spacing) * 2);
    border-top: 1px solid var(--theme--accent-color-dim);
  }

  .form-footer-text {
    margin: 0;
    font-size: 0.875rem;
    color: var(--theme--accent-color);
  }

  .form-link {
    color: var(--theme--accent-color-dim);
    text-decoration: underline;
    transition: filter 0.15s ease;
  }

  .form-link:hover {
    filter: brightness(1.25);
  }

  .form-link:focus-visible {
    outline: 2px solid var(--theme--accent-color-dim);
    outline-offset: 0.2em;
  }
</style>
