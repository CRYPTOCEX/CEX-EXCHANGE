"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Lists all currencies with their current rates",
    description: "This endpoint retrieves all available currencies along with their current rates. Use sellable=true to filter currencies the user can sell (has wallet with balance).",
    operationId: "getCurrencies",
    tags: ["Finance", "Currency"],
    logModule: "FINANCE",
    logTitle: "Get valid currencies",
    parameters: [
        {
            name: "sellable",
            in: "query",
            description: "If true, only return currencies where the authenticated user has a wallet with available balance",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Currencies retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...utils_1.baseResponseSchema,
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.baseCurrencySchema,
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Currency"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { ctx, user, query } = data;
    const where = { status: true };
    const sellable = (query === null || query === void 0 ? void 0 : query.sellable) === "true";
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching currencies from all wallet types");
        const [fiatCurrencies, spotCurrencies, ecoCurrencies] = await Promise.all([
            db_1.models.currency.findAll({ where }),
            db_1.models.exchangeCurrency.findAll({ where }),
            db_1.models.ecosystemToken.findAll({ where }),
        ]);
        let userWalletMap = null;
        if (sellable && (user === null || user === void 0 ? void 0 : user.id)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user wallets for sellable filter");
            const { Op } = await Promise.resolve().then(() => __importStar(require("sequelize")));
            const wallets = await db_1.models.wallet.findAll({
                where: {
                    userId: user.id,
                    balance: { [Op.gt]: 0 },
                },
                attributes: ["type", "currency", "balance"],
            });
            userWalletMap = new Map();
            for (const w of wallets) {
                const wallet = w;
                if (!userWalletMap.has(wallet.type)) {
                    userWalletMap.set(wallet.type, new Set());
                }
                userWalletMap.get(wallet.type).add(wallet.currency);
            }
        }
        const fiatWithPrice = fiatCurrencies.filter((c) => {
            const rate = c.price || c.rate;
            return rate !== null && rate !== undefined && rate > 0;
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Formatting currency data");
        let fiatList = fiatWithPrice.map((currency) => ({
            value: currency.id,
            label: `${currency.id} - ${currency.name}`,
        }));
        let spotList = spotCurrencies.map((currency) => ({
            value: currency.currency,
            label: `${currency.currency} - ${currency.name}`,
        }));
        let fundingList = ecoCurrencies
            .filter((currency, index, self) => self.findIndex((c) => c.currency === currency.currency) === index)
            .map((currency) => ({
            value: currency.currency,
            label: `${currency.currency} - ${currency.name}`,
        }));
        if (userWalletMap) {
            const fiatWallets = userWalletMap.get("FIAT") || new Set();
            const spotWallets = userWalletMap.get("SPOT") || new Set();
            const ecoWallets = userWalletMap.get("ECO") || new Set();
            fiatList = fiatList.filter((c) => fiatWallets.has(c.value));
            spotList = spotList.filter((c) => spotWallets.has(c.value));
            fundingList = fundingList.filter((c) => ecoWallets.has(c.value));
        }
        const formattedCurrencies = {
            FIAT: fiatList,
            SPOT: spotList,
            FUNDING: fundingList,
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${fiatList.length} FIAT, ${spotList.length} SPOT, ${fundingList.length} ECO currencies`);
        return formattedCurrencies;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to fetch currencies");
        throw (0, error_1.createError)(500, "An error occurred while fetching currencies");
    }
};
