"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
const treasury_1 = require("@b/utils/pool-backing/treasury");
const networks_1 = require("@b/utils/pool-backing/networks");
const settings_1 = require("@b/utils/pool-backing/settings");
exports.metadata = {
    summary: "Pool backing: the treasury's wallets, addresses and exchange reachability",
    description: "The system user that holds the settlement reserve, every ECO wallet it has with the database balance and the address per chain, and for each chain the exchange network the engine would use, whether the exchange has deposits and withdrawals enabled on it, its limits, and whether the platform can sign on that chain. Read-only: creates nothing.",
    operationId: "getPoolBackingTreasury",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "view.pool.backing",
    responses: {
        200: {
            description: "Treasury retrieved",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            user: { type: "object" },
                            ecosystemInstalled: { type: "boolean" },
                            exchange: { type: "object" },
                            currencies: { type: "array", items: { type: "object" } },
                            masterReserve: {
                                type: "object",
                                description: "entries: chain -> native units the master wallet keeps, as the signer reads them; unknownChains: keys that name no ecosystem chain and are never looked up",
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
const PROBE_AMOUNT = 1e-8;
exports.default = async (data) => {
    var _a;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading the treasury's wallets");
    const treasuryUser = await db_1.models.user.findByPk(treasury_1.POOL_BACKING_TREASURY_USER_ID, { attributes: ["id"] });
    const holdings = await (0, treasury_1.readTreasuryHoldings)();
    const currencies = holdings.map((h) => h.currency);
    const anchorBy = new Map();
    const contractTypeBy = new Map();
    if (currencies.length) {
        const anchors = (await db_1.models.poolBackingCurrency.findAll({ where: { currency: currencies } }));
        for (const a of anchors)
            anchorBy.set(String(a.currency), a);
        try {
            const tokens = (await db_1.models.ecosystemToken.findAll({
                where: { currency: currencies, status: true },
                attributes: ["currency", "chain", "contractType"],
                raw: true,
            }));
            for (const t of tokens)
                contractTypeBy.set(`${t.currency}|${String(t.chain).toUpperCase()}`, String((_a = t.contractType) !== null && _a !== void 0 ? _a : ""));
        }
        catch (error) {
            console_1.logger.warn("POOL_BACKING", `ecosystemToken read failed for the treasury card: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
    }
    let ecosystemInstalled = false;
    try {
        const extensions = await cache_1.CacheManager.getInstance().getExtensions();
        ecosystemInstalled = extensions.has("ecosystem");
    }
    catch (_b) {
        ecosystemInstalled = false;
    }
    let provider = null;
    let catalogue = null;
    let exchangeError = null;
    if (currencies.length) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading the exchange's network catalogue");
        try {
            const ExchangeManager = require("@b/utils/exchange").default;
            const exchange = await ExchangeManager.startExchange();
            provider = exchange ? await ExchangeManager.getProvider() : null;
            if (exchange) {
                const fetched = await exchange.fetchCurrencies();
                catalogue = fetched && typeof fetched === "object" ? fetched : {};
            }
            else {
                exchangeError = "the exchange is not available (banned, or no active provider)";
            }
        }
        catch (error) {
            exchangeError = String((error === null || error === void 0 ? void 0 : error.message) || error);
            console_1.logger.warn("POOL_BACKING", `Exchange catalogue unavailable for the treasury card: ${exchangeError}`);
        }
    }
    const rows = holdings.map((holding) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const anchor = (_a = anchorBy.get(holding.currency)) !== null && _a !== void 0 ? _a : null;
        const networkMap = parseJson(anchor === null || anchor === void 0 ? void 0 : anchor.networkMap);
        const listed = catalogue ? !!catalogue[holding.currency] : null;
        const networks = catalogue ? (0, networks_1.normaliseExchangeNetworks)(catalogue[holding.currency]) : {};
        const chains = {};
        for (const [chain, entry] of Object.entries(holding.chains)) {
            const { networkId, source } = (0, networks_1.resolveNetworkId)({ provider: provider !== null && provider !== void 0 ? provider : "", chain, networkMap, networks });
            const network = networkId ? ((_b = networks[networkId]) !== null && _b !== void 0 ? _b : null) : null;
            const contractType = (_c = contractTypeBy.get(`${holding.currency}|${chain.toUpperCase()}`)) !== null && _c !== void 0 ? _c : null;
            const kind = (0, networks_1.tokenKindFor)(chain, contractType !== null && contractType !== void 0 ? contractType : "");
            const problems = [];
            if (!networkId) {
                problems.push(`no exchange network is mapped for ${chain}${provider ? ` on ${provider}` : ""}; set it in the currency's network map`);
            }
            else if (!catalogue) {
                problems.push(`${networkId} could not be verified: the exchange catalogue is unavailable`);
            }
            else if (!network) {
                problems.push(`the exchange lists no network ${networkId} for ${holding.currency}`);
            }
            const ecoToExchange = network
                ? (0, networks_1.checkLeg)({ direction: "eco_to_exchange", network, amount: (_d = network.depositMin) !== null && _d !== void 0 ? _d : PROBE_AMOUNT, needsTag: false, chainHasMemo: (0, networks_1.chainHasMemo)(chain) })
                : null;
            const exchangeToEco = network
                ? (0, networks_1.checkLeg)({ direction: "exchange_to_eco", network, amount: (_e = network.withdrawMin) !== null && _e !== void 0 ? _e : PROBE_AMOUNT, needsTag: false, chainHasMemo: (0, networks_1.chainHasMemo)(chain) })
                : null;
            if (ecoToExchange && !ecoToExchange.ok)
                problems.push(ecoToExchange.reason);
            if (exchangeToEco && !exchangeToEco.ok)
                problems.push(exchangeToEco.reason);
            if (kind === "unsupported") {
                problems.push(`no platform signer for ${holding.currency} on ${chain}${contractType ? ` (${contractType})` : ""}: settlements move EVM tokens, pooled UTXO coins, native EVM coins, SOL/SPL, TRX/TRC20, TON and XMR only; the engine can receive on this chain but not send from it`);
            }
            chains[chain] = {
                address: entry.address,
                balance: entry.balance,
                networkId,
                networkSource: source,
                kind,
                contractType,
                network: network
                    ? {
                        active: (_f = network.active) !== null && _f !== void 0 ? _f : null,
                        deposit: (_g = network.deposit) !== null && _g !== void 0 ? _g : null,
                        withdraw: (_h = network.withdraw) !== null && _h !== void 0 ? _h : null,
                        fee: (_j = network.fee) !== null && _j !== void 0 ? _j : null,
                        withdrawMin: (_k = network.withdrawMin) !== null && _k !== void 0 ? _k : null,
                        withdrawMax: (_l = network.withdrawMax) !== null && _l !== void 0 ? _l : null,
                        name: (_m = network.name) !== null && _m !== void 0 ? _m : null,
                    }
                    : null,
                canSend: kind !== "unsupported" && (ecoToExchange === null || ecoToExchange === void 0 ? void 0 : ecoToExchange.ok) === true,
                canReceive: (exchangeToEco === null || exchangeToEco === void 0 ? void 0 : exchangeToEco.ok) === true,
                problems,
            };
        }
        const mapOnly = [];
        for (const [chain, networkId] of Object.entries(networkMap !== null && networkMap !== void 0 ? networkMap : {})) {
            if (hasChain(holding.chains, chain))
                continue;
            mapOnly.push({
                chain,
                networkId: String(networkId),
                problem: "the treasury has no address on this chain; the token is not enabled there",
            });
        }
        return {
            currency: holding.currency,
            walletId: holding.walletId,
            balance: holding.balance,
            listedOnExchange: listed,
            networkMap,
            chains,
            mapOnly,
        };
    });
    const { masterReserve } = await (0, settings_1.getPoolBackingSettings)({ fresh: true });
    const unknownChains = Object.keys(masterReserve).filter((chain) => !(0, networks_1.isKnownEcosystemChain)(chain)).sort();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Treasury: ${rows.length} currencies${provider ? ` checked against ${provider}` : ""}`);
    return {
        user: {
            id: treasury_1.POOL_BACKING_TREASURY_USER_ID,
            email: treasury_1.POOL_BACKING_TREASURY_EMAIL,
            exists: !!treasuryUser,
        },
        ecosystemInstalled,
        exchange: { provider, reachable: !!catalogue, error: exchangeError },
        currencies: rows,
        masterReserve: { entries: masterReserve, unknownChains },
    };
};
function hasChain(chains, chain) {
    const wanted = String(chain).toUpperCase();
    return Object.keys(chains).some((k) => k.toUpperCase() === wanted);
}
function parseJson(value) {
    if (value == null)
        return null;
    let v = value;
    for (let pass = 0; pass < 2 && typeof v === "string"; pass++) {
        try {
            v = JSON.parse(v);
        }
        catch (_a) {
            return null;
        }
    }
    return v && typeof v === "object" ? v : null;
}
