"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_TRADE_LIMIT = exports.DEFAULT_TRADE_LIMIT = exports.MAX_BOOK_DEPTH = exports.DEFAULT_BOOK_DEPTH = exports.DOCUMENT_TTL = exports.ECO_TAPE_ROW_CAP = exports.VOLUME_WINDOW_MS = exports.PROVIDER_SNAPSHOT_TTL = void 0;
exports.cmcPair = cmcPair;
exports.parsePairParam = parsePairParam;
exports.num = num;
exports.loadMarkets = loadMarkets;
exports.ecosystemEnabled = ecosystemEnabled;
exports.__resetProviderRefresh = __resetProviderRefresh;
exports.normaliseWsTickers = normaliseWsTickers;
exports.normaliseCcxtTickers = normaliseCcxtTickers;
exports.readProviderTickers = readProviderTickers;
exports.readEcosystemTickers = readEcosystemTickers;
exports.summariseTape = summariseTape;
exports.readVolumes = readVolumes;
exports.buildSummary = buildSummary;
exports.buildTickers = buildTickers;
exports.__resetDocuments = __resetDocuments;
exports.getAggregatorDocuments = getAggregatorDocuments;
exports.buildAssets = buildAssets;
exports.readAssets = readAssets;
exports.resolveMarket = resolveMarket;
exports.clampDepth = clampDepth;
exports.readOrderbook = readOrderbook;
exports.sliceLevels = sliceLevels;
exports.clampTradeLimit = clampTradeLimit;
exports.buildTrades = buildTrades;
exports.tapeReadSize = tapeReadSize;
exports.readTrades = readTrades;
exports.buildPairs = buildPairs;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const redis_1 = require("@b/utils/redis");
const cache_1 = require("@b/utils/cache");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const console_1 = require("@b/utils/console");
const utils_1 = require("@b/api/exchange/utils");
const safe_imports_1 = require("@b/utils/safe-imports");
const redis = redis_1.RedisSingleton.getInstance();
function cmcPair(currency, pair) {
    return `${currency}_${pair}`;
}
function parsePairParam(raw) {
    if (typeof raw !== "string")
        return null;
    let decoded;
    try {
        decoded = decodeURIComponent(raw.trim());
    }
    catch (_a) {
        decoded = raw.trim();
    }
    const parts = decoded
        .toUpperCase()
        .replace(/[-/]/g, "_")
        .split("_")
        .filter((p) => p.length > 0);
    if (parts.length !== 2)
        return null;
    const valid = (s) => /^[A-Z0-9.]{1,20}$/.test(s);
    if (!valid(parts[0]) || !valid(parts[1]))
        return null;
    return { currency: parts[0], pair: parts[1] };
}
function num(value) {
    if (value === null || value === undefined || value === "")
        return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}
