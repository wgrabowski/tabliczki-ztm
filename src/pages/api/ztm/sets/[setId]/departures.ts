import type { APIRoute } from "astro";

import { getUserId } from "../../../../../lib/auth/get-user-id.ts";
import { mapDatabaseError } from "../../../../../lib/errors/db-errors.ts";
import { getAllSetItems, verifySetOwnership } from "../../../../../lib/services/set-items.service.ts";
import { getStops } from "../../../../../lib/services/ztm.service.ts";
import { getDepartures, ZtmServiceError } from "../../../../../lib/services/ztm.service.ts";
import { deleteSetParamsSchema } from "../../../../../lib/validation/sets.validation.ts";
import type { ErrorResponse } from "../../../../../types.ts";
import type { GetZtmSetDeparturesResponse, ZtmSetStopDeparturesResultDTO } from "../../../../../ztm-types.ts";

export const prerender = false;

const DEPARTURES_CACHE_SECONDS = 20;
const STOPS_CACHE_SECONDS = 6 * 60 * 60; // 6h

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

    // Fetch stops dataset once (cached in service layer) to enrich response
    const stopsData = await getStops({ cacheTtlMs: STOPS_CACHE_SECONDS * 1000, timeoutMs: 10_000 });
    const stopsById = new Map(stopsData.stops.map((s) => [s.stopId, s]));

    const results: ZtmSetStopDeparturesResultDTO[] = await Promise.all(
      items.map(async (item) => {
        // Defensive guard: DB + API validation should ensure positive ints, but don't crash the whole response.
        if (!Number.isInteger(item.stop_id) || item.stop_id <= 0) {
          return {
            ok: false,
            stop_id: item.stop_id,
            stop: stopsById.get(item.stop_id) ?? null,
            position: item.position,
            item_id: item.id,
            error: {
              code: "INVALID_STOP_ID",
              message: "Invalid stop_id in set item",
              status: 400,
            },
          };
        }

        try {
          const data = await getDepartures(
            { stopId: item.stop_id },
            { cacheTtlMs: DEPARTURES_CACHE_SECONDS * 1000, timeoutMs: 8_000 }
          );

          return {
            ok: true,
            stop_id: item.stop_id,
            stop: stopsById.get(item.stop_id) ?? null,
            position: item.position,
            item_id: item.id,
            data,
          };
        } catch (e: unknown) {
          if (e instanceof ZtmServiceError) {
            return {
              ok: false,
              stop_id: item.stop_id,
              stop: stopsById.get(item.stop_id) ?? null,
              position: item.position,
              item_id: item.id,
              error: {
                code: e.code,
                message: e.message,
                status: e.httpStatus,
              },
            };
          }

          return {
            ok: false,
            stop_id: item.stop_id,
            stop: stopsById.get(item.stop_id) ?? null,
            position: item.position,
            item_id: item.id,
            error: {
              code: "INTERNAL_ERROR",
              message: "An unexpected error occurred",
              status: 500,
            },
          };
        }
      })
    );

    const response: GetZtmSetDeparturesResponse = {
      set_id: setId,
      results,
      fetched_at: new Date().toISOString(),
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
