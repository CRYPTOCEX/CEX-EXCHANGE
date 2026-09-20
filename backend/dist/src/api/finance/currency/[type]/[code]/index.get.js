"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const utils_1 = require("../../utils");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const token_network_1 = require("@b/utils/token-network");
const funding = require("@b/utils/exchange-funding");
const health_1 = require("@b/utils/deposit-gateway/health");
exports.metadata = {
    summary: "Retrieves a single currency by its ID",
    description: "This endpoint retrieves a single currency by its ID.",
    operationId: "getCurrencyById",
    tags: ["Finance", "Currency"],
    requiresAuth: true,
    parameters: [
        {
            name: "action",
            in: "query",
            description: "The action to perform",
            required: false,
            schema: {
                type: "string",
            },
        },
        {
            index: 0,
            name: "type",
            in: "path",
            required: true,
            schema: {
                type: "string",
                enum: ["FIAT", "SPOT", "ECO", "FUTURES"],
            },
        },
        {
            index: 1,
            name: "code",
            in: "path",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    responses: {
        200: {
            description: "Currency retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...utils_1.baseResponseSchema,
                            data: {
                                type: "object",
                                properties: utils_1.baseCurrencySchema,
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
};
exports.default = async (data) => {
    const { user, params, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    const { action } = query;
    const { type, code } = params;
    if (!type || !code)
        throw (0, error_1.createError)(400, "Invalid type or code");
    const safeParamPattern = /^[a-zA-Z0-9._-]{1,20}$/;
    if (!safeParamPattern.test(code)) {
        throw (0, error_1.createError)(400, "Invalid currency code");
    }
    switch (action) {
        case "deposit":
            return handleDeposit(type, code, ctx);
        case "withdraw":
            return handleWithdraw(type, code, ctx);
        default:
            throw (0, error_1.createError)(400, "Invalid action");
    }
};
function findExchangeCurrency(currencies, code) {
    const wanted = code.toUpperCase();
    const list = Object.values(currencies || {});
    return (list.find((c) => { var _a; return String((_a = c === null || c === void 0 ? void 0 : c.code) !== null && _a !== void 0 ? _a : "").toUpperCase() === wanted; }) ||
        list.find((c) => { var _a; return String((_a = c === null || c === void 0 ? void 0 : c.id) !== null && _a !== void 0 ? _a : "").toUpperCase() === wanted; }));
}
const isDepositableNetwork = (n) => (n === null || n === void 0 ? void 0 : n.active) !== false &&
    ((n === null || n === void 0 ? void 0 : n.deposit) === true || ((n === null || n === void 0 ? void 0 : n.deposit) === undefined && (n === null || n === void 0 ? void 0 : n.active) === true));
const isWithdrawableNetwork = (n) => (n === null || n === void 0 ? void 0 : n.active) !== false &&
    ((n === null || n === void 0 ? void 0 : n.withdraw) === true || ((n === null || n === void 0 ? void 0 : n.withdraw) === undefined && (n === null || n === void 0 ? void 0 : n.active) === true));
function assertExchangeCanAuthenticate(exchange, provider) {
    const label = provider || "the exchange";
    if (typeof (exchange === null || exchange === void 0 ? void 0 : exchange.checkRequiredCredentials) !== "function")
        return;
    if (exchange.checkRequiredCredentials(false))
        return;
    console_1.logger.error("CURRENCY", `${label} has no usable API credentials — no deposit or withdrawal route can be offered for it`, new Error(`Missing or rejected API credentials for ${label}`));
    throw (0, error_1.createError)(503, `Unable to load currency data from ${label}. The exchange API credentials may be missing or invalid.`);
}
async function loadExchangeCurrencies(exchange, provider, code, action) {
    return funding.loadFundingCurrencies(exchange, provider, code, action);
}
async function handleDeposit(type, code, ctx) {
    switch (type) {
        case "FIAT": {
            const gateways = await db_1.models.depositGateway.findAll({
                where: {
                    status: true,
                    type: "FIAT",
                    [sequelize_1.Op.and]: sequelize_1.Sequelize.literal(`JSON_CONTAINS(currencies, '"${code}"')`),
                },
            });
            const graded = gateways.map((g) => ({
                row: g,
                health: (0, health_1.describeGatewayHealth)(g.get({ plain: true })),
            }));
            const usableGateways = graded
                .filter(({ health }) => health.supported && health.credentialsComplete)
                .map(({ row }) => row);
            if (usableGateways.length < gateways.length) {
                const hidden = graded
                    .filter(({ row }) => !usableGateways.includes(row))
                    .map(({ row, health }) => {
                    const name = row.name;
                    return health.missingRequired.length
                        ? `${name} (${health.missingRequired.join(", ")})`
                        : name;
                });
                console_1.logger.warn("CURRENCY", `Hiding ${hidden.length} enabled ${code} deposit gateway(s) with incomplete credentials: ${hidden.join(", ")}. Configure them under Admin → Finance → Deposit Gateways, or switch them off.`);
            }
            const cannotConfirm = graded.filter(({ health }) => health.supported &&
                health.credentialsComplete &&
                health.inboundComplete === false);
            if (cannotConfirm.length) {
                const detail = cannotConfirm
                    .map(({ row, health }) => `${row.name} (${health.missingInbound.join(", ")})`)
                    .join("; ");
                console_1.logger.error("CURRENCY", `${cannotConfirm.length} ${code} deposit gateway(s) are offered and cannot confirm a payment: ${detail}. The customer is charged, the confirmation webhook answers 5xx and the wallet is never credited from it. Set those variables under Admin → Finance → Deposit Gateways and restart, or switch the gateway off.`);
            }
            const methods = await db_1.models.depositMethod.findAll({
                where: { status: true },
            });
            const gatewaysWithFlag = usableGateways.map((g) => {
                const plain = g.get({ plain: true });
                return { ...plain, isGateway: true };
            });
            const methodsWithFlag = methods.map((m) => {
                const plain = m.get({ plain: true });
                return { ...plain, isGateway: false };
            });
            return { gateways: gatewaysWithFlag, methods: methodsWithFlag };
        }
        case "SPOT":
            {
                const exchange = await exchange_1.default.startExchange(ctx);
                const provider = await exchange_1.default.getProvider();
                if (!exchange)
                    throw (0, error_1.createError)(500, "Exchange not found");
                const currencies = await loadExchangeCurrencies(exchange, provider, code, "deposit");
                const currency = findExchangeCurrency(currencies, code);
                if (!currency)
                    throw (0, error_1.createError)(404, `${code} is not listed on ${provider || "the exchange"}`);
                if (currency.active === false || currency.deposit === false)
                    throw (0, error_1.createError)(400, `Deposits are currently disabled for ${code}`);
                const networks = Object.values(currency.networks || {});
                if (!networks.length) {
                    throw (0, error_1.createError)(400, "Networks data is missing or invalid");
                }
                return networks
                    .filter(isDepositableNetwork)
                    .map((network) => ({
                    id: network.id,
                    chain: network.network || network.name || network.id,
                    fee: network.fee,
                    precision: funding.precisionDecimals(network.precision ?? currency.precision, exchange.precisionMode),
                    limits: network.limits,
                }))
                    .sort((a, b) => String(a.chain).localeCompare(String(b.chain)));
            }
        case "ECO":
            {
                const allTokens = await db_1.models.ecosystemToken.findAll({
                    where: { status: true, currency: code },
                    attributes: [
                        "name",
                        "chain",
                        "network",
                        "icon",
                        "limits",
                        "fee",
                        "type",
                        "contractType",
                    ],
                    order: [["chain", "ASC"]],
                });
                const catalogue = await (0, token_network_1.loadChainNetworkCatalogue)();
                const tokens = allTokens.filter((token) => (0, token_network_1.tokenNetworkMatchesEnv)(token, catalogue));
                if (tokens.length < allTokens.length) {
                    const hidden = allTokens.filter((token) => !tokens.includes(token));
                    console_1.logger.warn("CURRENCY", `Hiding ${hidden.length} of ${allTokens.length} enabled ${code} deposit network(s): ${(0, token_network_1.describeTokenNetworkMismatch)(hidden, catalogue)}. Fix the chain's {CHAIN}_NETWORK / {CHAIN}_{NETWORK}_RPC, or switch the token off.`);
                }
                return tokens.map((token) => {
                    const tokenData = token.get({ plain: true });
                    let fee = { min: 0, percentage: 0 };
                    let limits = { deposit: { min: 1, max: 1000000 } };
                    try {
                        if (tokenData.fee) {
                            fee = typeof tokenData.fee === "string" ? JSON.parse(tokenData.fee) : tokenData.fee;
                            fee = fee || { min: 0, percentage: 0 };
                        }
                    }
                    catch (err) {
                        console_1.logger.warn("CURRENCY", `Failed to parse fee for token ${tokenData.name} (${tokenData.chain})`, err);
                        console_1.logger.warn("CURRENCY", `Raw fee value: ${JSON.stringify(tokenData.fee)}`);
                    }
                    try {
                        if (tokenData.limits) {
                            limits = typeof tokenData.limits === "string" ? JSON.parse(tokenData.limits) : tokenData.limits;
                            limits = limits || { deposit: { min: 1, max: 1000000 } };
                        }
                    }
                    catch (err) {
                        console_1.logger.warn("CURRENCY", `Failed to parse limits for token ${tokenData.name} (${tokenData.chain})`, err);
                        console_1.logger.warn("CURRENCY", `Raw limits value: ${JSON.stringify(tokenData.limits)}`);
                    }
                    return {
                        id: `${tokenData.chain}_${tokenData.type}`,
                        chain: tokenData.chain,
                        network: tokenData.chain,
                        name: tokenData.name,
                        icon: tokenData.icon,
                        type: tokenData.type,
                        contractType: tokenData.contractType,
                        fee: fee,
                        limits: limits,
                        precision: 8
                    };
                });
            }
        default:
            throw (0, error_1.createError)(400, "Invalid wallet type");
    }
}
async function handleWithdraw(type, code, ctx) {
    switch (type) {
        case "FIAT": {
            const methods = await db_1.models.withdrawMethod.findAll({
                where: { status: true },
            });
            return { methods };
        }
        case "SPOT": {
            const exchange = await exchange_1.default.startExchange(ctx);
            const provider = await exchange_1.default.getProvider();
            if (!exchange)
                throw (0, error_1.createError)(500, "Exchange not found");
            const currencyData = await db_1.models.exchangeCurrency.findOne({
                where: { currency: code, status: true },
            });
            if (!currencyData) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Currency not found" });
            }
            const percentageFee = currencyData.fee || 0;
            const currencies = await loadExchangeCurrencies(exchange, provider, code, "withdraw");
            const currency = findExchangeCurrency(currencies, code);
            if (!currency)
                throw (0, error_1.createError)(404, `${code} is not listed on ${provider || "the exchange"}`);
            if (currency.active === false || currency.withdraw === false)
                throw (0, error_1.createError)(400, `Withdrawals are currently disabled for ${code}`);
            if (!currency.networks ||
                typeof currency.networks !== "object" ||
                !Object.keys(currency.networks).length) {
                throw (0, error_1.createError)(400, "Networks data is missing or invalid");
            }
            return Object.values(currency.networks)
                .filter(isWithdrawableNetwork)
                .map((network) => {
                var _a, _b, _c, _d, _e;
                const chainName = network.network || network.name || network.id;
                const fixedFee = network.fee || ((_a = network.fees) === null || _a === void 0 ? void 0 : _a.withdraw) || 0;
                const minAmount = ((_c = (_b = network.limits) === null || _b === void 0 ? void 0 : _b.withdraw) === null || _c === void 0 ? void 0 : _c.min) || network.min_withdraw || 0;
                const maxAmount = ((_e = (_d = network.limits) === null || _d === void 0 ? void 0 : _d.withdraw) === null || _e === void 0 ? void 0 : _e.max) || network.max_withdraw || 0;
                return {
                    id: network.id,
                    title: `${code} (${chainName})`,
                    chain: chainName,
                    network: chainName,
                    fixedFee: fixedFee,
                    percentageFee: percentageFee,
                    minAmount: minAmount,
                    maxAmount: maxAmount,
                    precision: funding.precisionDecimals(network.precision ?? currency.precision, exchange.precisionMode),
                    limits: network.limits,
                    processingTime: "5-30 min",
                    instructions: `Withdraw ${code} to your ${chainName} wallet address.`,
                    customFields: JSON.stringify([
                        {
                            name: "address",
                            title: `${chainName} Address`,
                            type: "text",
                            required: true,
                            placeholder: `Enter your ${chainName} wallet address`,
                            validation: {
                                pattern: "^[a-zA-Z0-9]{25,}$",
                                message: "Invalid wallet address format"
                            }
                        }
                    ])
                };
            })
                .sort((a, b) => String(a.chain).localeCompare(String(b.chain)));
        }
        case "ECO": {
            const tokens = await db_1.models.ecosystemToken.findAll({
                where: { status: true, currency: code },
                attributes: ["name", "chain", "icon", "limits", "fee", "type", "contractType"],
                order: [["chain", "ASC"]],
            });
            return tokens.map((token) => {
                var _a, _b, _c, _d;
                const tokenData = token.get({ plain: true });
                let fee = { min: 0, percentage: 0 };
                let limits = { withdraw: { min: 1, max: 1000000 } };
                try {
                    if (tokenData.fee) {
                        fee = typeof tokenData.fee === "string" ? JSON.parse(tokenData.fee) : tokenData.fee;
                        fee = fee || { min: 0, percentage: 0 };
                    }
                }
                catch (err) {
                    console_1.logger.warn("CURRENCY", `Failed to parse fee for token ${tokenData.name}`, err);
                }
                try {
                    if (tokenData.limits) {
                        limits = typeof tokenData.limits === "string" ? JSON.parse(tokenData.limits) : tokenData.limits;
                        limits = limits || { withdraw: { min: 1, max: 1000000 } };
                    }
                }
                catch (err) {
                    console_1.logger.warn("CURRENCY", `Failed to parse limits for token ${tokenData.name}`, err);
                }
                return {
                    id: `${tokenData.chain}_${tokenData.type}`,
                    title: `${tokenData.name} (${tokenData.chain})`,
                    network: tokenData.chain,
                    chain: tokenData.chain,
                    type: tokenData.type,
                    contractType: tokenData.contractType,
                    image: tokenData.icon,
                    fixedFee: typeof fee.min === 'number' ? fee.min : parseFloat(fee.min) || 0,
                    percentageFee: typeof fee.percentage === 'number' ? fee.percentage : parseFloat(fee.percentage) || 0,
                    minAmount: typeof ((_a = limits.withdraw) === null || _a === void 0 ? void 0 : _a.min) === 'number' ? limits.withdraw.min : parseFloat((_b = limits.withdraw) === null || _b === void 0 ? void 0 : _b.min) || 1,
                    maxAmount: typeof ((_c = limits.withdraw) === null || _c === void 0 ? void 0 : _c.max) === 'number' ? limits.withdraw.max : parseFloat((_d = limits.withdraw) === null || _d === void 0 ? void 0 : _d.max) || 1000000,
                    processingTime: "5-30 min",
                    instructions: `Withdraw ${tokenData.name} to your ${tokenData.chain} wallet address.`,
                    customFields: JSON.stringify([
                        {
                            name: "address",
                            title: `${tokenData.chain} Address`,
                            type: "text",
                            required: true,
                            placeholder: `Enter your ${tokenData.chain} wallet address`,
                            validation: {
                                pattern: "^[a-zA-Z0-9]{25,}$",
                                message: "Invalid wallet address format"
                            }
                        }
                    ])
                };
            });
        }
        default:
            throw (0, error_1.createError)(400, "Invalid wallet type");
    }
}
