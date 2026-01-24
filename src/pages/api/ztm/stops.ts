import type { APIRoute } from "astro";

import { getStops, ZtmServiceError } from "../../../lib/services/ztm.service.ts";
import { ztmStopsQuerySchema } from "../../../lib/validation/ztm.validation.ts";
import type { ErrorResponse } from "../../../types.ts";
import type { GetZtmStopsResponse } from "../../../ztm-types.ts";

export const prerender = false;

const STOPS_CACHE_SECONDS = 6 * 60 * 60; // 6h

export const GET: APIRoute = async ({ url }) => {
  const queryParse = ztmStopsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!queryParse.success) {
    return new Response(
      JSON.stringify({
        code: "INVALID_INPUT",
        message: "Invalid query parameters",
        details: queryParse.error.issues,
      } satisfies ErrorResponse),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { stopIds } = queryParse.data;

  try {
    const data = await getStops({ cacheTtlMs: STOPS_CACHE_SECONDS * 1000, timeoutMs: 10_000 });

    const response: GetZtmStopsResponse = stopIds.length
      ? { ...data, stops: data.stops.filter((s) => stopIds.includes(s.stopId)) }
      : data;

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${STOPS_CACHE_SECONDS}, s-maxage=${STOPS_CACHE_SECONDS}, stale-while-revalidate=86400`,
      },
    });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/ztm/stops:", error);

    if (error instanceof ZtmServiceError) {
      return new Response(
        JSON.stringify({
          code: error.code,
          message: error.message,
        } satisfies ErrorResponse),
        {
          status: error.httpStatus,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      } satisfies ErrorResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
