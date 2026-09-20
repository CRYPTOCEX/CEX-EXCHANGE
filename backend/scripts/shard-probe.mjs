/**
 * ASK THE SHARDS WHAT THEY HOLD, FROM A STANDALONE SCRIPT
 * (plans/done/ORDER-SCALE-10K.md WP-6.7).
 *
 * WHY A SCRIPT NEEDS THIS
 * -----------------------
 * The two operator tools that move or judge money — `reconcile-eco-inorder.mjs`
 * and `orphan-holds.mjs` — both reason about which orders are OPEN. Before the
 * shard tier that question had one answer: the ScyllaDB `orders` table, written
 * synchronously by the one process that owned the engine.
 *
 * With a shard owning a symbol, Scylla is a PROJECTION written after the fact.
 * An order can be live, matchable and funded on a shard and not yet OPEN in
 * Scylla. A tool that reads only Scylla therefore sees the order's hold with no
 * order behind it — which is precisely the shape it is built to release. It
 * would free the money backing a live order, and the order would go on trading
 * unfunded until settlement refused it.
 *
 * So these tools have to be able to ask the shards directly. This is the
 * smallest thing that can: the loopback transport's framing
 * ([u32 LE length][JSON envelope], scale/transport.ts) and the two ops an
 * operator tool needs — `health` and `orders`.
 *
 * IT IS DELIBERATELY NOT THE DOOR. The door is a TypeScript module inside the
 * backend's alias graph; these scripts are plain `.mjs` run by `node` with no
 * build step, which is what lets an operator run them against a broken install.
 * The framing is four lines and the contract has not changed since WP-6.4.
 */

import net from "net";

const HEADER_BYTES = 4;

/** ECO_SHARDS, as the router reads it: 1 means the single-process layout. */
export function shardCount(env = process.env) {
  const raw = Number(env.ECO_SHARDS ?? 1);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

/** Where shard `id` listens, as scale/shard.ts computes it. */
export function shardPort(id, env = process.env) {
  const base = Number(env.ECO_SHARD_PORT_BASE ?? 4300);
  return (Number.isFinite(base) && base > 0 ? Math.floor(base) : 4300) + id;
}

/**
 * Is a shard tier configured at all? An install that has never set ECO_SHARDS
 * above 1 is the single-process layout and every tool below behaves as it did
 * before Phase 6 existed.
 *
 * THE ENVIRONMENT IS NOT ENOUGH, AND THE ROLLBACK IS WHY. A one-shard tier
 * (ECO_SHARDS=1, a supported layout) is told apart from no tier at all only by
 * `ECO_DOOR` — and the FIRST step of the documented rollback is to unset
 * `ECO_DOOR` while the shards keep running and draining. An env-only answer
 * therefore said "no tier" at exactly the moment the shards still held every
 * live order, and the fence below waved through a release of their holds.
 *
 * So the ports are ASKED as well. A shard that answers is a tier, whatever the
 * environment of the process running this script says.
 */
export async function shardTierConfigured(env = process.env, options = {}) {
  if (shardCount(env) > 1 || String(env.ECO_DOOR ?? "").trim() !== "") return true;
  /*
   * A PER-SYMBOL CANARY IS A TIER (WP-6.8), and it is the case the port probe
   * below can miss.
   *
   * During a canary the process holding the matching lease has
   * ECO_SHARD_SYMBOLS set and may have no ECO_DOOR of its own, and the shard
   * it names can be on another host — so the loopback probe answers "no tier"
   * while a shard holds every order on those symbols. That is exactly the
   * shape this function exists to prevent: the fence would then wave through a
   * release of the holds behind them. Any value at all counts, `none`
   * included, because a deployment that has configured ownership at all is one
   * where a shard may be holding something.
   */
  if (String(env.ECO_SHARD_SYMBOLS ?? "").trim() !== "") return true;
  if (String(env.ECO_SHARD_SHADOW_SYMBOLS ?? "").trim() !== "") return true;
  try {
    await askShard(shardPort(0, env), { op: "health" }, { timeoutMs: 1500, ...options });
    return true;
  } catch {
    return false;
  }
}

/**
 * One request to one shard. Resolves with the reply body, or rejects with an
 * Error carrying `code` — "UNREACHABLE" when the port does not answer,
 * "TIMEOUT" when it does not answer in time, or the shard's own status code.
 */
export function askShard(port, body, { host = "127.0.0.1", timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let buffer = Buffer.alloc(0);
    let settled = false;

    const fail = (code, message) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      const error = new Error(message);
      error.code = code;
      reject(error);
    };
    const done = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };

    const timer = setTimeout(() => fail("TIMEOUT", `shard on :${port} did not answer within ${timeoutMs} ms`), timeoutMs);
    timer.unref?.();

    socket.on("error", (error) => fail("UNREACHABLE", `shard on :${port} is not answering (${error.message})`));
    socket.on("close", () => fail("UNREACHABLE", `shard on :${port} closed before answering`));

    socket.on("connect", () => {
      const payload = Buffer.from(JSON.stringify({ id: 1, t: "req", body }), "utf8");
      const frame = Buffer.allocUnsafe(HEADER_BYTES + payload.length);
      frame.writeUInt32LE(payload.length, 0);
      payload.copy(frame, HEADER_BYTES);
      socket.write(frame);
    });

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length < HEADER_BYTES) return;
      const length = buffer.readUInt32LE(0);
      if (buffer.length < HEADER_BYTES + length) return;
      clearTimeout(timer);
      let envelope;
      try {
        envelope = JSON.parse(buffer.subarray(HEADER_BYTES, HEADER_BYTES + length).toString("utf8"));
      } catch (error) {
        return fail("PROTOCOL", `shard on :${port} sent something that is not a frame of ours`);
      }
      if (envelope.t === "err") {
        return fail(String(envelope.statusCode ?? 500), `shard on :${port} refused: ${envelope.message}`);
      }
      done(envelope.body);
    });
  });
}

