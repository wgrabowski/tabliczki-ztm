<script context="module" lang="ts">
  /**
   * Item type for Autocomplete
   */
  export interface AutocompleteItem {
    id: number | string;
    label: string; // Main text to display
    secondaryLabel?: string; // Optional secondary text (e.g., code)
    searchableText: string; // Text used for filtering
  }
</script>

<script lang="ts">
  /**
   * Universal autocomplete component implementing ARIA Combobox Pattern
   * Features:
   * - Client-side filtering with debouncing
   * - Keyboard navigation (↑↓, Enter, Esc)
   * - Mouse navigation (hover, click)
   * - Highlight matching fragments
   * - Full ARIA accessibility
   */

  export let items: AutocompleteItem[] = [];
  export let placeholder: string = "Szukaj...";
  export let minChars: number = 2;
  export let maxResults: number = 10;
  export let debounceMs: number = 300;
  export let clearOnSelect: boolean = false;
  export let onSelect: (item: AutocompleteItem) => void;
  export let value: string = ""; // Bind query value externally

  // Use value as query directly
  $: query = value;
  let isOpen: boolean = false;
  let highlightedIndex: number = -1;
  let filteredItems: AutocompleteItem[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let inputElement: HTMLInputElement;
  let listboxElement: HTMLUListElement;
  let justSelected: boolean = false; // Prevent auto-opening after selection

  // Unique IDs for ARIA
  const listboxId = `autocomplete-listbox-${Math.random().toString(36).substr(2, 9)}`;
  const getOptionId = (index: number) => `${listboxId}-option-${index}`;

  // Reactive: Filter items with debouncing
  $: {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (query.length < minChars) {
      filteredItems = [];
      isOpen = false;
    } else {
      debounceTimer = setTimeout(() => {
        const previousLength = filteredItems.length;
        filteredItems = filterItems(query, items).slice(0, maxResults);
        
        // Only open list if user is typing, not if item was just selected
        if (!justSelected) {
          isOpen = filteredItems.length > 0;
        }
        
        // Only reset highlight if results changed significantly
        if (previousLength !== filteredItems.length) {
          highlightedIndex = -1;
        }
      }, debounceMs);
    }
  }

  // Reactive: Scroll to highlighted item
  $: if (highlightedIndex >= 0 && listboxElement) {
    scrollToHighlighted();
  }

  // Scroll highlighted item into view
  function scrollToHighlighted() {
    const optionElement = document.getElementById(getOptionId(highlightedIndex));
    if (optionElement && listboxElement) {
      const listboxRect = listboxElement.getBoundingClientRect();
      const optionRect = optionElement.getBoundingClientRect();
      
      if (optionRect.bottom > listboxRect.bottom) {
        optionElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else if (optionRect.top < listboxRect.top) {
        optionElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }

  // Filter function (case-insensitive)
  function filterItems(searchQuery: string, allItems: AutocompleteItem[]): AutocompleteItem[] {
    const lowerQuery = searchQuery.toLowerCase();
    return allItems.filter((item) => item.searchableText.toLowerCase().includes(lowerQuery));
  }

  // Highlight matched text
  function highlightMatch(text: string, searchQuery: string): string {
    if (!searchQuery) return text;
    
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  }

  // Keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    // Handle navigation keys
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen && filteredItems.length > 0) {
          isOpen = true;
          highlightedIndex = 0;
        } else if (isOpen && filteredItems.length > 0) {
          if (highlightedIndex < 0) {
            highlightedIndex = 0;
          } else {
            highlightedIndex = Math.min(highlightedIndex + 1, filteredItems.length - 1);
          }
        }
        break;

      case "ArrowUp":
        event.preventDefault();
        if (isOpen && filteredItems.length > 0) {
          if (highlightedIndex <= 0) {
            highlightedIndex = 0;
          } else {
            highlightedIndex = Math.max(highlightedIndex - 1, 0);
          }
        }
        break;

      case "Enter":
        event.preventDefault();
        if (isOpen && highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
          selectItem(filteredItems[highlightedIndex]);
        }
        break;

      case "Escape":
        event.preventDefault();
        if (isOpen) {
          closeList();
        }
        break;
    }
  }

  // Select item
  function selectItem(item: AutocompleteItem) {
    onSelect(item);
    
    if (clearOnSelect) {
      value = "";
    } else {
      value = item.label;
    }
    
    justSelected = true; // Prevent auto-opening after selection
    closeList();
    inputElement?.focus();
  }

  // Handle input event - reset justSelected flag when user types
  function handleInput() {
    justSelected = false;
  }

  // Close list
  function closeList() {
    isOpen = false;
    highlightedIndex = -1;
  }

  // Handle input blur (with delay to allow click on options)
  function handleBlur() {
    setTimeout(() => {
      closeList();
    }, 200);
  }

  // Handle option mouse enter
  function handleOptionMouseEnter(index: number) {
    highlightedIndex = index;
  }
</script>

<div class="autocomplete">
  <input
    bind:this={inputElement}
    bind:value={value}
    type="search"
    role="combobox"
    aria-expanded={isOpen}
    aria-controls={listboxId}
    aria-autocomplete="list"
    aria-activedescendant={highlightedIndex >= 0 ? getOptionId(highlightedIndex) : undefined}
    {placeholder}
    class="autocomplete-input theme-outlined theme-noradius theme-focusable"
    on:input={handleInput}
    on:keydown={handleKeydown}
    on:blur={handleBlur}
  />

  {#if isOpen && filteredItems.length > 0}
    <ul
      bind:this={listboxElement}
      role="listbox"
      id={listboxId}
      aria-label="Wyniki wyszukiwania"
      class="autocomplete-listbox theme-outlined theme-noradius"
    >
      {#each filteredItems as item, index (item.id)}
        <li
          role="option"
          id={getOptionId(index)}
          aria-selected={index === highlightedIndex}
          class="autocomplete-option"
          class:highlighted={index === highlightedIndex}
          on:mousedown|preventDefault={() => selectItem(item)}
          on:mouseenter={() => handleOptionMouseEnter(index)}
        >
          <div class="option-label">
            {@html highlightMatch(item.label, query)}
          </div>
          {#if item.secondaryLabel}
            <div class="option-secondary">
              {@html highlightMatch(item.secondaryLabel, query)}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .autocomplete {
    position: relative;
    width: 100%;
  }

  /* Input */
  .autocomplete-input {
    width: 100%;
    padding: var(--theme--spacing);
    font-size: 1rem;
    background: var(--theme--bg-color);
    color: var(--theme--accent-color);
    border: 1px solid var(--theme--accent-color-dim);
  }

  .autocomplete-input::placeholder {
    color: var(--theme--accent-color-dim);
  }

  /* Listbox */
  .autocomplete-listbox {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 300px;
    overflow-y: auto;
    background: var(--theme--bg-color);
    border: 1px solid var(--theme--accent-color-dim);
    border-top: none;
    list-style: none;
    margin: 0;
    padding: 0;
    z-index: 1000;
  }

  /* Option */
  .autocomplete-option {
    padding: var(--theme--spacing);
    cursor: pointer;
    color: var(--theme--accent-color);
    border-bottom: 1px solid var(--theme--accent-color-dim);
  }

  .autocomplete-option:last-child {
    border-bottom: none;
  }

  .autocomplete-option.highlighted,
  .autocomplete-option:hover {
    background: var(--theme--accent-color-dim);
    color: var(--theme--bg-color);
  }

  .option-label {
    font-weight: bold;
  }

  .option-secondary {
    font-size: 0.875rem;
    opacity: 0.8;
    margin-top: calc(var(--theme--spacing) / 2);
  }

  /* Highlight matching text */
  .autocomplete-option :global(mark) {
    background: transparent;
    font-weight: bold;
    color: inherit;
    text-decoration: underline;
  }
</style>
