/**
 * RETIRED — this file no longer starts anything, and must not.
 *
 * The dedicated cron process used to be opt-in and this file was how you opted
 * in: it defined a PM2 app named `cron` with CRON_MODE=only, and `pnpm start`
 * left it alone.
 *
 * The split is now the DEFAULT. `production.config.js` defines all three apps —
 * `backend` (CRON_MODE=off), `frontend`, and `cron` (CRON_MODE=only, port 4001)
 * — and `pnpm start` brings up every one of them. Both halves of the decision
 * live in that one file precisely so they cannot disagree, and there is nothing
 * to set in `.env`.
 *
 * Which makes this file actively dangerous if it still worked. Starting it
 * beside `production.config.js` would put TWO processes with CRON_MODE=only on
 * one deployment, and BullMQ hands a repeatable job to whichever worker takes
 * it: every scheduled job would run twice, against the same rows, with only the
 * per-process single-flight guard between them — which coordinates nothing
 * across processes. Withdrawals processed twice. That is the precise
 * duplication the split exists to prevent, so the file is emptied rather than
 * deleted: an operator following an old runbook gets this explanation instead
 * of `ENOENT`, and `pm2 start production.cron.config.js` finds no app to start.
 *
 * Run `node production.cron.config.js` (which is what `pnpm start:cron` now
 * does) and you get the same message with a non-zero exit.
 */

console.error(
  [
    "",
    "  production.cron.config.js no longer starts anything.",
    "",
    "  The cron scheduler is a SEPARATE PROCESS BY DEFAULT and is already defined in",
    "  production.config.js, alongside `backend` and `frontend`. Starting a second one",
    "  would run every scheduled job twice — including withdrawals.",
    "",
    "    pnpm start          start all three (backend, frontend, cron)",
    "    pm2 restart cron    restart the scheduler on its own",
    "    pm2 logs cron       watch it",
    "",
    "  There is no environment variable to set. To go back to the old single-process",
    "  arrangement, put CRON_MODE=inline in .env and run `pnpm start` — production.config.js",
    "  reads it and drops the cron app rather than starting one you did not ask for.",
    "",
  ].join("\n")
);

// Non-zero so `pnpm start:cron` fails visibly instead of looking like a success
// that started nothing. PM2 reads the export below and finds no app to launch.
process.exitCode = 1;

module.exports = { apps: [] };