/**
 * Every shard's health, in id order. A shard that cannot be reached is present
 * with `reachable: false` rather than absent, because "I could not ask" and
 * "it said it was fine" must never look the same to a fence.
 */
export async function shardHealth(env = process.env, options = {}) {
  const count = shardCount(env);
  const out = [];
  for (let id = 0; id < count; id++) {
    const port = shardPort(id, env);
    try {
      const health = await askShard(port, { op: "health" }, options);
      out.push({ id, port, reachable: true, health });
    } catch (error) {
      out.push({ id, port, reachable: false, error: error.message, code: error.code });
    }
  }
  return out;
}

/**
 * MAY AN OPERATOR TOOL RELEASE MONEY RIGHT NOW? (the reconcile fence.)
 *
 * Returns `{ ok, reasons }`. It is deliberately CONSERVATIVE — every doubt is a
 * refusal — because the failure it prevents is releasing the hold behind a live
 * order, and the cost of refusing is that an operator runs the tool again in a
 * minute.
 *
 * The four ways it says no:
 *
 *   1. A shard cannot be reached. Its orders are unknown, so the open set is
 *      unknown, so every hold looks orphaned.
 *   2. A shard is not leading. It answers 503 to everything, including this;
 *      a handover is in progress and the open set is moving.
 *   3. THE PROJECTOR IS BEHIND. This is the whole point: Scylla does not yet
 *      carry orders the shard is matching, and Scylla is what the tool reads.
 *   4. The shard has work it has not committed (`batcherPending`), so its own
 *      view of what is held is still settling.
 */
export async function reconcileFence(env = process.env, options = {}) {
  if (!(await shardTierConfigured(env, options))) return { ok: true, reasons: [], shards: [] };
  const shards = await shardHealth(env, options);
  const reasons = [];
  for (const shard of shards) {
    if (!shard.reachable) {
      reasons.push(`shard ${shard.id} on :${shard.port} could not be asked what it holds (${shard.error})`);
      continue;
    }
    const h = shard.health ?? {};
    if (h.leader === false) {
      reasons.push(`shard ${shard.id} is not leading, so its open set is being handed over`);
    }
    const queued = h.projector?.queued;
    if (h.projector == null) {
      reasons.push(
        `shard ${shard.id} has no projector, so ScyllaDB is not being written for its symbols and its open orders are invisible to this tool`
      );
    } else if (typeof queued === "number" && queued > 0) {
      /*
       * THE BACKLOG, NOT THE LATENCY. `projector.lagMs` is how long the LAST
       * applied event took from arrival to completion, and it is never reset
       * when the queue empties — so a shard that has ever projected anything
       * reports a positive figure for ever. Gating on it closed this fence
       * permanently after the first event, which is worse than useless: an
       * operator who cannot ever run the tool goes and edits wallets by hand.
       *
       * `queued` is the honest question — is there work the projection has not
       * applied yet — and it returns to zero when the projector catches up.
       */
      reasons.push(`shard ${shard.id}'s projection is behind: ${queued} event(s) still queued`);
    }
    if (typeof h.projector?.droppedEvents === "number" && h.projector.droppedEvents > 0) {
      reasons.push(
        `shard ${shard.id} has DROPPED ${h.projector.droppedEvents} event(s): its projection is known to disagree with the ledger, and no later event repairs it`
      );
    }
    if (typeof h.batcherPending === "number" && h.batcherPending > 0) {
      reasons.push(`shard ${shard.id} still has ${h.batcherPending} ledger op(s) uncommitted`);
    }
  }
  return { ok: reasons.length === 0, reasons, shards };
}

/**
 * Every order the shards currently hold for a user, as the shards see them.
 * The authority a tool needs when the projection cannot be trusted.
 *
 * Throws when any shard cannot be asked: a partial open set is worse than none,
 * because the orders it is missing are exactly the ones whose holds would be
 * released.
 */
export async function shardOpenOrders(userId, env = process.env, options = {}) {
  const count = shardCount(env);
  const orders = [];
  for (let id = 0; id < count; id++) {
    const port = shardPort(id, env);
    const reply = await askShard(port, { op: "openOrders", userId }, options);
    for (const order of reply?.orders ?? []) orders.push({ ...order, shardId: id });
  }
  return orders;
}
