"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_POOL_USER_ID = void 0;
exports.ensurePoolAccount = ensurePoolAccount;
exports.isPoolAccount = isPoolAccount;
exports.getPoolFuturesWallet = getPoolFuturesWallet;
exports.getFuturesPoolSourceWallet = getFuturesPoolSourceWallet;
exports.poolFuturesFreeBalance = poolFuturesFreeBalance;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.AI_POOL_USER_ID = "a1000000-0000-4000-a000-000000000001";
const AI_POOL_EMAIL = "ai-market-maker@pool.invalid";
const AI_POOL_USERNAME = "ai_market_maker";
async function ensurePoolAccount() {
    var _a;
    const existing = await db_1.models.user.findByPk(exports.AI_POOL_USER_ID);
    if (existing)
        return existing;
    const role = await db_1.models.role.findOne({ where: { name: "User" } });
    try {
        const created = await db_1.models.user.create({
            id: exports.AI_POOL_USER_ID,
            email: AI_POOL_EMAIL,
            password: null,
            username: AI_POOL_USERNAME,
            firstName: "AI",
            lastName: "Market Maker",
            emailVerified: false,
            phoneVerified: false,
            roleId: (_a = role === null || role === void 0 ? void 0 : role.id) !== null && _a !== void 0 ? _a : null,
            status: "ACTIVE",
        });
        console_1.logger.info("AI_MM", `Created the AI market maker pool account (${exports.AI_POOL_USER_ID}). ` +
            `It holds futures margin and cannot be signed into.`);
        return created;
    }
    catch (error) {
        const again = await db_1.models.user.findByPk(exports.AI_POOL_USER_ID);
        if (again)
            return again;
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Could not create the AI market maker pool account: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
        });
    }
}
function isPoolAccount(userId) {
    return String(userId !== null && userId !== void 0 ? userId : "") === exports.AI_POOL_USER_ID;
}
async function getPoolFuturesWallet(currency, opts = {}) {
    await ensurePoolAccount();
    const existing = await db_1.models.wallet.findOne({
        where: { userId: exports.AI_POOL_USER_ID, currency, type: "FUTURES" },
    });
    if (existing)
        return existing;
    if (!opts.createIfMissing)
        return null;
    return db_1.models.wallet.create({
        userId: exports.AI_POOL_USER_ID,
        type: "FUTURES",
        currency,
        balance: 0,
        inOrder: 0,
        status: true,
    });
}
async function getFuturesPoolSourceWallet(userId, currency, options = {}) {
    const existing = await db_1.models.wallet.findOne({
        where: { userId, currency, type: "FUTURES" },
    });
    if (existing)
        return existing;
    if (!options.createIfMissing)
        return null;
    return db_1.models.wallet.create({
        userId,
        type: "FUTURES",
        currency,
        balance: 0,
        inOrder: 0,
        status: true,
    });
}
async function poolFuturesFreeBalance(currency) {
    const wallet = await getPoolFuturesWallet(currency);
    if (!wallet)
        return 0;
    const balance = Number(wallet.balance) || 0;
    const inOrder = Number(wallet.inOrder) || 0;
    const free = balance - inOrder;
    return free > 0 ? free : 0;
}
