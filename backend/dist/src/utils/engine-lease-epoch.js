"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineEpochMismatchError = void 0;
exports.leaseRowNamesThisProcess = leaseRowNamesThisProcess;
exports.readEpoch = readEpoch;
exports.bumpEpoch = bumpEpoch;
exports.compareOrAbort = compareOrAbort;
const os_1 = __importDefault(require("os"));
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
function leaseRowNamesThisProcess(row) {
    var _a;
    if (!row)
        return false;
    return String((_a = row.hostname) !== null && _a !== void 0 ? _a : "") === os_1.default.hostname() && Number(row.pid) === process.pid;
}
class EngineEpochMismatchError extends Error {
    constructor(leaseKey, expected, actual, reason) {
        super(reason
            ? `Engine lease "${leaseKey}": the fence at epoch ${expected} is lost (${reason}); this batch must not commit`
            : actual === null
                ? `Engine lease "${leaseKey}" has no row; this process holds epoch ${expected} for a lease that no longer exists`
                : `Engine lease "${leaseKey}" is at epoch ${actual}, this process holds epoch ${expected}; another process was promoted and this batch must not commit`);
        this.code = "EPOCH_MISMATCH";
        this.statusCode = 409;
        this.name = "EngineEpochMismatchError";
        this.leaseKey = leaseKey;
        this.expected = expected;
        this.actual = actual;
    }
}
exports.EngineEpochMismatchError = EngineEpochMismatchError;
async function readEpoch(key, transaction) {
    var _a;
    const row = await db_1.models.engineLease.findOne({
        where: { id: key },
        attributes: ["id", "epoch"],
        ...(transaction && { transaction, lock: sequelize_1.Transaction.LOCK.UPDATE }),
    });
    if (!row)
        return null;
    const epoch = Number((_a = row.epoch) !== null && _a !== void 0 ? _a : 0);
    return Number.isFinite(epoch) ? epoch : 0;
}
async function bumpEpoch(key, instanceId) {
    if (!(db_1.models === null || db_1.models === void 0 ? void 0 : db_1.models.engineLease))
        return { status: "no-row" };
    return db_1.sequelize.transaction(async (t) => {
        var _a;
        const row = await db_1.models.engineLease.findOne({
            where: { id: key },
            attributes: ["id", "epoch", "instanceId", "hostname", "pid"],
            transaction: t,
            lock: sequelize_1.Transaction.LOCK.UPDATE,
        });
        if (!row)
            return { status: "no-row" };
        const holder = row.instanceId == null ? null : String(row.instanceId);
        if (instanceId !== undefined && holder !== instanceId && !leaseRowNamesThisProcess(row)) {
            return { status: "not-holder", holder };
        }
        const current = Number((_a = row.epoch) !== null && _a !== void 0 ? _a : 0);
        const next = (Number.isFinite(current) ? current : 0) + 1;
        await db_1.models.engineLease.update({ epoch: next }, { where: { id: key }, transaction: t });
        return { status: "bumped", epoch: next };
    });
}
function compareOrAbort(leaseKey, expected, actual) {
    if (actual === null || actual !== expected) {
        throw new EngineEpochMismatchError(leaseKey, expected, actual);
    }
}
