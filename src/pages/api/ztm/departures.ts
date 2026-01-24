import type { APIRoute } from "astro";

import { getAllDepartures, getDepartures, ZtmServiceError } from "../../../lib/services/ztm.service.ts";
import { ztmDeparturesQuerySchema } from "../../../lib/validation/ztm.validation.ts";
import type { ErrorResponse } from "../../../types.ts";
import type { GetZtmDeparturesResponse } from "../../../ztm-types.ts";

export const prerender = false;

const DEPARTURES_CACHE_SECONDS = 20;

export const GET: APIRoute = async ({ url }) => {
  const queryParse = ztmDeparturesQuerySchema.safeParse(Object.fromEntries(url.searchParams));
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

  const { stopId } = queryParse.data;

  try {
    const data =
      stopId === undefined
        ? await getAllDepartures({ cacheTtlMs: DEPARTURES_CACHE_SECONDS * 1000, timeoutMs: 15_000 })
        : await getDepartures({ stopId }, { cacheTtlMs: DEPARTURES_CACHE_SECONDS * 1000, timeoutMs: 8_000 });

    const response: GetZtmDeparturesResponse = data;

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${DEPARTURES_CACHE_SECONDS}, s-maxage=${DEPARTURES_CACHE_SECONDS}, stale-while-revalidate=${DEPARTURES_CACHE_SECONDS}`,
      },
    });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/ztm/departures:", { stopId, error });

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
