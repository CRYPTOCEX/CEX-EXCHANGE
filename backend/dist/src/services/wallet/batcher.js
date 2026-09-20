"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerBatcher = exports.SequelizeLedgerStatements = exports.LedgerConnectionLostError = exports.DEFAULT_LEDGER_TICK_MS = void 0;
exports.ledgerTickMs = ledgerTickMs;
exports.foldIdempotencyKey = foldIdempotencyKey;
exports.isRetryableBatchError = isRetryableBatchError;
exports.buildWalletCaseUpdate = buildWalletCaseUpdate;
exports.walletState = walletState;
exports.poolState = poolState;
const crypto_1 = require("crypto");
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const engine_lease_epoch_1 = require("@b/utils/engine-lease-epoch");
const WalletService_1 = require("./WalletService");
const errors_1 = require("./errors");
const serial_1 = require("./serial");
exports.DEFAULT_LEDGER_TICK_MS = 20;
function ledgerTickMs() {
    const raw = process.env.ECO_LEDGER_TICK_MS;
    if (raw === undefined || raw.trim() === "")
        return exports.DEFAULT_LEDGER_TICK_MS;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : exports.DEFAULT_LEDGER_TICK_MS;
}
const DEFAULT_MAX_RETRIES = 3;
function foldIdempotencyKey(key) {
    return key.replace(/ +$/u, "").toLowerCase();
}
function isRetryableBatchError(error) {
    var _a, _b, _c, _d, _e, _f, _g;
    const e = error;
    if (!e)
        return false;
    if (e.retryableBatch === true)
        return true;
    if ((0, WalletService_1.isIdempotencyKeyViolation)(error))
        return true;
    const parent = (_b = (_a = e.parent) !== null && _a !== void 0 ? _a : e.original) !== null && _b !== void 0 ? _b : e;
    const code = String((_d = (_c = parent === null || parent === void 0 ? void 0 : parent.code) !== null && _c !== void 0 ? _c : e.code) !== null && _d !== void 0 ? _d : "");
    const errno = Number((_f = (_e = parent === null || parent === void 0 ? void 0 : parent.errno) !== null && _e !== void 0 ? _e : e.errno) !== null && _f !== void 0 ? _f : NaN);
    if (errno === 1213 || code === "ER_LOCK_DEADLOCK")
        return true;
    if (errno === 1205 || code === "ER_LOCK_WAIT_TIMEOUT")
        return true;
    if (code === "PROTOCOL_CONNECTION_LOST" ||
        code === "ECONNRESET" ||
        code === "EPIPE" ||
        code === "ETIMEDOUT" ||
        code === "ECONNREFUSED") {
        return true;
    }
    const name = String((_g = e.name) !== null && _g !== void 0 ? _g : "");
    return (name === "SequelizeConnectionError" ||
        name === "SequelizeConnectionRefusedError" ||
        name === "SequelizeConnectionTimedOutError" ||
        name === "SequelizeHostNotReachableError");
}
class LedgerConnectionLostError extends Error {
    constructor(message = "Connection lost: The server closed the connection.") {
        super(message);
        this.retryableBatch = true;
        this.code = "PROTOCOL_CONNECTION_LOST";
        this.name = "LedgerConnectionLostError";
    }
}
exports.LedgerConnectionLostError = LedgerConnectionLostError;
function buildWalletCaseUpdate(rows, now) {
    if (rows.length === 0)
        throw new Error("buildWalletCaseUpdate: no rows");
    const bind = [];
    const ref = (value) => {
        bind.push(value);
        return `$${bind.length}`;
    };
    const balanceCase = rows.map((r) => `WHEN ${ref(r.id)} THEN ${ref(r.balance)}`).join(" ");
    const inOrderCase = rows.map((r) => `WHEN ${ref(r.id)} THEN ${ref(r.inOrder)}`).join(" ");
    const updatedAt = ref(now);
    const ids = rows.map((r) => ref(r.id)).join(", ");
    const sql = "UPDATE `wallet` SET " +
        `\`balance\` = CASE \`id\` ${balanceCase} END, ` +
        `\`inOrder\` = CASE \`id\` ${inOrderCase} END, ` +
        `\`updatedAt\` = ${updatedAt} ` +
        `WHERE \`id\` IN (${ids})`;
    return { sql, bind };
}
function walletState(row) {
    var _a, _b;
    const plain = (row === null || row === void 0 ? void 0 : row.get) ? row.get({ plain: true }) : row;
    return {
        id: plain.id,
        userId: plain.userId,
        currency: plain.currency,
        balance: parseFloat(((_a = plain.balance) === null || _a === void 0 ? void 0 : _a.toString()) || "0"),
        inOrder: parseFloat(((_b = plain.inOrder) === null || _b === void 0 ? void 0 : _b.toString()) || "0"),
        status: plain.status,
    };
}
function poolState(row) {
    const plain = (row === null || row === void 0 ? void 0 : row.get) ? row.get({ plain: true }) : row;
    return {
        id: plain.id,
        marketMakerId: plain.marketMakerId,
        baseCurrencyBalance: Number(plain.baseCurrencyBalance),
        quoteCurrencyBalance: Number(plain.quoteCurrencyBalance),
    };
}
class SequelizeLedgerStatements {
    constructor(db = { models: db_1.models, sequelize: db_1.sequelize }) {
        this.db = db;
    }
    withTransaction(fn) {
        return this.db.sequelize.transaction(fn);
    }
    async precheck(t, keys) {
        if (keys.length === 0)
            return [];
        const rows = await this.db.models.transaction.findAll({
            where: {
                [sequelize_1.Op.or]: [{ id: { [sequelize_1.Op.in]: keys } }, { idempotencyKey: { [sequelize_1.Op.in]: keys } }],
            },
            attributes: ["id", "idempotencyKey"],
            paranoid: false,
            transaction: t,
        });
        return rows.map((r) => { var _a; return ({ id: r.id, idempotencyKey: (_a = r.idempotencyKey) !== null && _a !== void 0 ? _a : null }); });
    }
    async lockWallets(t, ids) {
        if (ids.length === 0)
            return [];
        const rows = await this.db.models.wallet.findAll({
            where: { id: { [sequelize_1.Op.in]: ids } },
            order: [["id", "ASC"]],
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        return rows.map(walletState);
    }
    async lockLease(t, key) {
        var _a;
        const row = await this.db.models.engineLease.findOne({
            where: { id: key },
            attributes: ["id", "epoch", "hostname", "pid"],
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!row)
            return null;
        const epoch = Number((_a = row.epoch) !== null && _a !== void 0 ? _a : 0);
        const pid = Number(row.pid);
        return {
            epoch: Number.isFinite(epoch) ? epoch : 0,
            hostname: row.hostname == null ? null : String(row.hostname),
            pid: Number.isFinite(pid) ? pid : null,
        };
    }
    async lockPools(t, marketMakerIds) {
        if (marketMakerIds.length === 0)
            return [];
        const rows = await this.db.models.aiMarketMakerPool.findAll({
            where: { marketMakerId: { [sequelize_1.Op.in]: marketMakerIds } },
            order: [["marketMakerId", "ASC"]],
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        return rows.map(poolState);
    }
    async updateWallets(t, rows) {
        if (rows.length === 0)
            return;
        const { sql, bind } = buildWalletCaseUpdate(rows, new Date());
        await this.db.sequelize.query(sql, { bind, transaction: t, type: sequelize_1.QueryTypes.UPDATE });
    }
    async updatePool(t, row) {
        await this.db.models.aiMarketMakerPool.update({ baseCurrencyBalance: row.baseCurrencyBalance, quoteCurrencyBalance: row.quoteCurrencyBalance }, { where: { id: row.id }, transaction: t });
    }
    async insertTransactions(t, rows) {
        if (rows.length === 0)
            return;
        await this.db.models.transaction.bulkCreate(rows, { transaction: t });
    }
    async insertAuditRow(t, row) {
        await this.db.models.walletAuditLog.create(row, { transaction: t });
    }
}
exports.SequelizeLedgerStatements = SequelizeLedgerStatements;
function fenceId(fence) {
    return `${fence.leaseKey}:${fence.epoch}`;
}
const AMOUNT_LABEL = {
    hold: "Hold",
    release: "Release",
    executeFromHold: "Execute",
    credit: "Credit",
};
function refusalAck(key, error) {
    var _a;
    const statusCode = typeof (error === null || error === void 0 ? void 0 : error.statusCode) === "number" ? error.statusCode : undefined;
    const code = typeof (error === null || error === void 0 ? void 0 : error.code) === "string"
        ? error.code
        : statusCode !== undefined
            ? `HTTP_${statusCode}`
            : "LEDGER_REFUSED";
    return { key, ok: false, code, message: String((_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error), statusCode };
}
class LedgerBatcher {
    constructor(options = {}) {
        var _a, _b, _c, _d;
        this.queue = [];
        this.nextSeq = 0;
        this.timer = null;
        this.inFlight = null;
        this.lastTickStartedAt = -Infinity;
        this.stopped = false;
        this.staleFences = new Map();
        this.stats = {
            ticks: 0,
            opsCommitted: 0,
            opsReplayed: 0,
            opsRefused: 0,
            opsFailed: 0,
            batchRetries: 0,
            lastStatementsPerTick: 0,
            lastMicrosPerStatement: 0,
            lastBatchOps: 0,
            lastCommitMs: 0,
            lastMicrosPerRow: 0,
            commitMsP50: 0,
            commitMsP99: 0,
            commitMsMax: 0,
            commitSamples: 0,
        };
        this.commitMicros = new Float64Array(LedgerBatcher.COMMIT_RING);
        this.commitCount = 0;
        this.statements = (_a = options.statements) !== null && _a !== void 0 ? _a : new SequelizeLedgerStatements();
        this.fence = options.fence;
        this.tickMs = (_b = options.tickMs) !== null && _b !== void 0 ? _b : ledgerTickMs();
        this.maxRetries = (_c = options.maxRetries) !== null && _c !== void 0 ? _c : DEFAULT_MAX_RETRIES;
        this.serial = (_d = options.serial) !== null && _d !== void 0 ? _d : serial_1.withWalletSerial;
    }
    setFence(fence) {
        this.fence = fence !== null && fence !== void 0 ? fence : undefined;
    }
    fenceLost(reason = "the engine lease was lost") {
        const fence = this.fence;
        if (!fence)
            return;
        this.staleFences.set(fenceId(fence), new engine_lease_epoch_1.EngineEpochMismatchError(fence.leaseKey, fence.epoch, null, reason));
        this.fence = undefined;
    }
    fenceInForce() {
        var _a;
        return (_a = this.fence) !== null && _a !== void 0 ? _a : null;
    }
    submit(op) {
        const fence = this.fence;
        if (fence) {
            const stale = this.staleFences.get(fenceId(fence));
            if (stale)
                return Promise.resolve(refusalAck(op.key, stale));
        }
        if (this.stopped) {
            return Promise.resolve({
                key: op.key,
                ok: false,
                code: "BATCHER_STOPPED",
                message: "The ledger batcher has been stopped and accepts no operations",
            });
        }
        return new Promise((resolve) => {
            this.queue.push({ op, seq: this.nextSeq++, resolve, fence });
            this.schedule();
        });
    }
    submitGroup(ops) {
        return Promise.all(ops.map((op) => this.submit(op)));
    }
    pending() {
        return this.queue.length;
    }
    metrics() {
        const held = Math.min(this.commitCount, LedgerBatcher.COMMIT_RING);
        if (held === 0)
            return { ...this.stats, commitMsP50: 0, commitMsP99: 0, commitMsMax: 0, commitSamples: 0 };
        const sorted = Array.from(this.commitMicros.subarray(0, held)).sort((a, b) => a - b);
        const at = (q) => sorted[Math.min(held - 1, Math.max(0, Math.ceil(q * held) - 1))] / 1000;
        return {
            ...this.stats,
            commitMsP50: Math.round(at(0.5) * 100) / 100,
            commitMsP99: Math.round(at(0.99) * 100) / 100,
            commitMsMax: Math.round((sorted[held - 1] / 1000) * 100) / 100,
            commitSamples: held,
        };
    }
    isFenced() {
        return this.fence !== undefined && this.staleFences.has(fenceId(this.fence));
    }
    async flush() {
        while (this.inFlight || this.queue.length > 0) {
            if (this.inFlight) {
                await this.inFlight;
                continue;
            }
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            await this.runTick();
        }
    }
    stop() {
        this.stopped = true;
        if (this.timer && this.queue.length === 0) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    schedule() {
        var _a, _b;
        if (this.timer || this.inFlight || this.queue.length === 0)
            return;
        const wait = Math.max(0, this.lastTickStartedAt + this.tickMs - Date.now());
        this.timer = setTimeout(() => {
            this.timer = null;
            void this.runTick();
        }, wait);
        (_b = (_a = this.timer).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    runTick() {
        if (this.inFlight)
            return this.inFlight;
        const entries = this.queue;
        this.queue = [];
        if (entries.length === 0)
            return Promise.resolve();
        this.lastTickStartedAt = Date.now();
        this.stats.ticks++;
        this.stats.lastBatchOps = entries.length;
        const run = this.executeWithRetry(entries)
            .then((acks) => {
            for (const entry of entries) {
                entry.resolve(acks.get(entry.seq));
            }
        })
            .finally(() => {
            this.inFlight = null;
            this.schedule();
        });
        this.inFlight = run;
        return run;
    }
    async executeWithRetry(entries) {
        var _a, _b;
        let attempt = 0;
        for (;;) {
            try {
                return await this.executeBatch(entries);
            }
            catch (error) {
                if (isRetryableBatchError(error) && attempt < this.maxRetries) {
                    attempt++;
                    this.stats.batchRetries++;
                    console_1.logger.warn("LEDGER_BATCHER", `Batch of ${entries.length} ops failed with ${String((_b = (_a = error === null || error === void 0 ? void 0 : error.code) !== null && _a !== void 0 ? _a : error === null || error === void 0 ? void 0 : error.name) !== null && _b !== void 0 ? _b : error)}; retry ${attempt}/${this.maxRetries} with the same keys`);
                    continue;
                }
                this.stats.opsFailed += entries.length;
                if ((error === null || error === void 0 ? void 0 : error.code) === "WALLET_BUSY") {
                    return new Map(entries.map((e) => [e.seq, refusalAck(e.op.key, error)]));
                }
                const ack = (key) => { var _a; return ({
                    key,
                    ok: false,
                    code: "BATCH_FAILED",
                    message: `The ledger batch failed as a whole and was not retried: ${String((_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error)}`,
                }); };
                return new Map(entries.map((e) => [e.seq, ack(e.op.key)]));
            }
        }
    }
    async executeBatch(entries) {
        const walletIds = new Set();
        const poolIds = new Set();
        const keys = [];
        for (const { op } of entries) {
            if (op.op === "pool")
                poolIds.add(op.marketMakerId);
            else if (op.op === "shortfallLoan")
                continue;
            else {
                walletIds.add(op.walletId);
                keys.push(op.key);
            }
        }
        const sortedWalletIds = Array.from(walletIds).sort();
        const sortedPoolIds = Array.from(poolIds).sort();
        const serialKeys = sortedWalletIds.map((id) => (0, serial_1.walletSerialKey)({ walletId: id }));
        return this.serial(serialKeys, () => this.statements.withTransaction(async (t) => {
            var _a;
            var _b, _c, _d, _e, _f, _g, _h;
            const startedAt = process.hrtime.bigint();
            let statementCount = 0;
            const present = new Map();
            if (keys.length > 0) {
                statementCount++;
                for (const row of await this.statements.precheck(t, keys)) {
                    if (row.idempotencyKey)
                        present.set(foldIdempotencyKey(row.idempotencyKey), row.id);
                    present.set(foldIdempotencyKey(row.id), row.id);
                }
            }
            const running = new Map();
            if (sortedWalletIds.length > 0) {
                statementCount++;
                for (const w of await this.statements.lockWallets(t, sortedWalletIds))
                    running.set(w.id, w);
            }
            const rowEpochs = new Map();
            const rowsByKey = new Map();
            for (const entry of entries) {
                const stamp = entry.fence;
                if (!stamp || rowEpochs.has(stamp.leaseKey))
                    continue;
                statementCount++;
                const row = await this.statements.lockLease(t, stamp.leaseKey);
                rowsByKey.set(stamp.leaseKey, row);
                rowEpochs.set(stamp.leaseKey, row ? row.epoch : null);
            }
            const pools = new Map();
            if (sortedPoolIds.length > 0) {
                statementCount++;
                for (const p of await this.statements.lockPools(t, sortedPoolIds))
                    pools.set(p.marketMakerId, p);
            }
            const applyStartedAt = process.hrtime.bigint();
            const acks = new Map();
            const rows = [];
            const touchedWallets = new Set();
            const touchedPools = new Set();
            const stagedKeys = new Map();
            for (const group of groupsInOrder(entries)) {
                const stage = new Map();
                const poolStage = new Map();
                const groupRows = [];
                const groupAcks = new Map();
                const groupStagedKeys = new Map();
                let refusal = null;
                let staleToken = null;
                for (const entry of group) {
                    const stamp = entry.fence;
                    if (!stamp)
                        continue;
                    if (this.staleFences.has(fenceId(stamp))) {
                        staleToken = stamp;
                        break;
                    }
                    if (rowEpochs.get(stamp.leaseKey) !== stamp.epoch && !(0, engine_lease_epoch_1.leaseRowNamesThisProcess)(rowsByKey.get(stamp.leaseKey))) {
                        staleToken = stamp;
                        break;
                    }
                }
                if (staleToken) {
                    const mismatch = (_b = this.staleFences.get(fenceId(staleToken))) !== null && _b !== void 0 ? _b : new engine_lease_epoch_1.EngineEpochMismatchError(staleToken.leaseKey, staleToken.epoch, (_c = rowEpochs.get(staleToken.leaseKey)) !== null && _c !== void 0 ? _c : null);
                    this.staleFences.set(fenceId(staleToken), mismatch);
                    for (const entry of group)
                        acks.set(entry.seq, refusalAck(entry.op.key, mismatch));
                    this.stats.opsRefused += group.length;
                    continue;
                }
                let keyedOps = 0;
                let poolOps = 0;
                let presentKeys = 0;
                for (const entry of group) {
                    if (entry.op.op === "pool") {
                        poolOps++;
                        continue;
                    }
                    if (entry.op.op === "shortfallLoan")
                        continue;
                    keyedOps++;
                    const folded = foldIdempotencyKey(entry.op.key);
                    if (present.has(folded) || stagedKeys.has(folded))
                        presentKeys++;
                }
                if (keyedOps === 0 && poolOps > 0) {
                    for (const entry of group) {
                        acks.set(entry.seq, {
                            key: entry.op.key,
                            ok: false,
                            code: "POOL_ONLY_GROUP",
                            statusCode: 400,
                            message: `Group ${entry.op.groupId}: a group of pool ops alone carries no idempotency row and is refused`,
                        });
                    }
                    this.stats.opsRefused += group.length;
                    continue;
                }
                const groupReplayed = keyedOps > 0 && presentKeys === keyedOps;
                if (presentKeys > 0 && !groupReplayed) {
                    for (const entry of group) {
                        acks.set(entry.seq, {
                            key: entry.op.key,
                            ok: false,
                            code: "GROUP_PARTIAL_REPLAY",
                            message: `Group ${entry.op.groupId}: ${presentKeys} of ${keyedOps} keys already have rows; ` +
                                `a partly applied group is never completed by the batcher`,
                        });
                    }
                    this.stats.opsRefused += group.length;
                    continue;
                }
                for (const entry of group) {
                    const { op } = entry;
                    try {
                        if (op.op === "shortfallLoan") {
                            throw (0, error_1.createError)({
                                statusCode: 501,
                                message: "shortfallLoan is not built in this batcher (section 2.4 residual disposition)",
                            });
                        }
                        if (op.op === "pool") {
                            if (groupReplayed) {
                                groupAcks.set(entry.seq, { key: op.key, ok: true, transactionId: op.groupId, replayed: true });
                                continue;
                            }
                            const poolFolded = foldIdempotencyKey(op.key);
                            if (stagedKeys.has(poolFolded) || groupStagedKeys.has(poolFolded)) {
                                groupAcks.set(entry.seq, { key: op.key, ok: true, transactionId: op.groupId, replayed: true });
                                continue;
                            }
                            const pool = (_d = poolStage.get(op.marketMakerId)) !== null && _d !== void 0 ? _d : pools.get(op.marketMakerId);
                            if (!pool) {
                                throw (0, error_1.createError)({
                                    statusCode: 404,
                                    message: `Pool not found for market maker ${op.marketMakerId}`,
                                });
                            }
                            const newBaseBalance = pool.baseCurrencyBalance + op.baseDelta;
                            const newQuoteBalance = pool.quoteCurrencyBalance + op.quoteDelta;
                            if (newBaseBalance < 0) {
                                throw (0, error_1.createError)({
                                    statusCode: 400,
                                    message: `Insufficient pool base balance: need ${Math.abs(op.baseDelta)}, have ${pool.baseCurrencyBalance}`,
                                });
                            }
                            if (newQuoteBalance < 0) {
                                throw (0, error_1.createError)({
                                    statusCode: 400,
                                    message: `Insufficient pool quote balance: need ${Math.abs(op.quoteDelta)}, have ${pool.quoteCurrencyBalance}`,
                                });
                            }
                            poolStage.set(op.marketMakerId, {
                                ...pool,
                                baseCurrencyBalance: newBaseBalance,
                                quoteCurrencyBalance: newQuoteBalance,
                            });
                            groupStagedKeys.set(foldIdempotencyKey(op.key), op.groupId);
                            groupAcks.set(entry.seq, { key: op.key, ok: true, transactionId: op.groupId });
                            continue;
                        }
                        const folded = foldIdempotencyKey(op.key);
                        const existing = (_f = (_e = present.get(folded)) !== null && _e !== void 0 ? _e : stagedKeys.get(folded)) !== null && _f !== void 0 ? _f : groupStagedKeys.get(folded);
                        if (existing) {
                            groupAcks.set(entry.seq, { key: op.key, ok: true, transactionId: existing, replayed: true });
                            continue;
                        }
                        (0, WalletService_1.validateLedgerAmount)(op.amount, AMOUNT_LABEL[op.op], op.currency);
                        const wallet = (_g = stage.get(op.walletId)) !== null && _g !== void 0 ? _g : running.get(op.walletId);
                        if (!wallet)
                            throw new errors_1.WalletNotFoundError(op.walletId);
                        (0, WalletService_1.validateLedgerWalletStatus)(wallet);
                        const staged = applyWalletOp(op, wallet);
                        stage.set(op.walletId, { ...wallet, balance: staged.balance, inOrder: staged.inOrder });
                        groupRows.push({ transaction: staged.transaction, audit: staged.audit });
                        groupStagedKeys.set(folded, staged.transaction.id);
                        groupAcks.set(entry.seq, {
                            key: op.key,
                            ok: true,
                            transactionId: staged.transaction.id,
                            walletId: op.walletId,
                            balance: staged.balance,
                            inOrder: staged.inOrder,
                        });
                    }
                    catch (error) {
                        refusal = { entry, error };
                        break;
                    }
                }
                if (refusal) {
                    const failing = refusal.entry;
                    for (const entry of group) {
                        acks.set(entry.seq, entry === failing
                            ? refusalAck(entry.op.key, refusal.error)
                            : {
                                key: entry.op.key,
                                ok: false,
                                code: "GROUP_ROLLED_BACK",
                                message: `Rolled back with group ${entry.op.groupId}: ${failing.op.key} was refused (${String((_h = (_a = refusal.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _h !== void 0 ? _h : refusal.error)})`,
                            });
                    }
                    this.stats.opsRefused += group.length;
                    continue;
                }
                for (const [id, w] of stage) {
                    running.set(id, w);
                    touchedWallets.add(id);
                }
                for (const [id, p] of poolStage) {
                    pools.set(id, p);
                    touchedPools.add(id);
                }
                for (const [k, id] of groupStagedKeys)
                    stagedKeys.set(k, id);
                rows.push(...groupRows);
                for (const [seq, ack] of groupAcks)
                    acks.set(seq, ack);
            }
            const applyMicros = Number((process.hrtime.bigint() - applyStartedAt) / BigInt(1000));
            if (touchedWallets.size > 0) {
                statementCount++;
                const writes = Array.from(touchedWallets)
                    .sort()
                    .map((id) => {
                    const w = running.get(id);
                    return { id, balance: w.balance, inOrder: w.inOrder };
                });
                await this.statements.updateWallets(t, writes);
            }
            for (const marketMakerId of Array.from(touchedPools).sort()) {
                statementCount++;
                const p = pools.get(marketMakerId);
                await this.statements.updatePool(t, {
                    id: p.id,
                    baseCurrencyBalance: p.baseCurrencyBalance,
                    quoteCurrencyBalance: p.quoteCurrencyBalance,
                });
            }
            if (rows.length > 0) {
                statementCount++;
                await this.statements.insertTransactions(t, rows.map((r) => r.transaction));
                for (const r of rows) {
                    statementCount++;
                    try {
                        await this.statements.insertAuditRow(t, r.audit);
                    }
                    catch (dbError) {
                        console_1.logger.warn("WALLET_AUDIT_PERSIST_FAILED", `Failed to persist audit entry for ${r.audit.operation} (${r.audit.idempotencyKey}): ${dbError === null || dbError === void 0 ? void 0 : dbError.message}`);
                    }
                }
            }
            const totalMicros = Number((process.hrtime.bigint() - startedAt) / BigInt(1000));
            this.stats.lastStatementsPerTick = statementCount;
            this.stats.lastMicrosPerStatement = statementCount > 0 ? Math.round(totalMicros / statementCount) : 0;
            this.stats.lastCommitMs = Math.round(totalMicros / 1000);
            this.commitMicros[this.commitCount % LedgerBatcher.COMMIT_RING] = totalMicros;
            this.commitCount++;
            this.stats.lastMicrosPerRow = rows.length > 0 ? Math.round(applyMicros / rows.length) : 0;
            let committed = 0;
            let replayed = 0;
            for (const ack of acks.values()) {
                if (ack.ok) {
                    if (ack.replayed)
                        replayed++;
                    else
                        committed++;
                }
            }
            this.stats.opsCommitted += committed;
            this.stats.opsReplayed += replayed;
            return acks;
        }), "other");
    }
}
exports.LedgerBatcher = LedgerBatcher;
LedgerBatcher.COMMIT_RING = 4096;
function groupsInOrder(entries) {
    const byGroup = new Map();
    for (const entry of entries) {
        const list = byGroup.get(entry.op.groupId);
        if (list)
            list.push(entry);
        else
            byGroup.set(entry.op.groupId, [entry]);
    }
    return Array.from(byGroup.values());
}
function applyWalletOp(op, wallet) {
    const userId = op.userId || wallet.userId;
    const id = (0, crypto_1.randomUUID)();
    switch (op.op) {
        case "hold": {
            const applied = (0, WalletService_1.applyHold)(wallet, op.amount, op.currency);
            const row = (0, WalletService_1.holdLedgerRow)({ idempotencyKey: op.key, operationType: op.operationType, reason: op.reason, expiresAt: op.expiresAt, metadata: op.metadata }, userId, wallet.id, applied);
            return {
                balance: applied.newBalance,
                inOrder: applied.newInOrder,
                transaction: { id, ...row },
                audit: {
                    userId,
                    walletId: wallet.id,
                    operation: "HOLD",
                    amount: applied.holdAmount,
                    previousBalance: applied.previousBalance,
                    newBalance: applied.newBalance,
                    previousInOrder: applied.previousInOrder,
                    newInOrder: applied.newInOrder,
                    transactionId: id,
                    idempotencyKey: op.key,
                    metadata: op.metadata,
                },
            };
        }
        case "release": {
            const applied = (0, WalletService_1.applyRelease)(wallet, op.amount, op.currency);
            const row = (0, WalletService_1.releaseLedgerRow)({ idempotencyKey: op.key, operationType: op.operationType, reason: op.reason, metadata: op.metadata }, userId, wallet.id, applied);
            return {
                balance: applied.newBalance,
                inOrder: applied.newInOrder,
                transaction: { id, ...row },
                audit: {
                    userId,
                    walletId: wallet.id,
                    operation: "RELEASE",
                    amount: applied.releaseAmount,
                    previousBalance: applied.previousBalance,
                    newBalance: applied.newBalance,
                    previousInOrder: applied.previousInOrder,
                    newInOrder: applied.newInOrder,
                    transactionId: id,
                    idempotencyKey: op.key,
                    metadata: op.metadata,
                },
            };
        }
        case "executeFromHold": {
            const applied = (0, WalletService_1.applyExecuteFromHold)(wallet, op.amount, op.fee, op.currency);
            const row = (0, WalletService_1.executeFromHoldLedgerRow)({
                idempotencyKey: op.key,
                operationType: op.operationType,
                description: op.description,
                referenceId: op.referenceId,
                metadata: op.metadata,
            }, userId, wallet.id, applied);
            return {
                balance: wallet.balance,
                inOrder: applied.newInOrder,
                transaction: { id, ...row },
                audit: {
                    userId,
                    walletId: wallet.id,
                    operation: "EXECUTE_FROM_HOLD",
                    amount: applied.totalExecute,
                    previousInOrder: applied.previousInOrder,
                    newInOrder: applied.newInOrder,
                    transactionId: id,
                    idempotencyKey: op.key,
                    metadata: op.metadata,
                },
            };
        }
        case "credit": {
            const applied = (0, WalletService_1.applyCredit)(wallet, op.amount, op.currency);
            const row = (0, WalletService_1.creditLedgerRow)({
                idempotencyKey: op.key,
                operationType: op.operationType,
                fee: op.fee,
                description: op.description,
                referenceId: op.referenceId,
                metadata: op.metadata,
            }, userId, wallet.id, applied);
            return {
                balance: applied.newBalance,
                inOrder: wallet.inOrder,
                transaction: { id, ...row },
                audit: {
                    userId,
                    walletId: wallet.id,
                    operation: "CREDIT",
                    amount: applied.creditAmount,
                    previousBalance: applied.previousBalance,
                    newBalance: applied.newBalance,
                    transactionId: id,
                    idempotencyKey: op.key,
                    metadata: op.metadata,
                },
            };
        }
    }
}
