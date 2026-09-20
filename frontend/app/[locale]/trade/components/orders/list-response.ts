/**
 * Reading a LIST out of whatever this backend just handed back.
 *
 * THE DEFECT this exists to kill. Route handlers here return their value
 * VERBATIM — `Routes.ts` writes the handler's return straight onto the wire and
 * there is no `{success, data}` envelope anywhere in the backend. So
 * `GET /api/futures/position` answers with a BARE ARRAY (its own OpenAPI schema
 * says `type: "array"`, and the Pro terminal already consumes it as one). The
 * standard terminal's position fetchers nevertheless did:
 *
 *     if (data.success) { setPositions(data.data || []); }
 *     else if (data.message && !data.message.includes("No positions found")) ...
 *     else setPositions([]);                                   // ← always this
 *
 * `[].success` is undefined and `[].message` is undefined, so the truthy branch
 * never ran AND the error guard never fired: every futures trader landed on the
 * Positions tab (the default tab for a futures pair) reading "No open positions"
 * over live, margined, liquidatable positions — no error, no console warning, no
 * retry. Closed/liquidated positions were blank for the same reason, so a
 * liquidation left no trace in that UI at all.
 *
 * Two sibling fetchers in the same file had already been repaired by leading
 * with `Array.isArray`, and the repair was simply never carried across. Writing
 * the shape check once, here, is what stops the next fetcher from missing it —
 * the same reason `fill-fee.ts` next door is a shared function.
 *
 * WHY THERE IS STILL AN ENVELOPE BRANCH. Nothing on this endpoint sends one, but
 * the panel points at four different market backends and the wrapped form costs
 * one line to tolerate. It must stay AFTER the array check: an array is the
 * contract, an envelope is a courtesy.
 *
 * WHY FAILURES ARE READ OUT OF THE BODY. Errors are pinned to HTTP 200 with the
 * real code in the payload (the platform-wide uWS/CORS constraint), so `res.ok`
 * proves nothing and `{ message, statusCode }` is the only signal there is.
 */

export interface ListResponse<T> {
  /** Rows to render. Empty on an empty result AND on a failure. */
  rows: T[];
  /** The server's message when the body was an error, otherwise null. */
  failure: string | null;
}

/**
 * @param body      already-parsed JSON — a bare array, an envelope, or an error.
 * @param emptyHint substring of the server's "nothing here" message, which is a
 *                  normal empty result rather than a failure to surface.
 */
export function readListResponse<T>(
  body: unknown,
  emptyHint?: string
): ListResponse<T> {
  if (Array.isArray(body)) return { rows: body as T[], failure: null };

  const envelope = body as
    | { success?: unknown; data?: unknown; message?: unknown }
    | null
    | undefined;

  if (envelope?.success) {
    return {
      rows: Array.isArray(envelope.data) ? (envelope.data as T[]) : [],
      failure: null,
    };
  }

  const message =
    typeof envelope?.message === "string" ? envelope.message : null;
  if (message && !(emptyHint && message.includes(emptyHint))) {
    return { rows: [], failure: message };
  }

  return { rows: [], failure: null };
}
