import { describe, it, expect } from "vitest";
import { ztmDeparturesQuerySchema } from "@/lib/validation/ztm.validation";

describe("ZTM Validation", () => {
  describe("ztmDeparturesQuerySchema", () => {
    it("should accept valid positive integer stop IDs", () => {
      const result = ztmDeparturesQuerySchema.safeParse({ stopId: "117" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stopId).toBe(117);
      }
    });

    it("should accept missing stopId (optional)", () => {
      const result = ztmDeparturesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stopId).toBeUndefined();
      }
    });

    it("should reject zero stop ID", () => {
      const result = ztmDeparturesQuerySchema.safeParse({ stopId: "0" });
      expect(result.success).toBe(false);
    });

    it("should reject negative stop ID", () => {
      const result = ztmDeparturesQuerySchema.safeParse({ stopId: "-1" });
      expect(result.success).toBe(false);
    });

    it("should reject non-numeric stop ID", () => {
      const result = ztmDeparturesQuerySchema.safeParse({ stopId: "abc" });
      expect(result.success).toBe(false);
    });

    it("should reject float stop ID", () => {
      const result = ztmDeparturesQuerySchema.safeParse({ stopId: "117.5" });
      expect(result.success).toBe(false);
    });
  });
});
