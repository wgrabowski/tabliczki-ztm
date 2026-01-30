import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { get } from "svelte/store";
import { toastsStore } from "./toasts.store";

describe("Toasts Store", () => {
  beforeEach(() => {
    // Clear any existing toasts
    const currentToasts = get(toastsStore);
    currentToasts.forEach((toast) => toastsStore.removeToast(toast.id));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe("addToast", () => {
    it("should add a toast to the store", () => {
      toastsStore.addToast("success", "Test message");

      const toasts = get(toastsStore);
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe("Test message");
      expect(toasts[0].type).toBe("success");
    });

    it("should generate unique ID for each toast", () => {
      const id1 = toastsStore.addToast("info", "Message 1");
      const id2 = toastsStore.addToast("info", "Message 2");

      expect(id1).not.toBe(id2);

      const toasts = get(toastsStore);
      expect(toasts).toHaveLength(2);
      expect(toasts[0].id).toBe(id1);
      expect(toasts[1].id).toBe(id2);
    });

    it("should return toast ID", () => {
      const id = toastsStore.addToast("error", "Error message");

      expect(typeof id).toBe("string");
      expect(id).toBeTruthy();

      const toasts = get(toastsStore);
      expect(toasts[0].id).toBe(id);
    });

    it("should support all toast types", () => {
      const types: ("success" | "error" | "info" | "warning")[] = ["success", "error", "info", "warning"];

      types.forEach((type) => {
        toastsStore.removeToast(get(toastsStore)[0]?.id); // Clear previous
        toastsStore.addToast(type, `${type} message`);

        const toasts = get(toastsStore);
        expect(toasts[0].type).toBe(type);
      });
    });

    it("should set autoDismiss to true for success toasts", () => {
      toastsStore.addToast("success", "Success message");

      const toasts = get(toastsStore);
      expect(toasts[0].autoDismiss).toBe(true);
    });

    it("should set autoDismiss to true for info toasts", () => {
      toastsStore.addToast("info", "Info message");

      const toasts = get(toastsStore);
      expect(toasts[0].autoDismiss).toBe(true);
    });

    it("should set autoDismiss to false for error toasts", () => {
      toastsStore.addToast("error", "Error message");

      const toasts = get(toastsStore);
      expect(toasts[0].autoDismiss).toBe(false);
    });

    it("should set autoDismiss to false for warning toasts", () => {
      toastsStore.addToast("warning", "Warning message");

      const toasts = get(toastsStore);
      expect(toasts[0].autoDismiss).toBe(false);
    });

    it("should add multiple toasts", () => {
      toastsStore.addToast("success", "Toast 1");
      toastsStore.addToast("error", "Toast 2");
      toastsStore.addToast("info", "Toast 3");

      const toasts = get(toastsStore);
      expect(toasts).toHaveLength(3);
      expect(toasts[0].message).toBe("Toast 1");
      expect(toasts[1].message).toBe("Toast 2");
      expect(toasts[2].message).toBe("Toast 3");
    });

    it("should append new toasts to the end", () => {
      toastsStore.addToast("info", "First");
      toastsStore.addToast("info", "Second");

      const toasts = get(toastsStore);
      expect(toasts[0].message).toBe("First");
      expect(toasts[1].message).toBe("Second");
    });
  });

  describe("Auto-dismiss functionality", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should auto-dismiss success toast after 3 seconds", () => {
      toastsStore.addToast("success", "Success message");

      let toasts = get(toastsStore);
      expect(toasts).toHaveLength(1);

      // Fast-forward time by 3 seconds
      vi.advanceTimersByTime(3000);

      toasts = get(toastsStore);
      expect(toasts).toHaveLength(0);
    });

    it("should auto-dismiss info toast after 3 seconds", () => {
      toastsStore.addToast("info", "Info message");

      let toasts = get(toastsStore);
      expect(toasts).toHaveLength(1);

      vi.advanceTimersByTime(3000);

      toasts = get(toastsStore);
      expect(toasts).toHaveLength(0);
    });

    it("should NOT auto-dismiss error toast", () => {
      toastsStore.addToast("error", "Error message");

      let toasts = get(toastsStore);
      expect(toasts).toHaveLength(1);

      vi.advanceTimersByTime(5000);

      toasts = get(toastsStore);
      expect(toasts).toHaveLength(1); // Still present
    });

    it("should NOT auto-dismiss warning toast", () => {
      toastsStore.addToast("warning", "Warning message");

      let toasts = get(toastsStore);
      expect(toasts).toHaveLength(1);

      vi.advanceTimersByTime(5000);

      toasts = get(toastsStore);
      expect(toasts).toHaveLength(1); // Still present
    });

    it("should only dismiss the specific toast, not others", () => {
      toastsStore.addToast("error", "Error message"); // Will NOT auto-dismiss
      toastsStore.addToast("success", "Success message"); // Will auto-dismiss

      let toasts = get(toastsStore);
      expect(toasts).toHaveLength(2);

      vi.advanceTimersByTime(3000);

      toasts = get(toastsStore);
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe("error");
    });

    it("should handle multiple auto-dismiss toasts independently", () => {
      toastsStore.addToast("success", "First");

      vi.advanceTimersByTime(1000);

      toastsStore.addToast("success", "Second");

      // After 2 more seconds (3 total), first should be gone
      vi.advanceTimersByTime(2000);

      let toasts = get(toastsStore);
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe("Second");

      // After 1 more second (4 total, 3 for second toast), second should be gone
      vi.advanceTimersByTime(1000);

      toasts = get(toastsStore);
      expect(toasts).toHaveLength(0);
    });

    it("should not dismiss before 3 seconds", () => {
      toastsStore.addToast("success", "Success message");

      vi.advanceTimersByTime(2999);

      const toasts = get(toastsStore);
      expect(toasts).toHaveLength(1);
    });
  });

  describe("removeToast", () => {
    it("should remove toast by ID", () => {
      const id = toastsStore.addToast("error", "Error message");

      let toasts = get(toastsStore);
      expect(toasts).toHaveLength(1);

      toastsStore.removeToast(id);

      toasts = get(toastsStore);
      expect(toasts).toHaveLength(0);
    });

    it("should only remove the specified toast", () => {
      const id1 = toastsStore.addToast("error", "Error 1");
      const id2 = toastsStore.addToast("error", "Error 2");
      const id3 = toastsStore.addToast("error", "Error 3");

      toastsStore.removeToast(id2);

      const toasts = get(toastsStore);
      expect(toasts).toHaveLength(2);
      expect(toasts[0].id).toBe(id1);
      expect(toasts[1].id).toBe(id3);
    });

    it("should do nothing if toast ID does not exist", () => {
      toastsStore.addToast("error", "Error message");

      toastsStore.removeToast("non-existent-id");

      const toasts = get(toastsStore);
      expect(toasts).toHaveLength(1);
    });

    it("should work with empty store", () => {
      expect(() => toastsStore.removeToast("any-id")).not.toThrow();
    });

    it("should allow manual dismissal of auto-dismiss toasts", () => {
      vi.useFakeTimers();

      const id = toastsStore.addToast("success", "Success message");

      // Manually remove before auto-dismiss
      toastsStore.removeToast(id);

      let toasts = get(toastsStore);
      expect(toasts).toHaveLength(0);

      // Auto-dismiss timer should not cause issues
      vi.advanceTimersByTime(3000);

      toasts = get(toastsStore);
      expect(toasts).toHaveLength(0);
    });
  });

  describe("Store reactivity", () => {
    it("should be subscribable", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const values: any[] = [];

      const unsubscribe = toastsStore.subscribe((toasts) => {
        values.push(toasts.length);
      });

      toastsStore.addToast("info", "Message");

      expect(values).toContain(0); // Initial
      expect(values).toContain(1); // After add

      unsubscribe();
    });

    it("should notify subscribers on add", () => {
      const callback = vi.fn();
      const unsubscribe = toastsStore.subscribe(callback);

      toastsStore.addToast("info", "Message");

      expect(callback).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ message: "Message" })]));

      unsubscribe();
    });

    it("should notify subscribers on remove", () => {
      const callback = vi.fn();
      const id = toastsStore.addToast("error", "Error");

      const unsubscribe = toastsStore.subscribe(callback);

      toastsStore.removeToast(id);

      expect(callback).toHaveBeenCalledWith([]);

      unsubscribe();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty message", () => {
      toastsStore.addToast("info", "");

      const toasts = get(toastsStore);
      expect(toasts[0].message).toBe("");
    });

    it("should handle very long messages", () => {
      const longMessage = "A".repeat(1000);
      toastsStore.addToast("info", longMessage);

      const toasts = get(toastsStore);
      expect(toasts[0].message).toBe(longMessage);
    });

    it("should handle special characters in message", () => {
      const specialMessage = '<script>alert("xss")</script>';
      toastsStore.addToast("info", specialMessage);

      const toasts = get(toastsStore);
      expect(toasts[0].message).toBe(specialMessage);
    });

    it("should handle rapid successive adds", () => {
      for (let i = 0; i < 10; i++) {
        toastsStore.addToast("info", `Message ${i}`);
      }

      const toasts = get(toastsStore);
      expect(toasts).toHaveLength(10);
    });

    it("should generate IDs with timestamp and random component", () => {
      const id1 = toastsStore.addToast("info", "Test 1");
      const id2 = toastsStore.addToast("info", "Test 2");

      // IDs should contain timestamp (number) and random part
      expect(id1).toMatch(/^\d+-0\.\d+$/);
      expect(id2).toMatch(/^\d+-0\.\d+$/);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle mixed toast types lifecycle", () => {
      vi.useFakeTimers();

      const errorId = toastsStore.addToast("error", "Error - stays");
      toastsStore.addToast("success", "Success - auto-dismiss");
      toastsStore.addToast("warning", "Warning - stays");
      toastsStore.addToast("info", "Info - auto-dismiss");

      let toasts = get(toastsStore);
      expect(toasts).toHaveLength(4);

      // After 3 seconds, auto-dismiss toasts should be gone
      vi.advanceTimersByTime(3000);

      toasts = get(toastsStore);
      expect(toasts).toHaveLength(2);
      expect(toasts[0].type).toBe("error");
      expect(toasts[1].type).toBe("warning");

      // Manually remove error toast
      toastsStore.removeToast(errorId);

      toasts = get(toastsStore);
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe("warning");
    });

    it("should support toast queue pattern", () => {
      // Add multiple toasts that will be processed
      const ids = [
        toastsStore.addToast("error", "Error 1"),
        toastsStore.addToast("error", "Error 2"),
        toastsStore.addToast("error", "Error 3"),
      ];

      expect(get(toastsStore)).toHaveLength(3);

      // Process/dismiss them one by one
      ids.forEach((id) => toastsStore.removeToast(id));

      expect(get(toastsStore)).toHaveLength(0);
    });
  });
});
