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
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const rate_math_1 = require("./rate-math");
exports.metadata = {
    summary: "USD rates for every currency the caller holds",
    description: "One row per distinct currency across the user's wallets, carrying the raw stored price as a string and the direction that price points. Currencies with no usable rate are named in `unpriced` rather than valued at par.",
    operationId: "getWalletCurrencyRates",
    tags: ["Finance", "Currency"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Rates retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            rates: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        currency: { type: "string" },
                                        price: {
                                            type: "string",
                                            description: "Raw DECIMAL(30,15) value as stored. A string, so no precision is lost in transit.",
                                        },
                                        quote: {
                                            type: "string",
                                            enum: ["UNITS_PER_USD", "USD_PER_UNIT"],
                                            description: "UNITS_PER_USD means divide the amount by `price` to get USD; USD_PER_UNIT means multiply.",
                                        },
                                    },
                                },
                            },
                            unpriced: {
                                type: "array",
                                items: { type: "string" },
                                description: "Currencies the caller holds that have no usable rate. Their balances must be excluded from any USD total, not counted at par.",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
const EXCHANGE_PRICED = new Set(["SPOT", "ECO", "FUTURES"]);
async function getEcosystemPrices() {
    try {
        const module = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/matchingEngine")));
        const engine = await module.MatchingEngine.getInstance();
        return (0, rate_math_1.indexTickersByBaseAsset)(await engine.getTickers());
    }
    catch (_a) {
        return new Map();
    }
}
function isUsablePrice(stored) {
    if (stored === null || stored === undefined)
        return false;
    const value = Number(stored);
    return Number.isFinite(value) && value > 0;
}
exports.default = async (data) => {
    var _a;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Collecting the currencies this user holds");
    const wallets = await db_1.models.wallet.findAll({
        where: { userId: user.id },
        attributes: ["currency", "type"],
        raw: true,
    });
    const fiatCodes = new Set();
    const exchangeCodes = new Set();
    const held = new Set();
    for (const wallet of wallets) {
        const code = String((_a = wallet.currency) !== null && _a !== void 0 ? _a : "").trim();
        if (!code)
            continue;
        held.add(code);
        if (wallet.type === "FIAT")
            fiatCodes.add(code);
        else if (EXCHANGE_PRICED.has(wallet.type))
            exchangeCodes.add(code);
    }
    const rates = new Map();
    if (held.has("USD")) {
        rates.set("USD", { currency: "USD", price: "1", quote: "UNITS_PER_USD" });
    }
    if (fiatCodes.size > 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading fiat rates");
        const rows = await db_1.models.currency.findAll({
            where: { id: [...fiatCodes], status: true },
            attributes: ["id", "price"],
            raw: true,
        });
        for (const row of rows) {
            if (rates.has(row.id))
                continue;
            if (!isUsablePrice(row.price))
                continue;
            rates.set(row.id, {
                currency: row.id,
                price: String(row.price),
                quote: "UNITS_PER_USD",
            });
        }
    }
    if (exchangeCodes.size > 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading exchange listing prices");
        const rows = await db_1.models.exchangeCurrency.findAll({
            where: { currency: [...exchangeCodes], status: true },
            attributes: ["currency", "price"],
            raw: true,
        });
        for (const row of rows) {
            if (rates.has(row.currency))
                continue;
            if (!isUsablePrice(row.price))
                continue;
            rates.set(row.currency, {
                currency: row.currency,
                price: String(row.price),
                quote: "USD_PER_UNIT",
            });
        }
    }
    if ([...held].some((code) => !rates.has(code))) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading ecosystem ticker prices");
        const ecoPrices = await getEcosystemPrices();
        for (const code of held) {
            if (rates.has(code))
                continue;
            const last = ecoPrices.get(code);
            if (last === undefined || !isUsablePrice(last))
                continue;
            rates.set(code, {
                currency: code,
                price: String(last),
                quote: "USD_PER_UNIT",
            });
        }
    }
    const unpriced = [...held].filter((code) => !rates.has(code)).sort();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Priced ${rates.size} of ${held.size} held currencies`);
    return {
        rates: [...rates.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
        unpriced,
    };
};
