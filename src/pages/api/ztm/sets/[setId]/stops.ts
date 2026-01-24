import type { APIRoute } from "astro";

import { getUserId } from "../../../../../lib/auth/get-user-id.ts";
import { mapDatabaseError } from "../../../../../lib/errors/db-errors.ts";
import { getAllSetItems, verifySetOwnership } from "../../../../../lib/services/set-items.service.ts";
import { getStops, ZtmServiceError } from "../../../../../lib/services/ztm.service.ts";
import { deleteSetParamsSchema } from "../../../../../lib/validation/sets.validation.ts";
import type { ErrorResponse } from "../../../../../types.ts";
import type { GetZtmSetStopsResponse, ZtmSetStopDTO } from "../../../../../ztm-types.ts";

export const prerender = false;

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

  const userIdResult = await getUserId(locals.supabase);
  if (!userIdResult.success) {
    return new Response(JSON.stringify(userIdResult.error), {
      status: userIdResult.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = userIdResult.userId;

  try {
    await verifySetOwnership(locals.supabase, userId, setId);

    const items = await getAllSetItems(locals.supabase, setId);

    // Fetch all ZTM stops (cached internally for 6h in the service layer)
    const stopsData = await getStops({ cacheTtlMs: 6 * 60 * 60 * 1000, timeoutMs: 10_000 });
    const stopsById = new Map(stopsData.stops.map((s) => [s.stopId, s]));

    const stops: ZtmSetStopDTO[] = items.map((item) => ({
      stop_id: item.stop_id,
      stop: stopsById.get(item.stop_id) ?? null,
      position: item.position,
      item_id: item.id,
    }));

    const response: GetZtmSetStopsResponse = {
      set_id: setId,
      stops,
      fetched_at: new Date().toISOString(),
      stops_last_update: stopsData.lastUpdate,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Don't cache - items list changes dynamically when user adds/removes stops
        // Note: ZTM stops data is still cached in the service layer (6h)
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/ztm/sets/[setId]/stops:", { userId, setId, error });

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
