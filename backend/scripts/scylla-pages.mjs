/** Bounded, explicit Scylla pagination. Empty filtered pages may still continue. */
export async function readScyllaPages(client, query, params = [], options = {}) {
  const { maxRows = 50000, maxPages = 200, fetchSize = 5000 } = options;
  for (const value of [maxRows, maxPages, fetchSize]) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error("Invalid pagination bound");
  }
  const rows = [];
  const seen = new Set();
  let pageState;
  let pages = 0;
  do {
    const result = await client.execute(query, params, { prepare: true, fetchSize, ...(pageState ? { pageState } : {}) });
    pages++;
    if (!Array.isArray(result.rows)) throw new Error("Invalid Scylla page response");
    const available = maxRows - rows.length;
    rows.push(...result.rows.slice(0, available));
    pageState = result.pageState;
    if (result.rows.length > available) return { rows, pages, truncated: true };
    if (!pageState) return { rows, pages, truncated: false };
    const token = typeof pageState === "string" ? pageState : Buffer.from(pageState).toString("hex");
    if (seen.has(token) || rows.length >= maxRows || pages >= maxPages) return { rows, pages, truncated: true };
    seen.add(token);
  } while (pageState);
  return { rows, pages, truncated: false };
}
