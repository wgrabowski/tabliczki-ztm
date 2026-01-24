<script lang="ts">
  import IconButton from "./base/IconButton.svelte";

  /**
   * Account navigation button
   * Displayed in the left slot of the header
   */
  function handleClick() {
    window.location.href = "/auth/account";
  }
</script>

<IconButton icon="account_circle" title="Konto" variant="inverted" onClick={handleClick} />
