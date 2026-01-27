<script lang="ts">
  import { onMount } from "svelte";
  import IconButton from "@components/base/IconButton.svelte";

  /**
   * Theme toggle button for light/dark mode
   * Theme is initialized in Layout.astro to prevent flash
   * This component only handles toggling
   */

  let isDark = false;

  onMount(() => {
    // Read current theme from DOM (already set by inline script in Layout.astro)
    isDark = document.documentElement.style.colorScheme === "dark";
  });

  function toggleTheme() {
    isDark = !isDark;
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  $: icon = isDark ? "light_mode" : "dark_mode";
  $: title = isDark ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw";
</script>

<div data-testid="theme-toggle">
  <IconButton {icon} {title} onClick={toggleTheme} variant="inverted" />
</div>
