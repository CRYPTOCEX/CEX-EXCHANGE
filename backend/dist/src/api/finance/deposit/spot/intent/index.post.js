"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
const wallet_1 = require("@b/services/wallet");
const kyc_1 = require("@b/utils/kyc");
const finance_availability_1 = require("@b/utils/finance-availability");
const settings_1 = require("@b/utils/spot-deposit/settings");
const networks_1 = require("@b/utils/spot-deposit/networks");
const intents_1 = require("@b/utils/spot-deposit/intents");
exports.metadata = {
    summary: "Declares a spot deposit and returns the address to send to",
    description: "Creates (or returns the caller's existing OPEN) spot deposit intent for a currency and network. The response says which attribution mode the intent runs in and what to show: the exchange's address and the declared amount (hash claim), the exchange's address and the exact amount to send (amount match), or the customer's own ecosystem address (ecosystem custody).",
    operationId: "createSpotDepositIntent",
    tags: ["Finance", "Deposit"],
    requiresAuth: true,
    logModule: "SPOT_DEPOSIT",
    logTitle: "Create spot deposit intent",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currency: { type: "string", description: "Currency code" },
                        network: { type: "string", description: "The exchange network id, as listed by the deposit network picker (`chain` is accepted as an alias)" },
                        amount: {
                            type: "number",
                            description: "The amount the customer will send. Required unless the platform runs ecosystem custody for this network",
                        },
                    },
                    required: ["currency", "network"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Intent created or returned",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            intent: { type: "object" },
                            mode: { type: "string", enum: ["hash_claim", "amount_match", "ecosystem_custody"] },
                            address: { type: "string", nullable: true },
                            tag: { type: "string", nullable: true },
                            chain: { type: "string", nullable: true },
                            network: { type: "string" },
                            declaredAmount: { type: "string", nullable: true },
                            expectedAmount: { type: "string", nullable: true },
                            sendBy: { type: "string" },
                            expiresAt: { type: "string" },
                            fee: { type: "object", nullable: true },
                            custodyReason: { type: "string", nullable: true },
                            created: { type: "boolean" },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid request (missing amount, below the network minimum, too many decimals)" },
        401: query_1.unauthorizedResponse,
        404: { description: "Currency or network not available" },
        409: { description: "Too many open intents, or no free amount for the nudge" },
        500: query_1.serverErrorResponse,
    },
};
function ownAddressOnChain(wallet, chain) {
    let map = wallet === null || wallet === void 0 ? void 0 : wallet.address;
    try {
        if (typeof map === "string")
            map = JSON.parse(map);
        if (typeof map === "string")
            map = JSON.parse(map);
    }
    catch (_a) {
        return null;
    }
    const entry = map === null || map === void 0 ? void 0 : map[chain];
    const address = entry === null || entry === void 0 ? void 0 : entry.address;
    return address && typeof address === "string" ? { address, index: entry.index } : null;
}
exports.default = async (data) => {
    var _a, _b, _c, _d;
    var _e, _f, _g;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const currency = (0, intents_1.normaliseCurrency)(body === null || body === void 0 ? void 0 : body.currency);
    const networkRaw = String((_f = (_e = body === null || body === void 0 ? void 0 : body.network) !== null && _e !== void 0 ? _e : body === null || body === void 0 ? void 0 : body.chain) !== null && _f !== void 0 ? _f : "").trim();
    const network = (0, networks_1.normaliseNetwork)(networkRaw);
    if (!currency || !network) {
        throw (0, error_1.createError)({ statusCode: 400, message: "currency and network are required" });
    }
    const safeParamPattern = /^[a-zA-Z0-9._-]{1,32}$/;
    if (!safeParamPattern.test(currency) || !safeParamPattern.test(network)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid currency or network" });
    }
    await (0, kyc_1.assertKycFeature)(user.id, kyc_1.KYC_FEATURES.DEPOSIT_WALLET, "deposit funds");
    await (0, finance_availability_1.assertWalletTypeEnabled)("SPOT", "deposit funds", ctx);
    await (0, finance_availability_1.assertCurrencyEnabled)("SPOT", currency, ctx);
    await (0, settings_1.ensureSpotDepositMode)();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for an open intent");
    const existing = await (0, intents_1.findOpenIntentFor)(user.id, currency, network);
    if (existing) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Existing intent ${existing.id} returned`);
        await startMatchLoop(existing);
        return respond(existing, false, null);
    }
    await (0, intents_1.assertOpenIntentCapacity)(user.id);
    const setting = await (0, settings_1.getSpotDepositMode)();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading the exchange's network catalogue");
    const exchange = await exchange_1.default.startExchange(ctx);
    const provider = await exchange_1.default.getProvider();
    if (!exchange)
        throw (0, error_1.createError)({ statusCode: 500, message: "Exchange not found" });
    if (!provider)
        throw (0, error_1.createError)({ statusCode: 500, message: "Exchange provider not found" });
    let currencies;
    try {
        currencies = (await exchange.fetchCurrencies()) || {};
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `fetchCurrencies failed on ${provider}`, error);
        throw (0, error_1.createError)({
            statusCode: 503,
            message: `Unable to load currency data from ${provider}. The exchange API credentials may be missing or invalid.`,
        });
    }
    const info = (0, networks_1.describeExchangeNetwork)(currencies, currency, networkRaw, provider);
    if (!info) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Network ${network} not listed for ${currency}`);
        throw (0, error_1.createError)({ statusCode: 404, message: `${currency} is not available on ${network} at ${provider}` });
    }
    if (!info.depositEnabled) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Deposits of ${currency} on ${network} are currently disabled` });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Resolving the exchange deposit address for ${currency}/${info.key}`);
    const { getExchangeDepositAddress } = require("@b/utils/pool-backing/exchange-io");
    const exchangeAddress = await getExchangeDepositAddress(exchange, provider, currency, info.key);
    let custody = null;
    if (setting === "ecosystem_custody") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking ecosystem custody eligibility");
        custody = await (0, networks_1.eligibilityForCustody)({
            currency,
            networkId: info.key,
            exchangeNetwork: info.name,
            exchangeAddressHasTag: !!exchangeAddress.tag,
            depositMin: info.depositMin,
        });
    }
    let mode = (0, intents_1.decideMode)(setting, (custody === null || custody === void 0 ? void 0 : custody.eligible) === true && !!(custody === null || custody === void 0 ? void 0 : custody.chain));
    const metadata = {
        provider,
        exchangeNetworkId: info.key,
        exchangeNetworkName: info.name,
        exchangeAddress: exchangeAddress.address,
        exchangeTag: exchangeAddress.tag,
    };
    let walletId = null;
    let address = exchangeAddress.address;
    let tag = exchangeAddress.tag;
    let fee = null;
    if (mode === "ecosystem_custody" && (custody === null || custody === void 0 ? void 0 : custody.chain)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Resolving the customer's own ${custody.chain} address`);
        let own = null;
        let ecoWallet = null;
        try {
            const { getWalletByUserIdAndCurrency } = require("@b/api/(ext)/ecosystem/utils/wallet");
            ecoWallet = await getWalletByUserIdAndCurrency(user.id, currency, "ECO");
            own = ownAddressOnChain(ecoWallet, custody.chain);
        }
        catch (error) {
            console_1.logger.warn("SPOT_DEPOSIT", `ECO wallet for ${user.id} ${currency} on ${custody.chain} unavailable: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
        if (own && (ecoWallet === null || ecoWallet === void 0 ? void 0 : ecoWallet.id)) {
            walletId = String(ecoWallet.id);
            address = own.address;
            tag = null;
            metadata.custodyToken = (_g = custody.token) !== null && _g !== void 0 ? _g : null;
            metadata.minUnknown = custody.minUnknown === true;
            try {
                const { registerActiveDepositAddress } = require("@b/api/(ext)/ecosystem/deposit/util/BackgroundDepositScanner");
                await registerActiveDepositAddress({
                    walletId,
                    userId: user.id,
                    chain: custody.chain,
                    currency,
                    address: own.address,
                    contractType: (_a = custody.token) === null || _a === void 0 ? void 0 : _a.contractType,
                    contract: (_b = custody.token) === null || _b === void 0 ? void 0 : _b.contract,
                    decimals: (_c = custody.token) === null || _c === void 0 ? void 0 : _c.decimals,
                });
            }
            catch (error) {
                console_1.logger.warn("SPOT_DEPOSIT", `Background scanner registration failed for ${own.address}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            }
            try {
                const custodyUtils = require("@b/api/(ext)/ecosystem/utils/spot-custody");
                if (typeof (custodyUtils === null || custodyUtils === void 0 ? void 0 : custodyUtils.quoteSweepFee) === "function") {
                    fee = await custodyUtils.quoteSweepFee({ currency, chain: custody.chain, userId: user.id, walletId });
                }
            }
            catch (error) {
                console_1.logger.debug("SPOT_DEPOSIT", `No sweep fee quote: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            }
        }
        else {
            custody = { ...custody, eligible: false, reason: `No ${custody.chain} address on the customer's ${currency} Funding wallet` };
            mode = (0, intents_1.decideMode)(setting, false);
        }
    }
    if (mode !== "ecosystem_custody") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding or creating SPOT wallet");
        const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "SPOT", currency);
        walletId = ((_d = walletResult === null || walletResult === void 0 ? void 0 : walletResult.wallet) === null || _d === void 0 ? void 0 : _d.id) ? String(walletResult.wallet.id) : null;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating the intent");
    const result = await (0, intents_1.createIntent)({
        userId: user.id,
        currency,
        network,
        amount: body === null || body === void 0 ? void 0 : body.amount,
        preferredMode: setting,
        custody,
        walletId,
        address,
        tag,
        precision: info.precision,
        depositMin: info.depositMin,
        metadata,
    });
    await startMatchLoop(result.intent);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Intent ${result.intent.id} ${result.created ? "created" : "returned"} in ${result.mode}`);
    return respond(result.intent, result.created, fee);
};
async function startMatchLoop(intent) {
    if (String(intent === null || intent === void 0 ? void 0 : intent.mode) !== "amount_match")
        return;
    try {
        const { startSpotIntentSchedule } = require("@b/api/finance/deposit/spot/index.ws");
        await startSpotIntentSchedule(String(intent.id));
    }
    catch (error) {
        console_1.logger.debug("SPOT_DEPOSIT", `Match schedule not started for intent ${intent === null || intent === void 0 ? void 0 : intent.id}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
}
function respond(intent, created, fee) {
    var _a;
    var _b, _c, _d, _e, _f, _g;
    const plain = (0, intents_1.serialiseIntent)(intent);
    return {
        intent: plain,
        mode: plain.mode,
        address: (_b = plain.address) !== null && _b !== void 0 ? _b : null,
        tag: (_c = plain.tag) !== null && _c !== void 0 ? _c : null,
        chain: (_d = plain.chain) !== null && _d !== void 0 ? _d : null,
        network: plain.network,
        declaredAmount: (_e = plain.declaredAmount) !== null && _e !== void 0 ? _e : null,
        expectedAmount: (_f = plain.expectedAmount) !== null && _f !== void 0 ? _f : null,
        sendBy: plain.sendBy,
        expiresAt: plain.expiresAt instanceof Date ? plain.expiresAt.toISOString() : plain.expiresAt,
        fee,
        custodyReason: (_g = (_a = plain.metadata) === null || _a === void 0 ? void 0 : _a.custodyReason) !== null && _g !== void 0 ? _g : null,
        created,
    };
}
