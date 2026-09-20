/**
 * Graceful stop — drain in-flight fund movements before maintenance/restart.
 *
 * A blind `pnpm stop` can kill the backend mid-withdrawal-broadcast. This waits
 * (best-effort) for in-flight withdrawals to quiesce, THEN enters maintenance
 * mode (the normal `pnpm stop`). If in-flight state can't be observed, it falls
 * back to a fixed grace window so HTTP requests can finish — strictly safer than
 * an instant hard kill.
 *
 * Invoke from the repo root:  node backend/scripts/graceful-stop.mjs
 *
 * NOTE: this is a soft drain. A TRUE trading-aware drain (quiescing the open
 * order matcher, not just withdrawals) needs a backend read-only hook that
 * stops accepting new orders first — a Bicrypto-core change, not done here.
 */
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const TIMEOUT_MS = parseInt(process.env.GRACEFUL_STOP_TIMEOUT_MS || "120000", 10);
const POLL_MS = 3000;
const FALLBACK_GRACE_MS = 10000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sequelize = new Sequelize(
  process.env.DB_NAME || "platform",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    dialect: "mysql",
    logging: false,
  },
);

/** Best-effort count of in-flight withdrawals; null when unobservable. */
async function inFlightWithdrawals() {
  try {
    const rows = await sequelize.query(
      "SELECT COUNT(*) AS c FROM `transaction` " +
        "WHERE UPPER(`type`) LIKE '%WITHDRAW%' AND UPPER(`status`) IN ('PENDING','PROCESSING')",
      { type: QueryTypes.SELECT },
    );
    return Number(rows[0]?.c ?? 0) || 0;
  } catch {
    return null; // table/columns not as expected — fall back to a grace window
  }
}

async function drain() {
  console.log("[graceful-stop] draining in-flight withdrawals...");
  const deadline = Date.now() + TIMEOUT_MS;
  let observed = false;

  while (Date.now() < deadline) {
    const n = await inFlightWithdrawals();
    if (n === null) break; // unobservable
    observed = true;
    if (n === 0) {
      console.log("[graceful-stop] no in-flight withdrawals — proceeding.");
      return;
    }
    console.log(`[graceful-stop] ${n} in-flight withdrawal(s); waiting...`);
    await sleep(POLL_MS);
  }

  if (!observed) {
    console.log(`[graceful-stop] in-flight state unobservable — grace window ${FALLBACK_GRACE_MS}ms.`);
    await sleep(FALLBACK_GRACE_MS);
  } else {
    console.log("[graceful-stop] drain timeout reached — proceeding to stop.");
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    await drain();
  } catch (e) {
    console.warn(`[graceful-stop] drain skipped (${e.message}); grace window ${FALLBACK_GRACE_MS}ms.`);
    await sleep(FALLBACK_GRACE_MS);
  } finally {
    try {
      await sequelize.close();
    } catch {}
  }

  console.log("[graceful-stop] entering maintenance mode (pnpm stop)...");
  execSync("pnpm stop", { stdio: "inherit" });
}

main().catch((e) => {
  console.error("[graceful-stop] failed:", e.message);
  // Still attempt the stop so a restart isn't left half-done.
  try {
    execSync("pnpm stop", { stdio: "inherit" });
  } catch {}
  process.exit(1);
});
