"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRASH_POINT_ENV = exports.CRASH_EXIT_CODE = exports.CRASH_POINTS = void 0;
exports.armedCrashPoint = armedCrashPoint;
exports.crashPoint = crashPoint;
const fs_1 = __importDefault(require("fs"));
exports.CRASH_POINTS = [
    "placeOrder.afterCreateOrder",
    "placeOrder.afterHold",
    "engine.afterSettlementCommit",
    "engine.afterScyllaBatch",
    "engine.afterTickCommitBeforeFeeBatch",
    "shard.afterIntentDurable",
    "shard.afterHoldCommit",
    "shard.afterFillDurable",
    "shard.afterLedgerCommit",
    "shard.afterCancelDurable",
];
exports.CRASH_EXIT_CODE = 137;
exports.CRASH_POINT_ENV = "ECO_CRASH_POINT";
function armedCrashPoint() {
    if (process.env.NODE_ENV === "production")
        return null;
    const wanted = process.env[exports.CRASH_POINT_ENV];
    if (!wanted)
        return null;
    return exports.CRASH_POINTS.includes(wanted) ? wanted : null;
}
function crashPoint(name) {
    if (process.env.NODE_ENV === "production")
        return;
    if (process.env[exports.CRASH_POINT_ENV] !== name)
        return;
    const line = `[ECO_CRASH_POINT] firing "${name}" in pid ${process.pid}: exiting ${exports.CRASH_EXIT_CODE} ` +
        `without running any handler (chaos lane, plans/done/ORDER-SCALE-10K.md WP-0.8)\n`;
    try {
        fs_1.default.writeSync(2, line);
    }
    catch (_a) {
    }
    process.exit(exports.CRASH_EXIT_CODE);
}
