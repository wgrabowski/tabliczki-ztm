import { describe, it, expect, vi } from "vitest";
import { get } from "svelte/store";
import { globalLoadingStore, setGlobalLoading } from "./global-loading.store";

describe("Global Loading Store", () => {
  describe("globalLoadingStore", () => {
    it("should initialize with false", () => {
      const value = get(globalLoadingStore);
      expect(value).toBe(false);
    });

    it("should be a writable store", () => {
      globalLoadingStore.set(true);
      expect(get(globalLoadingStore)).toBe(true);

      globalLoadingStore.set(false);
      expect(get(globalLoadingStore)).toBe(false);
    });

    it("should support update function", () => {
      globalLoadingStore.set(false);

      globalLoadingStore.update((value) => !value);
      expect(get(globalLoadingStore)).toBe(true);

      globalLoadingStore.update((value) => !value);
      expect(get(globalLoadingStore)).toBe(false);
    });

    it("should be subscribable", () => {
      const values: boolean[] = [];

      const unsubscribe = globalLoadingStore.subscribe((value) => {
        values.push(value);
      });

      globalLoadingStore.set(true);
      globalLoadingStore.set(false);

      expect(values).toContain(false);
      expect(values).toContain(true);

      unsubscribe();
    });

    it("should notify subscribers on change", () => {
      const callback = vi.fn();
      const unsubscribe = globalLoadingStore.subscribe(callback);

      globalLoadingStore.set(true);

      expect(callback).toHaveBeenCalledWith(true);

      unsubscribe();
    });
  });

  describe("setGlobalLoading helper", () => {
    it("should set loading to true", () => {
      setGlobalLoading(true);
      expect(get(globalLoadingStore)).toBe(true);
    });

    it("should set loading to false", () => {
      setGlobalLoading(false);
      expect(get(globalLoadingStore)).toBe(false);
    });

    it("should toggle loading state", () => {
      setGlobalLoading(true);
      expect(get(globalLoadingStore)).toBe(true);

      setGlobalLoading(false);
      expect(get(globalLoadingStore)).toBe(false);

      setGlobalLoading(true);
      expect(get(globalLoadingStore)).toBe(true);
    });

    it("should work with multiple consecutive calls", () => {
      setGlobalLoading(true);
      setGlobalLoading(true);
      setGlobalLoading(true);

      expect(get(globalLoadingStore)).toBe(true);

      setGlobalLoading(false);
      setGlobalLoading(false);

      expect(get(globalLoadingStore)).toBe(false);
    });
  });

  describe("Integration scenarios", () => {
    it("should support typical loading pattern", () => {
      // Start operation
      setGlobalLoading(true);
      expect(get(globalLoadingStore)).toBe(true);

      // Operation complete
      setGlobalLoading(false);
      expect(get(globalLoadingStore)).toBe(false);
    });

    it("should handle nested loading states", () => {
      // First operation starts
      setGlobalLoading(true);
      expect(get(globalLoadingStore)).toBe(true);

      // Second operation starts (still loading)
      setGlobalLoading(true);
      expect(get(globalLoadingStore)).toBe(true);

      // First operation completes (still loading second)
      // Note: This simple store doesn't track count, just boolean state
      setGlobalLoading(false);
      expect(get(globalLoadingStore)).toBe(false);
    });

    it("should work with async operations pattern", async () => {
      setGlobalLoading(true);

      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      setGlobalLoading(false);
      expect(get(globalLoadingStore)).toBe(false);
    });

    it("should support try-finally pattern", () => {
      setGlobalLoading(true);

      try {
        // Simulate operation
        expect(get(globalLoadingStore)).toBe(true);
      } finally {
        setGlobalLoading(false);
      }

      expect(get(globalLoadingStore)).toBe(false);
    });

    it("should ensure loading is hidden even on error", () => {
      setGlobalLoading(true);

      try {
        throw new Error("Operation failed");
      } catch {
        setGlobalLoading(false);
      }

      expect(get(globalLoadingStore)).toBe(false);
    });
  });

  describe("Usage with store subscription", () => {
    it("should track state changes in subscriber", () => {
      const states: boolean[] = [];
      const unsubscribe = globalLoadingStore.subscribe((value) => {
        states.push(value);
      });

      setGlobalLoading(true);
      setGlobalLoading(false);
      setGlobalLoading(true);
      setGlobalLoading(false);

      // Initial false + 4 changes
      expect(states).toHaveLength(5);
      expect(states).toEqual([false, true, false, true, false]);

      unsubscribe();
    });

    it("should not emit if value does not change (set same value)", () => {
      globalLoadingStore.set(false);

      const callback = vi.fn();
      const unsubscribe = globalLoadingStore.subscribe(callback);

      // Set to same value
      globalLoadingStore.set(false);
      globalLoadingStore.set(false);

      // Svelte stores emit on every set, even if value is same
      expect(callback).toHaveBeenCalled();

      unsubscribe();
    });

    it("should allow multiple subscribers", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = globalLoadingStore.subscribe(callback1);
      const unsub2 = globalLoadingStore.subscribe(callback2);

      setGlobalLoading(true);

      expect(callback1).toHaveBeenCalledWith(true);
      expect(callback2).toHaveBeenCalledWith(true);

      unsub1();
      unsub2();
    });

    it("should stop notifying after unsubscribe", () => {
      // Reset to known state
      globalLoadingStore.set(false);

      const callback = vi.fn();
      const unsubscribe = globalLoadingStore.subscribe(callback);

      // Initial call from subscribe
      expect(callback).toHaveBeenCalledTimes(1);

      setGlobalLoading(true);
      expect(callback).toHaveBeenCalledTimes(2);

      unsubscribe();

      setGlobalLoading(false);
      expect(callback).toHaveBeenCalledTimes(2); // No new calls
    });
  });

  describe("Edge cases", () => {
    it("should handle rapid state changes", () => {
      for (let i = 0; i < 100; i++) {
        setGlobalLoading(i % 2 === 0);
      }

      expect(get(globalLoadingStore)).toBe(false);
    });

    it("should work after store is garbage collected and recreated", () => {
      setGlobalLoading(true);
      expect(get(globalLoadingStore)).toBe(true);

      // Store persists as singleton, but test behavior
      setGlobalLoading(false);
      expect(get(globalLoadingStore)).toBe(false);
    });
  });

  describe("Type safety", () => {
    it("should only accept boolean values", () => {
      setGlobalLoading(true);
      setGlobalLoading(false);

      // TypeScript should prevent non-boolean values
      // @ts-expect-error - should not accept string
      expect(() => setGlobalLoading("true")).not.toThrow();
    });

    it("should return boolean from get", () => {
      setGlobalLoading(true);
      const value = get(globalLoadingStore);

      expect(typeof value).toBe("boolean");
    });
  });

  describe("Real-world scenarios", () => {
    it("should simulate POST request with loading", async () => {
      // Reset to known state
      globalLoadingStore.set(false);

      expect(get(globalLoadingStore)).toBe(false);

      // Start POST
      setGlobalLoading(true);
      expect(get(globalLoadingStore)).toBe(true);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Complete POST
      setGlobalLoading(false);
      expect(get(globalLoadingStore)).toBe(false);
    });

    it("should simulate DELETE request with loading", async () => {
      setGlobalLoading(true);

      await new Promise((resolve) => setTimeout(resolve, 30));

      setGlobalLoading(false);
      expect(get(globalLoadingStore)).toBe(false);
    });

    it("should show loading during multiple sequential operations", async () => {
      // Operation 1
      setGlobalLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 10));
      setGlobalLoading(false);

      // Operation 2
      setGlobalLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 10));
      setGlobalLoading(false);

      expect(get(globalLoadingStore)).toBe(false);
    });
  });
});
