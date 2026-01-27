// ============================================================================
// ZTM (Gdańsk) Types
// ============================================================================

/**
 * Command model for fetching departures for a single stop pole.
 */
export interface GetZtmDeparturesCommand {
  /** ZTM stop pole ID (stopId from the stops dataset) */
  stopId: number;
}

/**
 * Stop pole representation from ZTM "stops in Gdańsk" dataset.
 *
 * Notes:
 * - Some numeric fields may be represented as strings upstream.
 * - Codes like stopCode/subName can have leading zeros, so we keep them as strings.
 */
export interface ZtmStopDTO {
  stopId: number;
  stopCode: string | null;
  stopName: string | null;
  stopShortname: number | null;
  stopDesc: string | null;
  subName?: string | null;
  date: string | null;
  stopLat: number | null;
  stopLon: number | null;
  type: string | null;
  zoneId: number | null;
  zoneName: string | null;
  stopUrl?: string | null;
  locationType?: string | null;
  parentStation?: string | null;
  stopTimezone?: string | null;
  wheelchairBoarding: number | null;
  virtual: number | null;
  nonpassenger: number | null;
  depot: number | null;
  ticketZoneBorder: number | null;
  onDemand: number | null;
  activationDate: string | null;
}

/**
 * Upstream response for stops dataset.
 */
export interface ZtmStopsUpstreamResponseDTO {
  /** Update time in format: YYYY-MM-DD HH:MM:SS */
  lastUpdate: string;
  stops: ZtmStopDTO[];
}

export type ZtmDepartureStatus = "REALTIME" | "SCHEDULED" | (string & {});

/**
 * Departure row returned by ZTM departures endpoint.
 *
 * Note: when status is SCHEDULED, some realtime fields are null.
 */
export interface ZtmDepartureDTO {
  id: string;
  delayInSeconds: number | null;
  estimatedTime: string;
  headsign: string | null;
  routeShortName: string | null;
  routeId: number | null;
  scheduledTripStartTime: string | null;
  tripId: number | null;
  status: ZtmDepartureStatus;
  theoreticalTime: string | null;
  timestamp: string;
  trip: number | null;
  vehicleCode: number | null;
  vehicleId: number | null;
  vehicleService: string | null;
}

/**
 * Upstream response for departures endpoint.
 */
export interface ZtmDeparturesUpstreamResponseDTO {
  /** Update time in ISO-8601 (UTC) */
  lastUpdate: string;
  departures: ZtmDepartureDTO[];
}

/**
 * Upstream response for departures endpoint without stopId:
 * a dictionary keyed by stopId (as string), each value has the same shape
 * as the single-stop departures response.
 */
export type ZtmAllDeparturesUpstreamResponseDTO = Record<string, ZtmDeparturesUpstreamResponseDTO>;

/**
 * API response for GET /api/ztm/stops
 */
export type GetZtmStopsResponse = ZtmStopsUpstreamResponseDTO;

/**
 * API response for GET /api/ztm/departures?stopId=...
 *
 * When stopId is omitted, returns departures for all stops (heavy).
 */
export type GetZtmDeparturesResponse = ZtmDeparturesUpstreamResponseDTO | ZtmAllDeparturesUpstreamResponseDTO;

/**
 * Error codes used by ZTM proxy endpoints.
 */
export type ZtmErrorCode = "INVALID_INPUT" | "ZTM_TIMEOUT" | "ZTM_UPSTREAM_ERROR" | "ZTM_INVALID_RESPONSE";

// ============================================================================
// ZTM Aggregations (App-specific)
// ============================================================================

export interface ZtmSetStopDeparturesErrorDTO {
  code: ZtmErrorCode | "INVALID_STOP_ID" | "INTERNAL_ERROR";
  message: string;
  status: number;
}

export type ZtmSetStopDeparturesResultDTO =
  | {
      ok: true;
      stop_id: number;
      stop: ZtmStopDTO | null;
      position: number;
      item_id: string;
      data: ZtmDeparturesUpstreamResponseDTO;
    }
  | {
      ok: false;
      stop_id: number;
      stop: ZtmStopDTO | null;
      position: number;
      item_id: string;
      error: ZtmSetStopDeparturesErrorDTO;
    };

/**
 * API response for GET /api/ztm/sets/{setId}/stops
 *
 * Returns a dictionary of stops keyed by stopId (as string).
 * Values can be null if stop metadata is not available.
 */
export type GetZtmSetStopsResponse = Record<string, ZtmStopDTO | null>;

/**
 * API response for GET /api/ztm/sets/{setId}/departures
 *
 * Aggregates departures for all stop_id entries in a set.
 * Returns either success with departures data or failure with errors,
 * both as Records keyed by stopId.
 */
export type GetZtmSetDeparturesResponse =
  | {
      ok: true;
      data: Record<string, ZtmDepartureDTO[]>;
    }
  | {
      ok: false;
      error: Record<string, ZtmSetStopDeparturesErrorDTO>;
    };
