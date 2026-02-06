"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getActiveCustodialWallets = getActiveCustodialWallets;
const error_1 = require("@b/utils/error");
const utils_1 = require("../utils");
const query_1 = require("@b/utils/query");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Fetches a specific wallet by currency",
    description: "Retrieves details of a wallet associated with the logged-in user by its currency.",
    operationId: "getWallet",
    tags: ["Wallet", "User"],
    requiresAuth: true,
    logModule: "ECOSYSTEM",
    logTitle: "Get wallet by currency",
    parameters: [
        {
            index: 0,
            name: "currency",
            in: "path",
            required: true,
            schema: { type: "string", description: "Currency of the wallet" },
        },
        {
            name: "contractType",
            in: "query",
            schema: { type: "string", description: "Chain of the wallet address" },
        },
        {
            name: "chain",
            in: "query",
            schema: { type: "string", description: "Chain of the wallet address" },
        },
    ],
    responses: {
        200: {
            description: "Wallet retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseWalletSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Wallet"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    const { params, user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { currency } = params;
    const { contractType, chain } = query;
    let wallet;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching wallet for ${currency}`);
        wallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(user.id, currency);
    }
    catch (error) {
        console.error(`[WALLET_ERROR] Failed to get/create wallet for user ${user.id}, currency ${currency}:`, error);
        console.error(`[WALLET_ERROR] Error details:`, {
            message: error.message,
            stack: error.stack,
            original: (_a = error.original) === null || _a === void 0 ? void 0 : _a.message,
            sql: error.sql
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to get wallet: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to get wallet: ${error.message}`,
        });
    }
    if (contractType === "NO_PERMIT") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing NO_PERMIT wallet request");
        await (0, utils_1.unlockExpiredAddresses)(ctx);
        try {
            const wallets = await getActiveCustodialWallets(chain, ctx);
            const availableWallets = [];
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking wallet availability");
            for (const wallet of wallets) {
                if (!(await (0, utils_1.isAddressLocked)(wallet.address, ctx))) {
                    availableWallets.push(wallet);
                }
            }
            if (availableWallets.length === 0) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("No available custodial wallets");
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "All custodial wallets are currently in use. Please try again later.",
                });
            }
            const randomIndex = Math.floor(Math.random() * availableWallets.length);
            const selectedWallet = availableWallets[randomIndex];
            (0, utils_1.lockAddress)(selectedWallet.address, ctx);
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Assigned custodial wallet ${selectedWallet.address.substring(0, 10)}... for ${chain}`);
            return selectedWallet;
        }
        catch (error) {
            if (error.statusCode) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message);
                throw error;
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: error.message,
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved wallet for ${currency}`);
    return wallet;
};
async function getActiveCustodialWallets(chain, ctx) {
    var _a, _b;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching active custodial wallets for ${chain}`);
    const wallets = await db_1.models.ecosystemCustodialWallet.findAll({
        where: {
            chain: chain,
            status: "ACTIVE",
        },
        attributes: ["id", "address", "chain", "network"],
    });
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Found ${wallets.length} active custodial wallet(s) for ${chain}`);
    return wallets;
}
