<script lang="ts">
  import IconButton from "@components/base/IconButton.svelte";

  /**
   * Button to navigate back to dashboard (sets list)
   * Default href: /dashboard
   */
  export let href: string = "/dashboard";

  function handleClick() {
    window.location.href = href;
  }
</script>

<IconButton
  variant="inverted"
  icon="dashboard_2_edit"
  title="Wróć do listy zestawów"
  onClick={handleClick}
/>
