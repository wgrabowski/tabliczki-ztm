<script lang="ts">
  import Button from "../base/Button.svelte";
  import TextInput from "../base/TextInput.svelte";
  import { onMount } from "svelte";
  import { toastsStore } from "../../lib/stores/toasts.store";

  /**
   * Registration form component
   * Handles new user registration with email, password and password confirmation
   */

  let email: string = "";
  let password: string = "";
  let confirmPassword: string = "";
  let isSubmitting: boolean = false;
  let formError: string = "";
  let returnUrl: string = "/dashboard";
  $: loginHref = `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;

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

    if (password !== confirmPassword) {
      formError = "Hasła nie są identyczne";
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Map common Supabase errors to Polish messages
        if (error.code === "USER_ALREADY_EXISTS" || error.message?.includes("already registered")) {
          throw new Error("Użytkownik z tym adresem e-mail już istnieje");
        }
        
        throw new Error(error.message || "Błąd rejestracji");
      }

      const data: { requires_email_confirmation?: boolean } = await response.json();

      if (data.requires_email_confirmation) {
        const message =
          "Konto utworzone, ale wymaga potwierdzenia e-mail (w Supabase włącz Auto-confirm dla MVP).";
        toastsStore.addToast("success", message);
        window.location.href = `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;
        return;
      }

      // Success - redirect to dashboard (or returnUrl)
      toastsStore.addToast("success", "Konto utworzone pomyślnie");
      window.location.href = returnUrl;
    } catch (error) {
      console.error("Registration error:", error);
      formError =
        error instanceof Error ? error.message : "Nie udało się utworzyć konta";
      toastsStore.addToast("error", formError);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form class="register-form" on:submit={handleSubmit} novalidate>
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
    />
  </div>

  <div class="form-group">
    <label for="password" class="form-label">Hasło</label>
    <TextInput
      type="password"
      name="password"
      bind:value={password}
      placeholder="Minimum 6 znaków"
      required
      autocomplete="new-password"
      disabled={isSubmitting}
    />
  </div>

  <div class="form-group">
    <label for="confirmPassword" class="form-label">Powtórz hasło</label>
    <TextInput
      type="password"
      name="confirmPassword"
      bind:value={confirmPassword}
      placeholder="Powtórz hasło"
      required
      autocomplete="new-password"
      disabled={isSubmitting}
    />
  </div>

  {#if formError}
    <div class="form-error" role="alert">
      <span class="theme-icon error-icon">error</span>
      <span>{formError}</span>
    </div>
  {/if}

  <div class="form-actions">
    <Button type="submit" variant="primary" loading={isSubmitting}>
      Zarejestruj się
    </Button>
  </div>

  <div class="form-footer">
    <p class="form-footer-text">
      Masz już konto?
      <a href={loginHref} class="form-link">Zaloguj się</a>
    </p>
  </div>
</form>

<style>
  .register-form {
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
