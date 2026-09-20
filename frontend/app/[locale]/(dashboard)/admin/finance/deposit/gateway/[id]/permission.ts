/**
 * The gateway EDIT page.
 *
 * Without this file the route matched nothing in the permission table and fell
 * through to the broad `access.admin` fallback — so any admin could edit
 * payment-gateway credentials, fees and currency lists regardless of role,
 * while the backend PUT for the same record refused them.
 *
 * `edit.deposit.gateway` is the key the API already enforces
 * (`backend/src/api/admin/finance/deposit/gateway/[id]/index.put.ts:33`, and
 * likewise its `status.put.ts` and `test.post.ts`), so the page now agrees with
 * the endpoint instead of being the looser of the two. The sibling LIST route
 * stays on `access.deposit.gateway` — reading the gateway list and rewriting a
 * gateway's credentials are deliberately different rights.
 *
 * `tools/build-permission.js` regenerates `frontend/middlewares/permissions.json`
 * from these files and the manifest FAILS CLOSED, so this file is the source of
 * truth: delete it and the gate silently disappears at the next regeneration.
 */
export const permission = "edit.deposit.gateway";
