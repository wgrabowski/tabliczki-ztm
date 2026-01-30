import { describe, it, expect } from "vitest";
import {
  ztmDeparturesQuerySchema,
  ztmStopsQuerySchema,
  ztmStopSchema,
  ztmDepartureSchema,
  ztmStopsUpstreamSchema,
  ztmDeparturesUpstreamSchema,
  ztmAllDeparturesUpstreamSchema,
} from "./ztm.validation";
import { ZodError } from "zod";

describe("ZTM Validation", () => {
  describe("ztmDeparturesQuerySchema", () => {
    it("should accept valid positive integer stopId", () => {
      const validStopIds = [1, 117, 199, 9999];

      validStopIds.forEach((stopId) => {
        const result = ztmDeparturesQuerySchema.safeParse({ stopId });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.stopId).toBe(stopId);
        }
      });
    });

    it("should coerce string to number", () => {
      const result = ztmDeparturesQuerySchema.safeParse({ stopId: "117" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stopId).toBe(117);
        expect(typeof result.data.stopId).toBe("number");
      }
    });

    it("should accept undefined/missing stopId (optional)", () => {
      const result = ztmDeparturesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stopId).toBeUndefined();
      }
    });

    it("should reject zero and negative numbers", () => {
      const invalidStopIds = [0, -1, -117];

      invalidStopIds.forEach((stopId) => {
        const result = ztmDeparturesQuerySchema.safeParse({ stopId });
        expect(result.success).toBe(false);
      });
    });

    it("should reject non-integer values", () => {
      const result = ztmDeparturesQuerySchema.safeParse({ stopId: 117.5 });
      expect(result.success).toBe(false);
    });

    it("should reject invalid string values", () => {
      const invalidValues = ["abc", "not-a-number", ""];

      invalidValues.forEach((value) => {
        const result = ztmDeparturesQuerySchema.safeParse({ stopId: value });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("ztmStopsQuerySchema", () => {
    it("should parse comma-separated stop IDs", () => {
      const result = ztmStopsQuerySchema.safeParse({ stopIds: "117,199,250" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stopIds).toEqual([117, 199, 250]);
      }
    });

    it("should trim whitespace around IDs", () => {
      const result = ztmStopsQuerySchema.safeParse({ stopIds: " 117 , 199 , 250 " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stopIds).toEqual([117, 199, 250]);
      }
    });

    it("should deduplicate stop IDs", () => {
      const result = ztmStopsQuerySchema.safeParse({ stopIds: "117,199,117,250,199" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stopIds).toEqual([117, 199, 250]);
        expect(result.data.stopIds.length).toBe(3);
      }
    });

    it("should handle single stop ID", () => {
      const result = ztmStopsQuerySchema.safeParse({ stopIds: "117" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stopIds).toEqual([117]);
      }
    });

    it("should return empty array for undefined", () => {
      const result = ztmStopsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stopIds).toEqual([]);
      }
    });

    it("should return empty array for empty string", () => {
      const result = ztmStopsQuerySchema.safeParse({ stopIds: "" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stopIds).toEqual([]);
      }
    });

    it("should return empty array for whitespace-only string", () => {
      const result = ztmStopsQuerySchema.safeParse({ stopIds: "   " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stopIds).toEqual([]);
      }
    });

    it("should reject zero in stop IDs", () => {
      const result = ztmStopsQuerySchema.safeParse({ stopIds: "117,0,199" });
      expect(result.success).toBe(false);
    });

    it("should reject negative numbers", () => {
      const result = ztmStopsQuerySchema.safeParse({ stopIds: "117,-5,199" });
      expect(result.success).toBe(false);
    });

    it("should reject non-numeric values", () => {
      const invalidValues = ["abc,def", "117,abc,199", "not-numbers", "117,199,test"];

      invalidValues.forEach((value) => {
        const result = ztmStopsQuerySchema.safeParse({ stopIds: value });
        expect(result.success).toBe(false);
      });
    });

    it("should reject floating point numbers", () => {
      const result = ztmStopsQuerySchema.safeParse({ stopIds: "117,199.5,250" });
      expect(result.success).toBe(false);
    });

    it("should handle trailing/leading commas gracefully", () => {
      const result = ztmStopsQuerySchema.safeParse({ stopIds: ",117,199," });
      expect(result.success).toBe(true);
      if (result.success) {
        // Empty strings are filtered out by .filter(Boolean)
        expect(result.data.stopIds).toEqual([117, 199]);
      }
    });
  });

  describe("ztmStopSchema (upstream response)", () => {
    it("should accept valid stop data", () => {
      const validStop = {
        stopId: 117,
        stopCode: "CODE123",
        stopName: "Przystanek Testowy",
        stopShortname: 42,
        stopDesc: "Description",
        subName: "Sub name",
        date: "2024-01-30",
        stopLat: 54.352,
        stopLon: 18.646,
        type: "bus",
        zoneId: 1,
        zoneName: "Zone A",
        stopUrl: "https://example.com",
        locationType: "stop",
        parentStation: null,
        stopTimezone: "Europe/Warsaw",
        wheelchairBoarding: 1,
        virtual: 0,
        nonpassenger: 0,
        depot: 0,
        ticketZoneBorder: 0,
        onDemand: 0,
        activationDate: "2024-01-01",
      };

      const result = ztmStopSchema.safeParse(validStop);
      expect(result.success).toBe(true);
    });

    it("should coerce string stopId to number", () => {
      const stop = {
        stopId: "117",
        stopCode: null,
        stopName: null,
        stopShortname: null,
        stopDesc: null,
        date: null,
        stopLat: null,
        stopLon: null,
        type: null,
        zoneId: null,
        zoneName: null,
        wheelchairBoarding: null,
        virtual: null,
        nonpassenger: null,
        depot: null,
        ticketZoneBorder: null,
        onDemand: null,
        activationDate: null,
      };

      const result = ztmStopSchema.safeParse(stop);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stopId).toBe(117);
        expect(typeof result.data.stopId).toBe("number");
      }
    });

    it("should handle null values for optional fields", () => {
      const stopWithNulls = {
        stopId: 117,
        stopCode: null,
        stopName: null,
        stopShortname: null,
        stopDesc: null,
        date: null,
        stopLat: null,
        stopLon: null,
        type: null,
        zoneId: null,
        zoneName: null,
        wheelchairBoarding: null,
        virtual: null,
        nonpassenger: null,
        depot: null,
        ticketZoneBorder: null,
        onDemand: null,
        activationDate: null,
      };

      const result = ztmStopSchema.safeParse(stopWithNulls);
      expect(result.success).toBe(true);
    });

    it("should coerce numeric strings to numbers for numeric fields", () => {
      const stop = {
        stopId: "117",
        stopCode: null,
        stopName: null,
        stopShortname: "42",
        stopDesc: null,
        date: null,
        stopLat: "54.352",
        stopLon: "18.646",
        type: null,
        zoneId: "1",
        zoneName: null,
        wheelchairBoarding: "1",
        virtual: "0",
        nonpassenger: "0",
        depot: "0",
        ticketZoneBorder: "0",
        onDemand: "0",
        activationDate: null,
      };

      const result = ztmStopSchema.safeParse(stop);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.stopLat).toBe("number");
        expect(typeof result.data.stopLon).toBe("number");
        expect(result.data.stopLat).toBe(54.352);
      }
    });

    it("should handle empty string as null for nullable numbers", () => {
      const stop = {
        stopId: 117,
        stopCode: "",
        stopName: "",
        stopShortname: "",
        stopDesc: null,
        date: null,
        stopLat: "",
        stopLon: "",
        type: null,
        zoneId: "",
        zoneName: null,
        wheelchairBoarding: "",
        virtual: "",
        nonpassenger: null,
        depot: null,
        ticketZoneBorder: null,
        onDemand: null,
        activationDate: null,
      };

      const result = ztmStopSchema.safeParse(stop);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stopLat).toBeNull();
        expect(result.data.stopLon).toBeNull();
      }
    });
  });

  describe("ztmDepartureSchema (upstream response)", () => {
    it("should accept valid departure data", () => {
      const validDeparture = {
        id: "dep-123",
        delayInSeconds: 120,
        estimatedTime: "2024-01-30T10:30:00",
        headsign: "Dworzec Główny",
        routeShortName: "3",
        routeId: 301,
        scheduledTripStartTime: "2024-01-30T10:00:00",
        tripId: 12345,
        status: "SCHEDULED",
        theoreticalTime: "2024-01-30T10:28:00",
        timestamp: "2024-01-30T10:25:00",
        trip: 12345,
        vehicleCode: 5001,
        vehicleId: 123,
        vehicleService: "BUS",
      };

      const result = ztmDepartureSchema.safeParse(validDeparture);
      expect(result.success).toBe(true);
    });

    it("should handle null values in departure fields", () => {
      const departureWithNulls = {
        id: "dep-456",
        delayInSeconds: null,
        estimatedTime: "2024-01-30T10:30:00",
        headsign: null,
        routeShortName: null,
        routeId: null,
        scheduledTripStartTime: null,
        tripId: null,
        status: "UNKNOWN",
        theoreticalTime: null,
        timestamp: "2024-01-30T10:25:00",
        trip: null,
        vehicleCode: null,
        vehicleId: null,
        vehicleService: null,
      };

      const result = ztmDepartureSchema.safeParse(departureWithNulls);
      expect(result.success).toBe(true);
    });

    it("should coerce string numbers to integers", () => {
      const departure = {
        id: "dep-789",
        delayInSeconds: "60",
        estimatedTime: "2024-01-30T10:30:00",
        headsign: null,
        routeShortName: null,
        routeId: "301",
        scheduledTripStartTime: null,
        tripId: "12345",
        status: "SCHEDULED",
        theoreticalTime: null,
        timestamp: "2024-01-30T10:25:00",
        trip: "12345",
        vehicleCode: "5001",
        vehicleId: "123",
        vehicleService: null,
      };

      const result = ztmDepartureSchema.safeParse(departure);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.delayInSeconds).toBe(60);
        expect(typeof result.data.delayInSeconds).toBe("number");
        expect(result.data.routeId).toBe(301);
      }
    });

    it("should handle empty string as null for numeric fields", () => {
      const departure = {
        id: "dep-empty",
        delayInSeconds: "",
        estimatedTime: "2024-01-30T10:30:00",
        headsign: null,
        routeShortName: null,
        routeId: "",
        scheduledTripStartTime: null,
        tripId: "",
        status: "SCHEDULED",
        theoreticalTime: null,
        timestamp: "2024-01-30T10:25:00",
        trip: "",
        vehicleCode: "",
        vehicleId: "",
        vehicleService: null,
      };

      const result = ztmDepartureSchema.safeParse(departure);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.delayInSeconds).toBeNull();
        expect(result.data.routeId).toBeNull();
      }
    });
  });

  describe("ztmStopsUpstreamSchema (full response)", () => {
    it("should validate complete stops response", () => {
      const stopsResponse = {
        lastUpdate: "2024-01-30T10:00:00",
        stops: [
          {
            stopId: 117,
            stopCode: "CODE1",
            stopName: "Stop 1",
            stopShortname: null,
            stopDesc: null,
            date: null,
            stopLat: 54.352,
            stopLon: 18.646,
            type: "bus",
            zoneId: 1,
            zoneName: "Zone A",
            wheelchairBoarding: 1,
            virtual: 0,
            nonpassenger: 0,
            depot: 0,
            ticketZoneBorder: 0,
            onDemand: 0,
            activationDate: null,
          },
        ],
      };

      const result = ztmStopsUpstreamSchema.safeParse(stopsResponse);
      expect(result.success).toBe(true);
    });

    it("should accept empty stops array", () => {
      const emptyResponse = {
        lastUpdate: "2024-01-30T10:00:00",
        stops: [],
      };

      const result = ztmStopsUpstreamSchema.safeParse(emptyResponse);
      expect(result.success).toBe(true);
    });

    it("should reject missing lastUpdate", () => {
      const invalidResponse = {
        stops: [],
      };

      const result = ztmStopsUpstreamSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it("should reject missing stops array", () => {
      const invalidResponse = {
        lastUpdate: "2024-01-30T10:00:00",
      };

      const result = ztmStopsUpstreamSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe("ztmDeparturesUpstreamSchema (full response)", () => {
    it("should validate complete departures response", () => {
      const departuresResponse = {
        lastUpdate: "2024-01-30T10:00:00",
        departures: [
          {
            id: "dep-1",
            delayInSeconds: 0,
            estimatedTime: "2024-01-30T10:30:00",
            headsign: "Downtown",
            routeShortName: "3",
            routeId: 301,
            scheduledTripStartTime: "2024-01-30T10:00:00",
            tripId: 12345,
            status: "SCHEDULED",
            theoreticalTime: "2024-01-30T10:30:00",
            timestamp: "2024-01-30T10:25:00",
            trip: 12345,
            vehicleCode: 5001,
            vehicleId: 123,
            vehicleService: "BUS",
          },
        ],
      };

      const result = ztmDeparturesUpstreamSchema.safeParse(departuresResponse);
      expect(result.success).toBe(true);
    });

    it("should accept empty departures array", () => {
      const emptyResponse = {
        lastUpdate: "2024-01-30T10:00:00",
        departures: [],
      };

      const result = ztmDeparturesUpstreamSchema.safeParse(emptyResponse);
      expect(result.success).toBe(true);
    });
  });

  describe("ztmAllDeparturesUpstreamSchema (keyed by stopId)", () => {
    it("should validate record keyed by stopId", () => {
      const allDeparturesResponse = {
        "117": {
          lastUpdate: "2024-01-30T10:00:00",
          departures: [
            {
              id: "dep-1",
              delayInSeconds: 0,
              estimatedTime: "2024-01-30T10:30:00",
              headsign: "Downtown",
              routeShortName: "3",
              routeId: 301,
              scheduledTripStartTime: null,
              tripId: 12345,
              status: "SCHEDULED",
              theoreticalTime: null,
              timestamp: "2024-01-30T10:25:00",
              trip: 12345,
              vehicleCode: 5001,
              vehicleId: 123,
              vehicleService: null,
            },
          ],
        },
        "199": {
          lastUpdate: "2024-01-30T10:00:00",
          departures: [],
        },
      };

      const result = ztmAllDeparturesUpstreamSchema.safeParse(allDeparturesResponse);
      expect(result.success).toBe(true);
    });

    it("should accept empty object", () => {
      const result = ztmAllDeparturesUpstreamSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should allow any string key", () => {
      const response = {
        customKey: {
          lastUpdate: "2024-01-30T10:00:00",
          departures: [],
        },
      };

      const result = ztmAllDeparturesUpstreamSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe("Edge cases and error handling", () => {
    it("should throw ZodError on validation failure", () => {
      expect(() => ztmDeparturesQuerySchema.parse({ stopId: -1 })).toThrow(ZodError);
      expect(() => ztmStopsQuerySchema.parse({ stopIds: "invalid" })).toThrow(ZodError);
    });

    it("should handle very large stop IDs", () => {
      const result = ztmDeparturesQuerySchema.safeParse({ stopId: 999999999 });
      expect(result.success).toBe(true);
    });

    it("should handle multiple consecutive commas in stopIds", () => {
      const result = ztmStopsQuerySchema.safeParse({ stopIds: "117,,,,199" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stopIds).toEqual([117, 199]);
      }
    });

    it("should preserve order in stopIds after deduplication", () => {
      const result = ztmStopsQuerySchema.safeParse({ stopIds: "117,199,250,117" });
      expect(result.success).toBe(true);
      if (result.success) {
        // Set preserves insertion order
        expect(result.data.stopIds).toEqual([117, 199, 250]);
      }
    });
  });
});
