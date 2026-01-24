import type { APIRoute } from "astro";

import { getUserId } from "../../../../../lib/auth/get-user-id.ts";
import { mapDatabaseError } from "../../../../../lib/errors/db-errors.ts";
import { getAllSetItems, verifySetOwnership } from "../../../../../lib/services/set-items.service.ts";
import { getDepartures, ZtmServiceError } from "../../../../../lib/services/ztm.service.ts";
import { deleteSetParamsSchema } from "../../../../../lib/validation/sets.validation.ts";
import type { ErrorResponse } from "../../../../../types.ts";
import type {
  GetZtmSetDeparturesResponse,
  ZtmDepartureDTO,
  ZtmSetStopDeparturesErrorDTO,
} from "../../../../../ztm-types.ts";

export const prerender = false;

const DEPARTURES_CACHE_SECONDS = 20;

export const GET: APIRoute = async ({ params, locals }) => {
  const paramsParse = deleteSetParamsSchema.safeParse(params);
  if (!paramsParse.success) {
    return new Response(
      JSON.stringify({
        code: "INVALID_INPUT",
        message: "Invalid set ID format",
        details: paramsParse.error.issues,
      } satisfies ErrorResponse),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { setId } = paramsParse.data;

  // Auth (same convention as existing /api/sets endpoints)
  const userIdResult = await getUserId(locals.supabase);
  if (!userIdResult.success) {
    return new Response(JSON.stringify(userIdResult.error), {
      status: userIdResult.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = userIdResult.userId;

  try {
    // Ensure set exists and belongs to user
    await verifySetOwnership(locals.supabase, userId, setId);

    // Load all items in the set (max 6 by DB rule)
    const items = await getAllSetItems(locals.supabase, setId);

    // Build data and error maps: stopId -> departures[] or error
    const dataMap: Record<string, ZtmDepartureDTO[]> = {};
    const errorMap: Record<string, ZtmSetStopDeparturesErrorDTO> = {};

    await Promise.all(
      items.map(async (item) => {
        const stopIdKey = item.stop_id.toString();

        // Defensive guard: DB + API validation should ensure positive ints
        if (!Number.isInteger(item.stop_id) || item.stop_id <= 0) {
          errorMap[stopIdKey] = {
            code: "INVALID_STOP_ID",
            message: "Invalid stop_id in set item",
            status: 400,
          };
          return;
        }

        try {
          const departuresData = await getDepartures(
            { stopId: item.stop_id },
            { cacheTtlMs: DEPARTURES_CACHE_SECONDS * 1000, timeoutMs: 8_000 }
          );

          // Add departures to data map
          dataMap[stopIdKey] = departuresData.departures;
        } catch (e: unknown) {
          // Add error to error map
          if (e instanceof ZtmServiceError) {
            errorMap[stopIdKey] = {
              code: e.code,
              message: e.message,
              status: e.httpStatus,
            };
          } else {
            errorMap[stopIdKey] = {
              code: "INTERNAL_ERROR",
              message: "An unexpected error occurred",
              status: 500,
            };
          }
        }
      })
    );

    // If we have any successful data, return success response
    if (Object.keys(dataMap).length > 0) {
      const response: GetZtmSetDeparturesResponse = {
        ok: true,
        data: dataMap,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          // User-specific aggregation: do not cache publicly/CDN. Still allow short private caching.
          "Cache-Control": `private, max-age=${DEPARTURES_CACHE_SECONDS}, stale-while-revalidate=${DEPARTURES_CACHE_SECONDS}`,
          Vary: "Cookie",
        },
      });
    }

    // All requests failed, return error response
    const response: GetZtmSetDeparturesResponse = {
      ok: false,
      error: errorMap,
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/ztm/sets/[setId]/departures:", { userId, setId, error });
    const mappedError = mapDatabaseError(error);

    return new Response(
      JSON.stringify({
        code: mappedError.code,
        message: mappedError.message,
      } satisfies ErrorResponse),
      {
        status: mappedError.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
