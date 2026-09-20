"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const cache_1 = require("@b/utils/cache");
const redis_1 = require("@b/utils/redis");
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Search tokens across every feature that offers them",
    description: "Resolves a token symbol and reports every enabled feature that offers it — spot, futures, ecosystem, binary, forex, staking, token offerings, P2P, copy trading, bots, investment plans and DEX. With no query it returns the discovery panel: quick links and the markets an admin has flagged trending.",
    operationId: "getPlatformSearch",
    tags: ["Search"],
    parameters: [
        {
            name: "q",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "What the visitor typed. `BTC`, `btc/usdt` and `BTC-USDT` all resolve to the same token; a quote currency, when given, only narrows the market rows.",
        },
    ],
    requiresAuth: false,
    responses: {
        200: {
            description: "Search results, or the discovery panel when `q` is empty",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            query: { type: "string" },
                            base: { type: "string", nullable: true },
                            quote: { type: "string", nullable: true },
                            token: { type: "object", nullable: true },
                            groups: { type: "array" },
                            functions: { type: "array" },
                            trending: { type: "object" },
                        },
                    },
                },
            },
        },
        500: query_1.serverErrorResponse,
    },
};
const EXT = {
    copyTrading: "copy_trading",
    dex: "dex",
    ecosystem: "ecosystem",
    forex: "forex",
    forexTrading: "forex_trading",
    futures: "futures",
    ico: "ico",
    p2p: "p2p",
    staking: "staking",
    tradingBot: "trading_bot",
};
const QUOTES = ["USDT", "USDC", "BTC", "ETH", "BNB", "BUSD", "TRY", "EUR", "USD", "DAI", "TUSD"];
function parseQuery(raw) {
    const cleaned = String(raw || "")
        .toUpperCase()
        .replace(/[^A-Z0-9/\-_ ]/g, "")
        .trim();
    if (!cleaned)
        return { base: "", quote: null };
    const parts = cleaned.split(/[/\-_ ]+/).filter(Boolean);
    if (parts.length >= 2) {
        return { base: parts[0], quote: parts[1] };
    }
    const single = parts[0];
    for (const q of QUOTES) {
        if (single.length > q.length && single.endsWith(q)) {
            return { base: single.slice(0, -q.length), quote: q };
        }
    }
    return { base: single, quote: null };
}
async function safeRows(feature, run) {
    var _a;
    try {
        return (_a = (await run())) !== null && _a !== void 0 ? _a : [];
    }
    catch (error) {
        (0, console_1.logError)("SEARCH", `${feature} lookup failed`, error);
        return [];
    }
}
async function safeCount(feature, run) {
    var _a;
    try {
        return (_a = (await run())) !== null && _a !== void 0 ? _a : 0;
    }
    catch (error) {
        (0, console_1.logError)("SEARCH", `${feature} count failed`, error);
        return 0;
    }
}
async function readTickers() {
    try {
        const raw = await redis_1.RedisSingleton.getInstance().get("exchange:tickers");
        return raw ? JSON.parse(raw) : {};
    }
    catch (_a) {
        return {};
    }
}
function quoteOf(tickers, currency, pair) {
    const t = tickers[`${currency}/${pair}`];
    return {
        price: typeof (t === null || t === void 0 ? void 0 : t.last) === "number" ? t.last : null,
        change: typeof (t === null || t === void 0 ? void 0 : t.change) === "number" ? t.change : null,
    };
}
function tradeHref(currency, pair, type) {
    const symbol = `${currency}-${pair}`;
    return type ? `/trade?symbol=${symbol}&type=${type}` : `/trade?symbol=${symbol}`;
}
function marketWhere(base, quote, extra = {}) {
    const where = { ...extra, currency: { [sequelize_1.Op.like]: `${base}%` } };
    if (quote)
        where.pair = quote;
    return where;
}
const MARKET_LIMIT = 6;
const ROW_LIMIT = 5;
function buildFunctions(has, spotEnabled, binaryEnabled) {
    const out = [];
    if (spotEnabled)
        out.push({ id: "spot", label: "Spot", href: "/market" });
    if (has(EXT.futures))
        out.push({ id: "futures", label: "Futures", href: "/futures" });
    if (binaryEnabled)
        out.push({ id: "binary", label: "Binary", href: "/binary" });
    if (has(EXT.staking))
        out.push({ id: "staking", label: "Staking", href: "/staking" });
    if (has(EXT.p2p))
        out.push({ id: "p2p", label: "P2P", href: "/p2p" });
    if (has(EXT.ico))
        out.push({ id: "ico", label: "Token Sales", href: "/ico" });
    if (has(EXT.copyTrading))
        out.push({ id: "copyTrading", label: "Copy Trading", href: "/copy-trading" });
    if (has(EXT.tradingBot))
        out.push({ id: "tradingBot", label: "Trading Bots", href: "/trading-bot" });
    if (has(EXT.dex))
        out.push({ id: "dex", label: "Swap", href: "/dex" });
    out.push({ id: "wallet", label: "Wallet", href: "/finance/wallet" });
    return out;
}
async function trendingMarkets(feature, model, tickers, type) {
    const pick = async (where) => safeRows(feature, () => model.findAll({
        where,
        attributes: ["currency", "pair", "isTrending", "isHot"],
        limit: MARKET_LIMIT,
        order: [["currency", "ASC"]],
        raw: true,
    }));
    let rows = await pick({ status: true, [sequelize_1.Op.or]: [{ isTrending: true }, { isHot: true }] });
    if (!rows.length)
        rows = await pick({ status: true });
    return rows.slice(0, ROW_LIMIT).map((m) => ({
        symbol: `${m.currency}/${m.pair}`,
        currency: m.currency,
        pair: m.pair,
        hot: !!m.isHot,
        href: tradeHref(m.currency, m.pair, type),
        ...quoteOf(tickers, m.currency, m.pair),
    }));
}
exports.default = async (data) => {
    const { query } = data;
    const raw = typeof (query === null || query === void 0 ? void 0 : query.q) === "string" ? query.q : "";
    const { base, quote } = parseQuery(raw);
    const cacheManager = cache_1.CacheManager.getInstance();
    const extensions = await cacheManager.getExtensions();
    const extensionNames = new Set(Array.from(extensions.keys()));
    const has = (name) => extensionNames.has(name);
    const spotEnabled = await cacheManager.getSettingBool("spotWallets", true);
    const binaryStatusRaw = await cacheManager.getSetting("binaryStatus");
    const binaryEnabled = binaryStatusRaw === true || binaryStatusRaw === "true";
    const tickers = await readTickers();
    if (!base) {
        const [spot, futures] = await Promise.all([
            spotEnabled
                ? trendingMarkets("trending:spot", db_1.models.exchangeMarket, tickers)
                : Promise.resolve([]),
            has(EXT.futures)
                ? trendingMarkets("trending:futures", db_1.models.futuresMarket, tickers, "futures")
                : Promise.resolve([]),
        ]);
        return {
            query: raw,
            base: null,
            quote: null,
            token: null,
            groups: [],
            functions: buildFunctions(has, spotEnabled, binaryEnabled),
            trending: { spot, futures },
        };
    }
    const groups = [];
    const push = (id, label, href, count, items) => {
        if (count > 0 || items.length > 0)
            groups.push({ id, label, href, count, items });
    };
    const [tokenRow, spotRows, futuresRows, ecoRows, binaryRows, fxRows, stakingRows, icoRows, p2pBuy, p2pSell, copyRows, botRows, planRows, dexRows,] = await Promise.all([
        safeRows("token", () => db_1.models.exchangeCurrency.findAll({
            where: { currency: base, status: true },
            attributes: ["currency", "name", "price"],
            limit: 1,
            raw: true,
        })),
        spotEnabled
            ? safeRows("spot", () => db_1.models.exchangeMarket.findAll({
                where: marketWhere(base, quote, { status: true }),
                attributes: ["currency", "pair"],
                limit: MARKET_LIMIT,
                raw: true,
            }))
            : Promise.resolve([]),
        has(EXT.futures)
            ? safeRows("futures", () => db_1.models.futuresMarket.findAll({
                where: marketWhere(base, quote, { status: true }),
                attributes: ["currency", "pair"],
                limit: MARKET_LIMIT,
                raw: true,
            }))
            : Promise.resolve([]),
        has(EXT.ecosystem)
            ? safeRows("ecosystem", () => db_1.models.ecosystemMarket.findAll({
                where: marketWhere(base, quote, { status: true }),
                attributes: ["currency", "pair"],
                limit: MARKET_LIMIT,
                raw: true,
            }))
            : Promise.resolve([]),
        binaryEnabled
            ? safeRows("binary", () => db_1.models.binaryMarket.findAll({
                where: marketWhere(base, quote, { status: true }),
                attributes: ["currency", "pair"],
                limit: MARKET_LIMIT,
                raw: true,
            }))
            : Promise.resolve([]),
        has(EXT.forexTrading)
            ? safeRows("forex-trading", () => db_1.models.fxInstrument.findAll({
                where: marketWhere(base, quote, { status: "ACTIVE" }),
                attributes: ["currency", "pair"],
                limit: MARKET_LIMIT,
                raw: true,
            }))
            : Promise.resolve([]),
        has(EXT.staking)
            ? safeRows("staking", () => db_1.models.stakingPool.findAll({
                where: { symbol: { [sequelize_1.Op.like]: `${base}%` }, status: "ACTIVE" },
                attributes: ["id", "name", "symbol", "apr", "lockPeriod"],
                limit: ROW_LIMIT,
                raw: true,
            }))
            : Promise.resolve([]),
        has(EXT.ico)
            ? safeRows("ico", () => db_1.models.icoTokenOffering.findAll({
                where: {
                    symbol: { [sequelize_1.Op.like]: `${base}%` },
                    status: { [sequelize_1.Op.in]: ["ACTIVE", "UPCOMING", "SUCCESS"] },
                },
                attributes: ["id", "name", "symbol", "status", "tokenPrice"],
                limit: ROW_LIMIT,
                raw: true,
            }))
            : Promise.resolve([]),
        has(EXT.p2p)
            ? safeCount("p2p:buy", () => db_1.models.p2pOffer.count({ where: { currency: base, type: "BUY", status: "ACTIVE" } }))
            : Promise.resolve(0),
        has(EXT.p2p)
            ? safeCount("p2p:sell", () => db_1.models.p2pOffer.count({ where: { currency: base, type: "SELL", status: "ACTIVE" } }))
            : Promise.resolve(0),
        has(EXT.copyTrading)
            ? safeRows("copy-trading", () => db_1.models.copyTradingLeaderMarket.findAll({
                where: { baseCurrency: { [sequelize_1.Op.like]: `${base}%` }, isActive: true },
                attributes: ["symbol", "marketType"],
                include: [
                    {
                        model: db_1.models.copyTradingLeader,
                        as: "leader",
                        attributes: ["id", "displayName", "status"],
                        where: { status: "ACTIVE" },
                        required: true,
                    },
                ],
                limit: ROW_LIMIT,
            }))
            : Promise.resolve([]),
        has(EXT.tradingBot)
            ? safeRows("trading-bot", () => db_1.models.tradingBotStrategy.findAll({
                where: {
                    status: "APPROVED",
                    visibility: "PUBLIC",
                    [sequelize_1.Op.and]: (0, sequelize_1.literal)(`JSON_SEARCH(recommendedSymbols, 'one', '%${base.replace(/[^A-Z0-9]/g, "")}%') IS NOT NULL`),
                },
                attributes: ["id", "name", "slug", "shortDescription"],
                limit: ROW_LIMIT,
                raw: true,
            }))
            : Promise.resolve([]),
        safeRows("investment", () => db_1.models.investmentPlan.findAll({
            where: { currency: base, status: true },
            attributes: ["id", "name", "title", "currency", "profitPercentage"],
            limit: ROW_LIMIT,
            raw: true,
        })),
        has(EXT.dex)
            ? safeRows("dex", () => db_1.models.dexToken.findAll({
                where: { symbol: { [sequelize_1.Op.like]: `${base}%` }, status: true },
                attributes: ["id", "symbol", "name", "chainId"],
                limit: ROW_LIMIT,
                raw: true,
            }))
            : Promise.resolve([]),
    ]);
    const marketItems = (rows, type) => rows.slice(0, ROW_LIMIT).map((m) => ({
        title: `${m.currency}/${m.pair}`,
        href: tradeHref(m.currency, m.pair, type),
        ...quoteOf(tickers, m.currency, m.pair),
    }));
    push("spot", "Spot", "/market", spotRows.length, marketItems(spotRows));
    push("futures", "Futures", "/futures", futuresRows.length, marketItems(futuresRows, "futures"));
    push("ecosystem", "Native Tokens", "/ecosystem", ecoRows.length, marketItems(ecoRows, "spot-eco"));
    push("binary", "Binary", "/binary", binaryRows.length, binaryRows.slice(0, ROW_LIMIT).map((m) => ({
        title: `${m.currency}/${m.pair}`,
        href: `/binary?symbol=${m.currency}-${m.pair}`,
        ...quoteOf(tickers, m.currency, m.pair),
    })));
    push("forexTrading", "Forex & Multi-Asset", "/forex-trading", fxRows.length, fxRows.slice(0, ROW_LIMIT).map((m) => ({
        title: `${m.currency}/${m.pair}`,
        href: `/forex-trading/trade?symbol=${m.currency}-${m.pair}`,
        price: null,
        change: null,
    })));
    push("staking", "Staking", "/staking", stakingRows.length, stakingRows.map((p) => ({
        title: p.name,
        subtitle: `${p.symbol} · ${p.lockPeriod}d`,
        badge: p.apr != null ? `${p.apr}% APR` : null,
        href: `/staking/pool/${p.id}`,
    })));
    push("ico", "Token Sales", "/ico", icoRows.length, icoRows.map((o) => ({
        title: o.name,
        subtitle: o.symbol,
        badge: o.status,
        href: `/ico/offer/${o.id}`,
    })));
    push("p2p", "P2P", "/p2p/market", p2pBuy + p2pSell, [
        p2pBuy ? { title: `Buy ${base}`, subtitle: `${p2pBuy} offer${p2pBuy === 1 ? "" : "s"}`, href: `/p2p/market?currency=${base}&type=SELL` } : null,
        p2pSell ? { title: `Sell ${base}`, subtitle: `${p2pSell} offer${p2pSell === 1 ? "" : "s"}`, href: `/p2p/market?currency=${base}&type=BUY` } : null,
    ].filter(Boolean));
    push("copyTrading", "Copy Trading", "/copy-trading", copyRows.length, copyRows.map((m) => {
        var _a;
        var _b, _c;
        const leader = (_b = m.leader) !== null && _b !== void 0 ? _b : (_a = m.get) === null || _a === void 0 ? void 0 : _a.call(m, "leader");
        return {
            title: (leader === null || leader === void 0 ? void 0 : leader.displayName) || m.symbol,
            subtitle: `${m.symbol} · ${m.marketType}`,
            href: `/copy-trading/leader/${(_c = leader === null || leader === void 0 ? void 0 : leader.id) !== null && _c !== void 0 ? _c : ""}`,
        };
    }));
    push("tradingBot", "Trading Bots", "/trading-bot", botRows.length, botRows.map((s) => ({
        title: s.name,
        subtitle: s.shortDescription || null,
        href: `/trading-bot/strategy/${s.slug || s.id}`,
    })));
    push("investment", "Earn", "/investment", planRows.length, planRows.map((p) => ({
        title: p.title || p.name,
        subtitle: p.currency,
        badge: p.profitPercentage != null ? `${p.profitPercentage}%` : null,
        href: `/investment/plan`,
    })));
    push("dex", "Swap", "/dex", dexRows.length, dexRows.map((t) => ({
        title: `${t.symbol}`,
        subtitle: t.name,
        href: `/dex/swap?token=${t.symbol}`,
    })));
    const known = groups.length > 0 || tokenRow.length > 0;
    if (known) {
        push("wallet", "Wallet", "/finance/wallet", 2, [
            { title: `Deposit ${base}`, href: `/finance/deposit` },
            { title: `Withdraw ${base}`, href: `/finance/withdraw` },
        ]);
    }
    return {
        query: raw,
        base,
        quote,
        token: tokenRow.length
            ? {
                symbol: tokenRow[0].currency,
                name: tokenRow[0].name,
                price: tokenRow[0].price != null ? Number(tokenRow[0].price) : null,
            }
            : null,
        groups,
        functions: [],
        trending: { spot: [], futures: [] },
    };
};
