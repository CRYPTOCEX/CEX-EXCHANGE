# dex models — there is no migration system

Schema for these eight tables comes from **Sequelize auto-sync at boot**, not
from a migration. There is no `backend/migrations/`, no `db:migrate` script and
no `down`. `scripts/updator-migrate.js` boots once with `CRON_MODE=off` so sync
runs before the seeders.

So: never write "migration" in a DEX commit message or doc. Write **"model file
+ auto-sync"**.

## What that means when you change a column here

1. Edit the model file.
2. Run `pnpm --filter backend types:generate`, and commit **both**
   `backend/types/models.ts` and `backend/.types-hash` in the same commit as the
   model change. `tsc` fails until it has run — the classes are declared against
   types that script produces. `predev`/`prebuild` also run it, so a stale
   checkout self-heals, but the committed artefact must be right because
   `backend/dist` is production.
3. Decide whether auto-sync can reach the new shape on a **populated** database.
   `CREATE TABLE` is safe; the granular alter path (`backend/src/db.ts:368-490`)
   is not always. MySQL strict mode is on, so adding a `NOT NULL` column with no
   default to an existing table is the failure to watch for.
4. If it cannot, hand-write a `backend/scripts/*.mjs` with an `--apply` flag —
   `backend/scripts/add-wallet-address-lookup.mjs` is the template — and register
   it in the root `package.json` as `db:migrate:<version>:after` /
   `:after:apply`.

Phase 1 needed **no** compensating script: every table here is new, so only the
`CREATE TABLE` path runs. The first script this programme needs is Phase 5's
`adminProfit.type` addition.

## Verifying the sync

Boot once against a populated dev DB and watch the sync log, then:

```sql
SHOW CREATE TABLE dex_swap\G
SHOW INDEX FROM dex_swap;
```

`dexSwapChainTxKey` must be present with `Non_unique = 0`. It is the swap
idempotency authority, and it is composite (`chainId`, `txHash`) rather than
`txHash` alone on purpose — see the comment in `dexSwap.ts`.

## Conventions

The rules every file here follows, and why, are documented at the top of
`dexChain.ts`: terse `validate` blocks (the type generator's column regex
tolerates one level of nested braces), JSON-in-`TEXT` rather than
`DataTypes.JSON`, `STRING(N)` + `isIn` rather than `ENUM`, `STRING(78)` for raw
on-chain amounts, and lowercase-normalising setters on every address and hash.
Amount arithmetic lives in `backend/src/api/(ext)/dex/utils/units.ts` and nowhere
else.

Everything a file HERE imports comes from `backend/src/utils/dex/units.ts` — the
shapes, the VM dispatch and the column widths — and never from the addon tree.
This directory ships with the CORE release and `initModels()` require()s every
file in it on every install; `backend/src/api/(ext)/dex/**` ships only to
customers who bought the Swap addon. A model that imports from there is a boot
crash on every install that does not have it, before the server exists. The
addon's `units.ts` re-exports the core module, so the addon side is unchanged.
