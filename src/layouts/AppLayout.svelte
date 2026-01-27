<script lang="ts">
  import GlobalPreloader from "@components/layout/GlobalPreloader.svelte";
  import ToastStack from "@components/layout/ToastStack.svelte";
  import Clock from "@components/shared/Clock.svelte";
  import ThemeToggle from "@components/shared/ThemeToggle.svelte";

  /**
   * Shared application layout with header, global UI components
   * header-right is fixed with Clock and ThemeToggle
   */
</script>

<div class="app-layout">
  <header class="app-header theme-outlined">
    <div class="app-header__left">
      <slot name="header-left" />
    </div>
    <div class="app-header__right">
      <ThemeToggle />
      <Clock />
    </div>
  </header>

  <main class="app-main">
    <slot />
  </main>
</div>
  <!-- Global UI components -->
  <GlobalPreloader />
  <ToastStack />


<style>
  .app-layout {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    padding: var(--theme--spacing);
    max-width: 2400px;
    margin: 0 auto;
    width: 96dvw;
  }

  .app-header {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--theme--spacing) calc(var(--theme--spacing) * 2);
    border-bottom: 1px solid var(--theme--accent-color-dim);
  }

  .app-header__left,
  .app-header__right {
    display: flex;
    align-items: center;
    gap: var(--theme--spacing);
  }

  .app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>
