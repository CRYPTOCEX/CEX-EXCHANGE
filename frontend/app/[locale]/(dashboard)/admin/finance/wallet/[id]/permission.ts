/*
 * `access.wallet` — the same key the wallet LIST page and the nav entry use.
 *
 * `view.wallet` was the tempting answer, because that is what the record
 * endpoint (`GET /admin/finance/wallet/{id}`) demands. It is the wrong gate for
 * the ROUTE, for two reasons:
 *
 *   1. No seeded role holds `view.wallet`, so gating the route on it would make
 *      this page Super-Admin-only until an operator granted a brand-new key —
 *      while the list page it is opened from stays reachable on `access.wallet`.
 *   2. It is not the convention. `transfer/[id]` and `withdraw/log/[id]` both
 *      reuse their list's `access.*` key; only `deposit/log/[id]` differs.
 *
 * Nothing is weakened by this. The record fetch is still enforced server-side on
 * `view.wallet` and the balance ledger on `access.wallet`, exactly as they are
 * for the list — and the two controls that move money are gated separately, in
 * the client, on `edit.wallet`, the key their own endpoints demand.
 */
export const permission = "access.wallet";
