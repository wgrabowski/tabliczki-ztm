import {
  ztmAllDeparturesUpstreamSchema,
  ztmDeparturesUpstreamSchema,
  ztmStopsUpstreamSchema,
} from "../validation/ztm.validation.ts";
import type {
  GetZtmDeparturesCommand,
  ZtmAllDeparturesUpstreamResponseDTO,
  ZtmDeparturesUpstreamResponseDTO,
  ZtmStopsUpstreamResponseDTO,
} from "../../ztm-types.ts";

type ZtmServiceErrorCode = "ZTM_TIMEOUT" | "ZTM_UPSTREAM_ERROR" | "ZTM_INVALID_RESPONSE";

export class ZtmServiceError extends Error {
  public readonly code: ZtmServiceErrorCode;
  public readonly httpStatus: number;

  constructor(code: ZtmServiceErrorCode, message: string, httpStatus: number, cause?: unknown) {
    super(message);
    this.name = "ZtmServiceError";
    this.code = code;
    this.httpStatus = httpStatus;
    if (cause) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).cause = cause;
    }
  }
}

const ZTM_STOPS_URL =
  "https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/d3e96eb6-25ad-4d6c-8651-b1eb39155945/download/stopsingdansk.json";
const ZTM_DEPARTURES_URL = "https://ckan2.multimediagdansk.pl/departures";

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const stopsCache: { entry: CacheEntry<ZtmStopsUpstreamResponseDTO> | null } = { entry: null };
const departuresCache = new Map<number, CacheEntry<ZtmDeparturesUpstreamResponseDTO>>();
const allDeparturesCache: { entry: CacheEntry<ZtmAllDeparturesUpstreamResponseDTO> | null } = { entry: null };

function nowMs(): number {
  return Date.now();
}

function getCached<T>(entry: CacheEntry<T> | null): T | null {
  if (!entry) return null;
  if (entry.expiresAt <= nowMs()) return null;
  return entry.value;
}

function setCached<T>(value: T, ttlMs: number): CacheEntry<T> {
  return { value, expiresAt: nowMs() + ttlMs };
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new ZtmServiceError("ZTM_UPSTREAM_ERROR", `Upstream returned HTTP ${res.status}`, 502);
    }

    try {
      return await res.json();
    } catch (cause) {
      throw new ZtmServiceError("ZTM_INVALID_RESPONSE", "Upstream returned invalid JSON", 502, cause);
    }
  } catch (cause) {
    if (cause instanceof ZtmServiceError) {
      throw cause;
    }

    // AbortError (timeout)
    if (cause && typeof cause === "object" && "name" in cause && (cause as { name?: string }).name === "AbortError") {
      throw new ZtmServiceError("ZTM_TIMEOUT", "Upstream request timed out", 504, cause);
    }

    throw new ZtmServiceError("ZTM_UPSTREAM_ERROR", "Failed to fetch upstream data", 502, cause);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetches the stops dataset (Gdańsk) from ZTM upstream.
 *
 * The dataset is updated once per day, so we cache it for several hours.
 */
export async function getStops(options?: {
  cacheTtlMs?: number;
  timeoutMs?: number;
}): Promise<ZtmStopsUpstreamResponseDTO> {
  const ttlMs = options?.cacheTtlMs ?? 6 * 60 * 60 * 1000; // 6h
  const timeoutMs = options?.timeoutMs ?? 10_000;

  const cached = getCached(stopsCache.entry);
  if (cached) return cached;

  const raw = await fetchJson(ZTM_STOPS_URL, timeoutMs);
  const parsed = ztmStopsUpstreamSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ZtmServiceError("ZTM_INVALID_RESPONSE", "Upstream stops schema mismatch", 502, parsed.error);
  }

  stopsCache.entry = setCached(parsed.data, ttlMs);
  return parsed.data;
}

/**
 * Fetches departures for a given stop pole (stopId).
 *
 * Upstream is cached for ~20s per stop. We keep a short local cache to reduce load.
 */
export async function getDepartures(
  command: GetZtmDeparturesCommand,
  options?: { cacheTtlMs?: number; timeoutMs?: number }
): Promise<ZtmDeparturesUpstreamResponseDTO> {
  const ttlMs = options?.cacheTtlMs ?? 20_000;
  const timeoutMs = options?.timeoutMs ?? 8_000;

  const cached = departuresCache.get(command.stopId);
  if (cached && cached.expiresAt > nowMs()) {
    return cached.value;
  }

  const url = `${ZTM_DEPARTURES_URL}?stopId=${encodeURIComponent(String(command.stopId))}`;
  const raw = await fetchJson(url, timeoutMs);
  const parsed = ztmDeparturesUpstreamSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ZtmServiceError("ZTM_INVALID_RESPONSE", "Upstream departures schema mismatch", 502, parsed.error);
  }

  const entry = setCached(parsed.data, ttlMs);
  departuresCache.set(command.stopId, entry);
  return parsed.data;
}

/**
 * Fetches departures for all stop poles.
 *
 * WARNING: This can be a large response. Use sparingly and keep TTL short.
 */
export async function getAllDepartures(options?: {
  cacheTtlMs?: number;
  timeoutMs?: number;
}): Promise<ZtmAllDeparturesUpstreamResponseDTO> {
  const ttlMs = options?.cacheTtlMs ?? 20_000;
  const timeoutMs = options?.timeoutMs ?? 15_000;

  const cached = getCached(allDeparturesCache.entry);
  if (cached) return cached;

  const raw = await fetchJson(ZTM_DEPARTURES_URL, timeoutMs);
  const parsed = ztmAllDeparturesUpstreamSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ZtmServiceError("ZTM_INVALID_RESPONSE", "Upstream all-departures schema mismatch", 502, parsed.error);
  }

  allDeparturesCache.entry = setCached(parsed.data, ttlMs);
  return parsed.data;
}
