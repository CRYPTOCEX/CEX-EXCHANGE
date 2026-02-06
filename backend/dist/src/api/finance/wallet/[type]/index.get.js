"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("@b/api/admin/finance/wallet/utils");
const error_1 = require("@b/utils/error");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Lists all wallets for a given type",
    operationId: "listWalletsForType",
    tags: ["Finance", "Wallets"],
    parameters: [
        {
            index: 0,
            name: "type",
            in: "path",
            description: "Wallet type",
            required: true,
            schema: {
                type: "string",
                enum: ["FIAT", "SPOT", "ECO", "FUTURES"],
            },
        },
    ],
    responses: {
        200: {
            description: "List of wallets",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.walletSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Wallets"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const walletType = params.type;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching ${walletType} wallets`);
    if (walletType === "SPOT") {
        const cacheManager = cache_1.CacheManager.getInstance();
        const spotWalletsEnabled = await cacheManager.getSetting("spotWallets");
        const isSpotEnabled = spotWalletsEnabled === true || spotWalletsEnabled === "true";
        if (!isSpotEnabled) {
            return [];
        }
    }
    const where = { userId: user.id, type: walletType };
    const items = await db_1.models.wallet.findAll({
        where,
        paranoid: false,
    });
    const ecoWallets = items.filter((wallet) => wallet.type === "ECO");
    if (ecoWallets.length > 0) {
        const ecoCurrencies = Array.from(new Set(ecoWallets.map((wallet) => wallet.currency)));
        const ecosystemTokens = await db_1.models.ecosystemToken.findAll({
            where: { currency: ecoCurrencies },
        });
        const tokenMap = new Map(ecosystemTokens.map((token) => [token.currency, token.icon]));
        ecoWallets.forEach((wallet) => {
            wallet.icon = tokenMap.get(wallet.currency) || null;
        });
    }
    const walletsWithAvailableBalance = items.map((wallet) => {
        const walletData = wallet.toJSON();
        return {
            ...walletData,
            availableBalance: (Number(wallet.balance) || 0) - (Number(wallet.inOrder) || 0),
        };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${walletsWithAvailableBalance.length} ${walletType} wallets`);
    return walletsWithAvailableBalance;
};
