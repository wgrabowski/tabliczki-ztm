import { z } from "zod";

// ----------------------------------------------------------------------------
// Input validation (API query params)
// ----------------------------------------------------------------------------

/**
 * Query schema for GET /api/ztm/departures?stopId=...
 */
export const ztmDeparturesQuerySchema = z.object({
  /**
   * Optional:
   * - when provided: fetch departures for a single stop pole
   * - when omitted: fetch departures for all stops (heavy)
   */
  stopId: z.preprocess((v) => (v === undefined ? undefined : v), z.coerce.number().int().positive()).optional(),
});

export type ZtmDeparturesQueryInput = z.infer<typeof ztmDeparturesQuerySchema>;

/**
 * Query schema for GET /api/ztm/stops?stopIds=117,199
 */
export const ztmStopsQuerySchema = z.object({
  /**
   * Optional comma-separated list of stopIds.
   * Example: "117,199"
   */
  stopIds: z
    .string()
    .optional()
    .transform((v) => v?.trim())
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : []
    )
    .transform((parts) => parts.map((p) => Number(p)))
    .refine((nums) => nums.every((n) => Number.isInteger(n) && n > 0), {
      message: "stopIds must be a comma-separated list of positive integers",
    })
    .transform((nums) => Array.from(new Set(nums))),
});

export type ZtmStopsQueryInput = z.infer<typeof ztmStopsQuerySchema>;

// ----------------------------------------------------------------------------
// Upstream response validation (ZTM JSON)
// ----------------------------------------------------------------------------

const toNullableString = z.preprocess((v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return v;
}, z.string().nullable());

const toNullableNumber = z.preprocess((v) => {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  }
  return v;
}, z.number().nullable());

const toNullableInt = z.preprocess((v) => {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  }
  return v;
}, z.number().int().nullable());

export const ztmStopSchema = z.object({
  stopId: z.preprocess((v) => (typeof v === "string" ? Number(v) : v), z.number().int()),
  stopCode: toNullableString,
  stopName: toNullableString,
  stopShortname: toNullableInt,
  stopDesc: toNullableString,
  subName: toNullableString.optional(),
  date: toNullableString,
  stopLat: toNullableNumber,
  stopLon: toNullableNumber,
  type: toNullableString,
  zoneId: toNullableInt,
  zoneName: toNullableString,
  stopUrl: z.string().nullable().optional(),
  locationType: z.string().nullable().optional(),
  parentStation: z.string().nullable().optional(),
  stopTimezone: z.string().nullable().optional(),
  wheelchairBoarding: toNullableInt,
  virtual: toNullableInt,
  nonpassenger: toNullableInt,
  depot: toNullableInt,
  ticketZoneBorder: toNullableInt,
  onDemand: toNullableInt,
  activationDate: toNullableString,
});

export const ztmStopsUpstreamSchema = z.object({
  lastUpdate: z.string(),
  stops: z.array(ztmStopSchema),
});

export const ztmDepartureSchema = z.object({
  id: z.string(),
  delayInSeconds: toNullableInt,
  estimatedTime: z.string(),
  headsign: z.string().nullable(),
  routeShortName: z.string().nullable(),
  routeId: toNullableInt,
  scheduledTripStartTime: z.string().nullable(),
  tripId: toNullableInt,
  status: z.string(),
  theoreticalTime: z.string().nullable(),
  timestamp: z.string(),
  trip: toNullableInt,
  vehicleCode: toNullableInt,
  vehicleId: toNullableInt,
  vehicleService: z.string().nullable(),
});

export const ztmDeparturesUpstreamSchema = z.object({
  lastUpdate: z.string(),
  departures: z.array(ztmDepartureSchema),
});

/**
 * Upstream response for departures endpoint without stopId:
 * record keyed by stopId.
 */
export const ztmAllDeparturesUpstreamSchema = z.record(ztmDeparturesUpstreamSchema);
