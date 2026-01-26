<script lang="ts">
  import { onMount } from "svelte";
  import IconButton from "@components/base/IconButton.svelte";

  /**
   * Theme toggle button for light/dark mode
   * Uses CSS color-scheme and stores preference in localStorage
   */

  let isDark = false;

  onMount(() => {
    // Check saved preference or system preference
    const savedTheme = localStorage.getItem("theme");
    
    if (savedTheme) {
      isDark = savedTheme === "dark";
    } else {
      // Use system preference
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    applyTheme();
  });

  function toggleTheme() {
    isDark = !isDark;
    applyTheme();
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  function applyTheme() {
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }

  $: icon = isDark ? "light_mode" : "dark_mode";
  $: title = isDark ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw";
</script>

<IconButton {icon} {title} onClick={toggleTheme} variant="inverted" />