function positive(value) {
    const n = num(value);
    return n !== undefined && n > 0 ? n : undefined;
}
async function loadMarkets() {
    var _a;
    var _b;
    const out = [];
    const providerRows = (await db_1.models.exchangeMarket.findAll({
        where: { status: true },
        attributes: ["currency", "pair"],
        raw: true,
    }));
    for (const row of providerRows || []) {
        if (!(row === null || row === void 0 ? void 0 : row.currency) || !(row === null || row === void 0 ? void 0 : row.pair))
            continue;
        out.push({
            currency: row.currency,
            pair: row.pair,
            symbol: `${row.currency}/${row.pair}`,
            pairKey: cmcPair(row.currency, row.pair),
            venue: "PROVIDER",
        });
    }
    if (await ecosystemEnabled()) {
        try {
            const ecoRows = (await ((_a = db_1.models.ecosystemMarket) === null || _a === void 0 ? void 0 : _a.findAll({
                where: { status: true },
                attributes: ["currency", "pair"],
                raw: true,
            })));
            for (const row of ecoRows || []) {
                if (!(row === null || row === void 0 ? void 0 : row.currency) || !(row === null || row === void 0 ? void 0 : row.pair))
                    continue;
                out.push({
                    currency: row.currency,
                    pair: row.pair,
                    symbol: `${row.currency}/${row.pair}`,
                    pairKey: cmcPair(row.currency, row.pair),
                    venue: "ECO",
                });
            }
        }
        catch (error) {
            console_1.logger.warn("PUBLIC", `Aggregator could not list ecosystem markets: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error}`);
        }
    }
    return out;
}
async function ecosystemEnabled() {
    var _a;
    try {
        const extensions = await cache_1.CacheManager.getInstance().getExtensions();
        return Boolean((_a = extensions === null || extensions === void 0 ? void 0 : extensions.has) === null || _a === void 0 ? void 0 : _a.call(extensions, "ecosystem"));
    }
    catch (_b) {
        return false;
    }
}
const PROVIDER_SNAPSHOT_KEY = "public:aggregator:tickers";
const PROVIDER_COOLDOWN_KEY = "public:aggregator:tickers:cooldown";
exports.PROVIDER_SNAPSHOT_TTL = 30;
let providerRefreshInFlight = null;
function __resetProviderRefresh() {
    providerRefreshInFlight = null;
}
async function readJsonKey(key) {
    try {
        const raw = await redis.get(key);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
    }
    catch (_a) {
        return null;
    }
}
function normaliseWsTickers(raw) {
    const out = {};
    for (const [symbol, t] of Object.entries(raw || {})) {
        if (!t || typeof t !== "object")
            continue;
        out[symbol] = {
            last: positive(t.last),
            percentage: num(t.change),
        };
    }
    return out;
}
function normaliseCcxtTickers(raw) {
    var _a;
    const out = {};
    for (const [symbol, t] of Object.entries(raw || {})) {
        if (!t || typeof t !== "object")
            continue;
        const ticker = t;
        out[symbol] = {
            last: positive((_a = ticker.last) !== null && _a !== void 0 ? _a : ticker.close),
            bid: positive(ticker.bid),
            ask: positive(ticker.ask),
            high: positive(ticker.high),
            low: positive(ticker.low),
            percentage: num(ticker.percentage),
        };
    }
    return out;
}
async function readProviderTickers(symbols) {
    const snapshot = await readJsonKey(PROVIDER_SNAPSHOT_KEY);
    if (snapshot)
        return snapshot;
    const fresh = await refreshProviderTickers(symbols);
    if (fresh)
        return fresh;
    const ws = await readJsonKey("exchange:tickers");
    return ws ? normaliseWsTickers(ws) : {};
}
async function refreshProviderTickers(symbols) {
    if (!symbols.length)
        return {};
    if (providerRefreshInFlight)
        return providerRefreshInFlight;
    try {
        if (await redis.get(PROVIDER_COOLDOWN_KEY))
            return null;
    }
    catch (_a) {
    }
    providerRefreshInFlight = (async () => {
        var _a;
        try {
            await redis.set(PROVIDER_COOLDOWN_KEY, "1", "EX", exports.PROVIDER_SNAPSHOT_TTL);
            if (await (0, utils_1.handleBanStatus)(await (0, utils_1.loadBanStatus)()))
                return null;
            const exchange = await exchange_1.default.startExchange();
            if (!exchange || typeof exchange.fetchTickers !== "function")
                return null;
            const raw = await exchange.fetchTickers(symbols);
            if (!raw || typeof raw !== "object" || Array.isArray(raw))
                return null;
            const normalised = normaliseCcxtTickers(raw);
            await redis.set(PROVIDER_SNAPSHOT_KEY, JSON.stringify(normalised), "EX", exports.PROVIDER_SNAPSHOT_TTL);
            return normalised;
        }
        catch (error) {
            console_1.logger.warn("PUBLIC", `Aggregator ticker refresh failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
            return null;
        }
        finally {
            providerRefreshInFlight = null;
        }
    })();
    return providerRefreshInFlight;
}
async function readEcosystemTickers() {
    var _a, _b;
    var _c;
    try {
        const mod = await (0, safe_imports_1.getMatchingEngine)();
        if (!((_a = mod === null || mod === void 0 ? void 0 : mod.MatchingEngine) === null || _a === void 0 ? void 0 : _a.peekInstance))
            return {};
        const pending = mod.MatchingEngine.peekInstance();
        if (!pending)
            return {};
        const engine = await pending;
        const tickers = ((_b = engine === null || engine === void 0 ? void 0 : engine.getTickers) === null || _b === void 0 ? void 0 : _b.call(engine)) || {};
        const out = {};
        for (const [symbol, t] of Object.entries(tickers)) {
            if (!t || typeof t !== "object")
                continue;
            out[symbol] = {
                last: positive(t.last),
                high: positive(t.high),
                low: positive(t.low),
                percentage: num(t.percentage),
            };
        }
        return out;
    }
    catch (error) {
        console_1.logger.warn("PUBLIC", `Aggregator could not read ecosystem tickers: ${(_c = error === null || error === void 0 ? void 0 : error.message) !== null && _c !== void 0 ? _c : error}`);
        return {};
    }
}
exports.VOLUME_WINDOW_MS = 24 * 60 * 60 * 1000;
exports.ECO_TAPE_ROW_CAP = 5000;
function summariseTape(rows, nowMs, cap = exports.ECO_TAPE_ROW_CAP) {
    var _a;
    var _b;
    const windowStart = nowMs - exports.VOLUME_WINDOW_MS;
    const list = Array.isArray(rows) ? rows : [];
    if (list.length >= cap) {
        const oldest = num((_a = list[list.length - 1]) === null || _a === void 0 ? void 0 : _a.timestamp);
        if (oldest === undefined || oldest >= windowStart)
            return null;
    }
    let base = 0;
    let quote = 0;
    for (const row of list) {
        const ts = num(row === null || row === void 0 ? void 0 : row.timestamp);
        if (ts === undefined || ts < windowStart)
            continue;
        if (row === null || row === void 0 ? void 0 : row.isAiTrade)
            continue;
        if (String((_b = row === null || row === void 0 ? void 0 : row.side) !== null && _b !== void 0 ? _b : "").toUpperCase() !== "BUY")
            continue;
        const amount = num(row === null || row === void 0 ? void 0 : row.amount);
        const price = num(row === null || row === void 0 ? void 0 : row.price);
        if (amount === undefined || price === undefined || amount <= 0 || price <= 0) {
            continue;
        }
        base += amount;
        quote += amount * price;
    }
    return { base, quote };
}
async function readEcosystemVolumes(markets, nowMs) {
    var _a;
    const out = new Map();
    const eco = markets.filter((m) => m.venue === "ECO");
    if (!eco.length)
        return out;
    const utils = await (0, safe_imports_1.getEcosystemScyllaUtils)();
    if (!(utils === null || utils === void 0 ? void 0 : utils.getRecentTrades))
        return out;
    for (const market of eco) {
        try {
            const rows = await utils.getRecentTrades(market.symbol, exports.ECO_TAPE_ROW_CAP);
            const volume = summariseTape(rows || [], nowMs);
            if (volume)
                out.set(market.symbol, volume);
        }
        catch (error) {
            console_1.logger.warn("PUBLIC", `Aggregator could not read the ${market.symbol} tape: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        }
    }
    return out;
}
const PROVIDER_VOLUME_KEY = "public:aggregator:provider-volume";
const PROVIDER_VOLUME_TTL = 300;
async function readProviderVolumes(markets, nowMs) {
    var _a, _b, _c;
    const out = new Map();
    if (!markets.some((m) => m.venue === "PROVIDER"))
        return out;
    const cached = await readJsonKey(PROVIDER_VOLUME_KEY);
    if (cached) {
        for (const [symbol, volume] of Object.entries(cached)) {
            const base = num(volume === null || volume === void 0 ? void 0 : volume.base);
            const quote = num(volume === null || volume === void 0 ? void 0 : volume.quote);
            if (base === undefined || quote === undefined)
                continue;
            out.set(symbol, { base, quote });
        }
        return out;
    }
    try {
        const rows = (await db_1.models.exchangeOrder.findAll({
            attributes: [
                "symbol",
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("filled")), "baseVolume"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("cost")), "quoteVolume"],
            ],
            where: {
                createdAt: { [sequelize_1.Op.gte]: new Date(nowMs - exports.VOLUME_WINDOW_MS) },
                filled: { [sequelize_1.Op.gt]: 0 },
            },
            group: ["symbol"],
            raw: true,
        }));
        for (const row of rows || []) {
            const symbol = row === null || row === void 0 ? void 0 : row.symbol;
            if (!symbol)
                continue;
            const base = (_a = num(row.baseVolume)) !== null && _a !== void 0 ? _a : 0;
            const quote = (_b = num(row.quoteVolume)) !== null && _b !== void 0 ? _b : 0;
            out.set(symbol, { base, quote });
        }
        try {
            await redis.set(PROVIDER_VOLUME_KEY, JSON.stringify(Object.fromEntries(out)), "EX", PROVIDER_VOLUME_TTL);
        }
        catch (_d) {
        }
    }
    catch (error) {
        console_1.logger.warn("PUBLIC", `Aggregator could not total provider volume: ${(_c = error === null || error === void 0 ? void 0 : error.message) !== null && _c !== void 0 ? _c : error}`);
    }
    return out;
}
async function readVolumes(markets, nowMs = Date.now()) {
    const [provider, eco] = await Promise.all([
        readProviderVolumes(markets, nowMs),
        readEcosystemVolumes(markets, nowMs),
    ]);
    for (const [symbol, volume] of eco)
        provider.set(symbol, volume);
    return provider;
}
function compact(entry) {
    for (const key of Object.keys(entry)) {
        if (entry[key] === undefined)
            delete entry[key];
    }
    return entry;
}
function buildSummary(markets, tickers, volumes) {
    const out = [];
    for (const market of markets) {
        const ticker = tickers[market.symbol];
        const last = positive(ticker === null || ticker === void 0 ? void 0 : ticker.last);
        if (last === undefined)
            continue;
        const volume = volumes.get(market.symbol);
        out.push(compact({
            trading_pairs: market.pairKey,
            base_currency: market.currency,
            quote_currency: market.pair,
            last_price: last,
            lowest_ask: ticker === null || ticker === void 0 ? void 0 : ticker.ask,
            highest_bid: ticker === null || ticker === void 0 ? void 0 : ticker.bid,
            base_volume: volume === null || volume === void 0 ? void 0 : volume.base,
            quote_volume: volume === null || volume === void 0 ? void 0 : volume.quote,
            price_change_percent_24h: ticker === null || ticker === void 0 ? void 0 : ticker.percentage,
            highest_price_24h: ticker === null || ticker === void 0 ? void 0 : ticker.high,
            lowest_price_24h: ticker === null || ticker === void 0 ? void 0 : ticker.low,
        }));
    }
    return out;
}
function buildTickers(markets, tickers, volumes) {
    const out = {};
    for (const market of markets) {
        const ticker = tickers[market.symbol];
        const last = positive(ticker === null || ticker === void 0 ? void 0 : ticker.last);
        if (last === undefined)
            continue;
        const volume = volumes.get(market.symbol);
        out[market.pairKey] = compact({
            base_id: market.currency,
            quote_id: market.pair,
            last_price: last,
            base_volume: volume === null || volume === void 0 ? void 0 : volume.base,
            quote_volume: volume === null || volume === void 0 ? void 0 : volume.quote,
            isFrozen: 0,
        });
    }
    return out;
}
const DOCUMENT_KEY = "public:aggregator:documents";
exports.DOCUMENT_TTL = 60;
let documentsInFlight = null;
function __resetDocuments() {
    documentsInFlight = null;
}
async function getAggregatorDocuments() {
    const cached = await readJsonKey(DOCUMENT_KEY);
    if (cached && Array.isArray(cached.summary) && cached.tickers) {
        return cached;
    }
    if (documentsInFlight)
        return documentsInFlight;
    documentsInFlight = (async () => {
        var _a;
        try {
            const markets = await loadMarkets();
            const providerSymbols = markets
                .filter((m) => m.venue === "PROVIDER")
                .map((m) => m.symbol);
            const [providerTickers, ecoTickers] = await Promise.all([
                providerSymbols.length
                    ? readProviderTickers(providerSymbols)
                    : Promise.resolve({}),
                markets.some((m) => m.venue === "ECO")
                    ? readEcosystemTickers()
                    : Promise.resolve({}),
            ]);
            const tickers = {
                ...providerTickers,
                ...ecoTickers,
            };
            const volumes = await readVolumes(markets);
            const documents = {
                summary: buildSummary(markets, tickers, volumes),
                tickers: buildTickers(markets, tickers, volumes),
            };
            try {
                await redis.set(DOCUMENT_KEY, JSON.stringify(documents), "EX", exports.DOCUMENT_TTL);
            }
            catch (_b) {
            }
            return documents;
        }
        catch (error) {
            console_1.logger.error("PUBLIC", `Aggregator documents could not be built: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
            return { summary: [], tickers: {} };
        }
        finally {
            documentsInFlight = null;
        }
    })();
    return documentsInFlight;
}
function readJsonColumn(value) {
    let current = value;
    for (let i = 0; i < 2; i += 1) {
        if (typeof current !== "string")
            break;
        try {
            current = JSON.parse(current);
        }
        catch (_a) {
            return null;
        }
    }
    return current && typeof current === "object" ? current : null;
}
function buildAssets(providerCurrencies, ecosystemTokens) {
    var _a;
    var _b, _c, _d;
    const out = {};
    const widen = (symbol, name, active, minWithdraw, maxWithdraw) => {
        const existing = out[symbol];
        if (!existing) {
            out[symbol] = compact({
                name: name || symbol,
                can_withdraw: active,
                can_deposit: active,
                min_withdraw: minWithdraw,
                max_withdraw: maxWithdraw,
            });
            return;
        }
        existing.can_withdraw = existing.can_withdraw || active;
        existing.can_deposit = existing.can_deposit || active;
        if (minWithdraw !== undefined) {
            existing.min_withdraw =
                existing.min_withdraw === undefined
                    ? minWithdraw
                    : Math.min(existing.min_withdraw, minWithdraw);
        }
        if (maxWithdraw !== undefined) {
            existing.max_withdraw =
                existing.max_withdraw === undefined
                    ? maxWithdraw
                    : Math.max(existing.max_withdraw, maxWithdraw);
        }
    };
    for (const row of providerCurrencies || []) {
        const symbol = typeof (row === null || row === void 0 ? void 0 : row.currency) === "string" ? row.currency : "";
        if (!symbol)
            continue;
        widen(symbol, String((_b = row === null || row === void 0 ? void 0 : row.name) !== null && _b !== void 0 ? _b : symbol), Boolean(row === null || row === void 0 ? void 0 : row.status));
    }
    for (const row of ecosystemTokens || []) {
        const symbol = typeof (row === null || row === void 0 ? void 0 : row.currency) === "string" ? row.currency : "";
        if (!symbol)
            continue;
        const limits = (_c = (_a = readJsonColumn(row === null || row === void 0 ? void 0 : row.limits)) === null || _a === void 0 ? void 0 : _a.withdrawal) !== null && _c !== void 0 ? _c : {};
        widen(symbol, String((_d = row === null || row === void 0 ? void 0 : row.name) !== null && _d !== void 0 ? _d : symbol), Boolean(row === null || row === void 0 ? void 0 : row.status), positive(limits === null || limits === void 0 ? void 0 : limits.min), positive(limits === null || limits === void 0 ? void 0 : limits.max));
    }
    return out;
}
async function readAssets() {
    var _a;
    var _b;
    const providerCurrencies = (await db_1.models.exchangeCurrency.findAll({
        attributes: ["currency", "name", "status"],
        raw: true,
    }));
    let ecosystemTokens = [];
    if (await ecosystemEnabled()) {
        try {
            ecosystemTokens =
                (await ((_a = db_1.models.ecosystemToken) === null || _a === void 0 ? void 0 : _a.findAll({
                    attributes: ["currency", "name", "status", "limits"],
                }))) || [];
        }
        catch (error) {
            console_1.logger.warn("PUBLIC", `Aggregator could not list ecosystem tokens: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error}`);
        }
    }
    return buildAssets(providerCurrencies || [], ecosystemTokens);
}
async function resolveMarket(raw) {
    const parsed = parsePairParam(raw);
    if (!parsed)
        return null;
    const markets = await loadMarkets();
    return (markets.find((m) => m.currency === parsed.currency && m.pair === parsed.pair) || null);
}
exports.DEFAULT_BOOK_DEPTH = 100;
exports.MAX_BOOK_DEPTH = 500;
const BOOK_SNAPSHOT_TTL = 3;
function clampDepth(raw) {
    const requested = raw === undefined || raw === null || raw === "" ? NaN : Number(raw);
    if (!Number.isFinite(requested) || requested < 1)
        return exports.DEFAULT_BOOK_DEPTH;
    return Math.min(exports.MAX_BOOK_DEPTH, Math.floor(requested));
}
async function readOrderbook(market, depth) {
    var _a;
    if (market.venue === "ECO") {
        const utils = await (0, safe_imports_1.getEcosystemScyllaUtils)();
        if (!(utils === null || utils === void 0 ? void 0 : utils.getRealOrderBook))
            return null;
        const book = await utils.getRealOrderBook(market.symbol, { levels: depth });
        return {
            timestamp: Date.now(),
            bids: sliceLevels(book === null || book === void 0 ? void 0 : book.bids, depth),
            asks: sliceLevels(book === null || book === void 0 ? void 0 : book.asks, depth),
        };
    }
    const cacheKey = `public:aggregator:book:${market.symbol}:${depth}`;
    const cached = await readJsonKey(cacheKey);
    if (cached && Array.isArray(cached.bids) && Array.isArray(cached.asks)) {
        return cached;
    }
    if (await (0, utils_1.handleBanStatus)(await (0, utils_1.loadBanStatus)()))
        return null;
    const exchange = await exchange_1.default.startExchange();
    if (!exchange || typeof exchange.fetchOrderBook !== "function")
        return null;
    const book = await exchange.fetchOrderBook(market.symbol, depth);
    const document = {
        timestamp: (_a = num(book === null || book === void 0 ? void 0 : book.timestamp)) !== null && _a !== void 0 ? _a : Date.now(),
        bids: sliceLevels(book === null || book === void 0 ? void 0 : book.bids, depth),
        asks: sliceLevels(book === null || book === void 0 ? void 0 : book.asks, depth),
    };
    try {
        await redis.set(cacheKey, JSON.stringify(document), "EX", BOOK_SNAPSHOT_TTL);
    }
    catch (_b) {
    }
    return document;
}
function sliceLevels(levels, depth) {
    if (!Array.isArray(levels))
        return [];
    const out = [];
    for (const level of levels) {
        if (out.length >= depth)
            break;
        const price = num(Array.isArray(level) ? level[0] : undefined);
        const amount = num(Array.isArray(level) ? level[1] : undefined);
        if (price === undefined || amount === undefined)
            continue;
        if (price <= 0 || amount <= 0)
            continue;
        out.push([price, amount]);
    }
    return out;
}
exports.DEFAULT_TRADE_LIMIT = 100;
exports.MAX_TRADE_LIMIT = 500;
function clampTradeLimit(raw) {
    const requested = raw === undefined || raw === null || raw === "" ? NaN : Number(raw);
    if (!Number.isFinite(requested) || requested < 1)
        return exports.DEFAULT_TRADE_LIMIT;
    return Math.min(exports.MAX_TRADE_LIMIT, Math.floor(requested));
}
function buildTrades(rows, limit) {
    var _a, _b;
    const out = [];
    for (const row of Array.isArray(rows) ? rows : []) {
        if (out.length >= limit)
            break;
        if (row === null || row === void 0 ? void 0 : row.isAiTrade)
            continue;
        if (String((_a = row === null || row === void 0 ? void 0 : row.side) !== null && _a !== void 0 ? _a : "").toUpperCase() !== "BUY")
            continue;
        const price = num(row === null || row === void 0 ? void 0 : row.price);
        const amount = num(row === null || row === void 0 ? void 0 : row.amount);
        const timestamp = num(row === null || row === void 0 ? void 0 : row.timestamp);
        if (price === undefined || amount === undefined || timestamp === undefined) {
            continue;
        }
        if (price <= 0 || amount <= 0)
            continue;
        out.push({
            trade_id: String((_b = row === null || row === void 0 ? void 0 : row.id) !== null && _b !== void 0 ? _b : `${timestamp}`),
            price,
            base_volume: amount,
            quote_volume: amount * price,
            timestamp,
        });
    }
    return out;
}
function tapeReadSize(limit) {
    return Math.min(exports.MAX_TRADE_LIMIT * 4, Math.max(limit * 4, 100));
}
async function readTrades(market, limit) {
    if (market.venue !== "ECO")
        return null;
    const utils = await (0, safe_imports_1.getEcosystemScyllaUtils)();
    if (!(utils === null || utils === void 0 ? void 0 : utils.getRecentTrades))
        return null;
    const rows = await utils.getRecentTrades(market.symbol, tapeReadSize(limit));
    return buildTrades(rows || [], limit);
}
function buildPairs(markets) {
    return markets.map((market) => ({
        ticker_id: market.pairKey,
        base: market.currency,
        target: market.pair,
    }));
}
