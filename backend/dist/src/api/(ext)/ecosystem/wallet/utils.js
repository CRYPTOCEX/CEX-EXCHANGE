"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseWalletSchema = exports.baseTransactionSchema = void 0;
exports.lockAddress = lockAddress;
exports.isAddressLocked = isAddressLocked;
exports.isAddressLockedForUser = isAddressLockedForUser;
exports.unlockAddress = unlockAddress;
exports.unlockExpiredAddresses = unlockExpiredAddresses;
exports.getActiveCustodialWallets = getActiveCustodialWallets;
const db_1 = require("@b/db");
const schema_1 = require("@b/utils/schema");
exports.baseTransactionSchema = {
    id: (0, schema_1.baseStringSchema)("Transaction ID"),
    type: (0, schema_1.baseStringSchema)("Transaction type"),
    status: (0, schema_1.baseStringSchema)("Transaction status"),
    amount: (0, schema_1.baseNumberSchema)("Transaction amount"),
    fee: (0, schema_1.baseNumberSchema)("Transaction fee"),
    description: (0, schema_1.baseStringSchema)("Transaction description"),
    metadata: {
        type: "object",
        description: "Additional metadata for the transaction",
    },
    referenceId: (0, schema_1.baseStringSchema)("Reference ID"),
    createdAt: (0, schema_1.baseStringSchema)("Creation time of the transaction", undefined, undefined, false, "date-time"),
};
exports.baseWalletSchema = {
    id: (0, schema_1.baseStringSchema)("Wallet ID"),
    type: (0, schema_1.baseStringSchema)("Wallet type"),
    currency: (0, schema_1.baseStringSchema)("Wallet currency"),
    balance: (0, schema_1.baseNumberSchema)("Wallet balance"),
    transactions: {
        type: "array",
        description: "List of transactions",
        items: {
            type: "object",
            properties: exports.baseTransactionSchema,
            nullable: true,
        },
    },
    address: {
        type: "array",
        description: "Wallet addresses",
        items: (0, schema_1.baseStringSchema)("Wallet address"),
        nullable: true,
    },
};
// Map<address, { userId, timestamp }>. userId may be null for backward-compatibility callers.
const lockedAddressesCache = new Map();
function lockAddress(address, userIdOrCtx, ctx) {
    var _a, _b;
    // Backward compatibility: old callers pass (address, ctx). Detect and shift.
    let userId = null;
    let actualCtx = ctx;
    if (userIdOrCtx && typeof userIdOrCtx === "string") {
        userId = userIdOrCtx;
    }
    else if (userIdOrCtx && typeof userIdOrCtx === "object") {
        actualCtx = userIdOrCtx;
    }
    (_a = actualCtx === null || actualCtx === void 0 ? void 0 : actualCtx.step) === null || _a === void 0 ? void 0 : _a.call(actualCtx, `Locking address ${address.substring(0, 10)}...`);
    lockedAddressesCache.set(address, { userId, timestamp: Date.now() });
    console.info(`Locked address ${address}${userId ? ` for user ${userId}` : ""}`);
    (_b = actualCtx === null || actualCtx === void 0 ? void 0 : actualCtx.success) === null || _b === void 0 ? void 0 : _b.call(actualCtx, `Address ${address.substring(0, 10)}... locked`);
}
function isAddressLocked(address, ctx) {
    var _a, _b;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Checking if address ${address.substring(0, 10)}... is locked`);
    const isLocked = lockedAddressesCache.has(address);
    if (isLocked) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Address ${address.substring(0, 10)}... is locked`);
    }
    return isLocked;
}
function isAddressLockedForUser(address, userId) {
    const entry = lockedAddressesCache.get(address);
    if (!entry)
        return false;
    // Legacy entries without userId fall through as "not for this user" — caller must reassign.
    return entry.userId === userId;
}
function unlockAddress(address, ctx) {
    var _a, _b;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Unlocking address ${address.substring(0, 10)}...`);
    lockedAddressesCache.delete(address);
    console.info(`Unlocked address ${address}`);
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Address ${address.substring(0, 10)}... unlocked`);
}
function unlockExpiredAddresses(ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Checking for expired locked addresses");
    const currentTimestamp = Date.now();
    let unlockedCount = 0;
    lockedAddressesCache.forEach((entry, address) => {
        const lockTimestamp = (entry && typeof entry === "object") ? entry.timestamp : entry;
        if (currentTimestamp - lockTimestamp > 3600 * 1000) {
            unlockAddress(address, ctx);
            unlockedCount++;
        }
    });
    if (unlockedCount > 0) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Unlocked ${unlockedCount} expired address(es)`);
    }
    else {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "No expired addresses found");
    }
}
async function getActiveCustodialWallets(chain, ctx) {
    var _a, _b;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching active custodial wallets for ${chain}`);
    const wallets = await db_1.models.ecosystemCustodialWallet.findAll({
        where: {
            chain: chain,
            status: "ACTIVE",
        },
    });
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Found ${wallets.length} active custodial wallet(s) for ${chain}`);
    return wallets;
}
