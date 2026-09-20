"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CUSTODY_READ_RATES = void 0;
exports.chainFamily = chainFamily;
exports.scannerRates = scannerRates;
exports.createScannerRateLimiter = createScannerRateLimiter;
exports.readNeedsRpc = readNeedsRpc;
exports.collectCustodyInventory = collectCustodyInventory;
exports.enumerateCustodyAddresses = enumerateCustodyAddresses;
exports.resolveReadKind = resolveReadKind;
exports.unitsFromRaw = unitsFromRaw;
exports.readAddressBalance = readAddressBalance;
exports.orderForRotation = orderForRotation;
exports.refreshCustodyReads = refreshCustodyReads;
exports.computeEcosystemSide = computeEcosystemSide;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
let RateLimiter_1;
try {
    RateLimiter_1 = require("@b/api/(ext)/ecosystem/deposit/util/RateLimiter");
}
catch (_a) {
    RateLimiter_1 = {
        SCAN_RATES: {},
        scanRatesFrom: function () { return {}; },
        getScannerRateLimiter: function () {
            throw new Error("ecosystem addon not installed");
        },
    };
}
const networks_1 = require("./networks");
const treasury_1 = require("./treasury");
function chainFamily(chain) {
    const c = String(chain !== null && chain !== void 0 ? chain : "").toUpperCase();
    if ((0, networks_1.isUtxoChain)(c))
        return "utxo";
    if (c === "SOL")
        return "sol";
    if (c === "TRON")
        return "tron";
    if (c === "TON")
        return "ton";
    if (c === "XMR")
        return "xmr";
    return "evm";
}
exports.CUSTODY_READ_RATES = RateLimiter_1.SCAN_RATES;
function scannerRates(env = process.env) {
    return (0, RateLimiter_1.scanRatesFrom)(env);
}
function createScannerRateLimiter() {
    return (0, RateLimiter_1.getScannerRateLimiter)();
}
function readNeedsRpc(chain, kind) {
    if (kind !== "customer")
        return true;
    const family = chainFamily(chain);
    return family !== "utxo" && family !== "xmr";
}
const WALLET_PAGE = 500;
const KIND_RANK = { treasury: 0, master: 1, custodial: 2, customer: 3 };
async function collectCustodyInventory(currency, options = {}) {
    var _a, _b, _c;
    const inventory = {
        currency,
        addresses: new Map(),
        le: new Map(),
        leUnattributed: 0,
        wallets: 0,
    };
    const seen = new Map();
    const originalChainKey = new Map();
    const put = (chain, entry) => {
        const key = chain.toUpperCase();
        let byAddress = seen.get(key);
        if (!byAddress) {
            byAddress = new Map();
            seen.set(key, byAddress);
        }
        const existing = byAddress.get(entry.address);
        if (!existing || KIND_RANK[entry.kind] < KIND_RANK[existing.kind])
            byAddress.set(entry.address, entry);
    };
    const leFor = (key) => {
        let row = inventory.le.get(key);
        if (!row) {
            row = { le: 0, leTreasury: 0, mirror: null };
            inventory.le.set(key, row);
        }
        return row;
    };
    for (const chain of (_a = options.chains) !== null && _a !== void 0 ? _a : []) {
        const key = String(chain).toUpperCase();
        if (!originalChainKey.has(key))
            originalChainKey.set(key, String(chain));
        leFor(key);
    }
    let lastId = "";
    for (;;) {
        const rows = (await db_1.sequelize.query(`SELECT id, userId, balance, inOrder, address
         FROM wallet
        WHERE type = 'ECO'
          AND currency = :currency
          AND deletedAt IS NULL
          AND id > :lastId
        ORDER BY id ASC
        LIMIT :limit`, { type: sequelize_1.QueryTypes.SELECT, replacements: { currency, lastId, limit: WALLET_PAGE } }));
        if (!rows.length)
            break;
        for (const w of rows) {
            inventory.wallets += 1;
            const isTreasury = String(w.userId) === treasury_1.POOL_BACKING_TREASURY_USER_ID;
            const held = (Number(w.balance) || 0) + (Number(w.inOrder) || 0);
            const map = (_b = (0, treasury_1.parseAddressMap)(w.address)) !== null && _b !== void 0 ? _b : {};
            let attributed = 0;
            for (const [chainKey, entry] of Object.entries(map)) {
                if (!entry || typeof entry !== "object")
                    continue;
                const key = chainKey.toUpperCase();
                if (!originalChainKey.has(key))
                    originalChainKey.set(key, chainKey);
                const mapBalance = Number(entry.balance);
                const balance = Number.isFinite(mapBalance) ? mapBalance : 0;
                attributed += balance;
                const le = leFor(key);
                if (isTreasury)
                    le.leTreasury += balance;
                else
                    le.le += balance;
                const address = entry.address ? String(entry.address) : "";
                if (!address)
                    continue;
                put(key, {
                    address,
                    walletId: String(w.id),
                    kind: isTreasury ? "treasury" : "customer",
                    mirrorBalance: Number.isFinite(mapBalance) ? mapBalance : null,
                });
            }
            if (!isTreasury)
                inventory.leUnattributed += held - attributed;
        }
        lastId = String(rows[rows.length - 1].id);
        if (rows.length < WALLET_PAGE)
            break;
    }
    const chains = [...originalChainKey.values()];
    if (chains.length) {
        try {
            const masters = (await db_1.models.ecosystemMasterWallet.findAll({
                where: { chain: chains },
                attributes: ["id", "chain", "currency", "address"],
                raw: true,
            }));
            for (const m of masters) {
                if (!(m === null || m === void 0 ? void 0 : m.address))
                    continue;
                put(String(m.chain), { address: String(m.address), walletId: null, kind: "master", mirrorBalance: null });
            }
        }
        catch (error) {
            console_1.logger.warn("POOL_BACKING", `Master wallets for ${currency} not read: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
        try {
            const custodials = (await db_1.models.ecosystemCustodialWallet.findAll({
                where: { chain: chains, status: "ACTIVE" },
                attributes: ["id", "chain", "address"],
                raw: true,
            }));
            for (const c of custodials) {
                if (!(c === null || c === void 0 ? void 0 : c.address))
                    continue;
                put(String(c.chain), { address: String(c.address), walletId: null, kind: "custodial", mirrorBalance: null });
            }
        }
        catch (error) {
            console_1.logger.warn("POOL_BACKING", `Custodial wallets for ${currency} not read: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
        try {
            const mirrors = (await db_1.sequelize.query(`SELECT wd.chain AS chain, SUM(wd.balance) AS balance
           FROM wallet_data wd
           JOIN wallet w ON w.id = wd.walletId
          WHERE wd.currency = :currency
            AND w.type = 'ECO'
            AND w.deletedAt IS NULL
          GROUP BY wd.chain`, { type: sequelize_1.QueryTypes.SELECT, replacements: { currency } }));
            for (const key of inventory.le.keys())
                inventory.le.get(key).mirror = 0;
            for (const m of mirrors) {
                const le = leFor(String(m.chain).toUpperCase());
                le.mirror = ((_c = le.mirror) !== null && _c !== void 0 ? _c : 0) + (Number(m.balance) || 0);
            }
        }
        catch (error) {
            console_1.logger.warn("POOL_BACKING", `walletData mirror for ${currency} not read: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
    }
    for (const [key, byAddress] of seen) {
        const list = [...byAddress.values()];
        list.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.address.localeCompare(b.address));
        inventory.addresses.set(key, list);
        leFor(key);
    }
    return inventory;
}
async function enumerateCustodyAddresses(currency, chain) {
    var _a;
    const inventory = await collectCustodyInventory(currency, { chains: [chain] });
    return (_a = inventory.addresses.get(String(chain).toUpperCase())) !== null && _a !== void 0 ? _a : [];
}
function resolveReadKind(chain, currency, token) {
    var _a;
    const family = chainFamily(chain);
    const type = String((_a = token === null || token === void 0 ? void 0 : token.contractType) !== null && _a !== void 0 ? _a : "").toUpperCase();
    const contract = (token === null || token === void 0 ? void 0 : token.contract) ? String(token.contract) : "";
    const cur = String(currency !== null && currency !== void 0 ? currency : "").toUpperCase();
    switch (family) {
        case "utxo":
            return "utxo";
        case "xmr":
            return "xmr";
        case "sol":
            if (type === "NATIVE" || (!contract && cur === "SOL"))
                return "sol";
            if (contract)
                return "spl";
            return { error: `no enabled ecosystemToken for ${currency} on SOL` };
        case "tron":
            if (type === "NATIVE" || (!contract && cur === "TRX"))
                return "tron";
            if (contract)
                return "trc20";
            return { error: `no enabled ecosystemToken for ${currency} on TRON` };
        case "ton":
            if (type === "NATIVE" || cur === "TON")
                return "ton";
            return { error: `TON jetton balance reads are not supported (${currency})` };
        case "evm":
        default:
            if (type === "NATIVE")
                return "native_evm";
            if (contract)
                return "erc20";
            return { error: `no enabled ecosystemToken for ${currency} on ${chain}` };
    }
}
function unitsFromRaw(raw, decimals) {
    const d = Math.max(0, Math.floor(Number(decimals) || 0));
    let big;
    try {
        big = typeof raw === "bigint" ? raw : BigInt(String(raw));
    }
    catch (_a) {
        return NaN;
    }
    const negative = big < BigInt(0);
    const digits = (negative ? -big : big).toString().padStart(d + 1, "0");
    const whole = digits.slice(0, digits.length - d);
    const frac = d ? digits.slice(digits.length - d) : "";
    const n = Number(frac ? `${whole}.${frac}` : whole);
    return negative ? -n : n;
}
function isMissingTokenAccount(error) {
    const text = String((error === null || error === void 0 ? void 0 : error.message) || error || "").toLowerCase();
    return text.includes("could not find account") || text.includes("invalid param: could not find");
}
async function readAddressBalance(p) {
    var _a, _b, _c, _d;
    var _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const chain = String((_e = p.chain) !== null && _e !== void 0 ? _e : "").toUpperCase();
    const kind = (_f = p.kind) !== null && _f !== void 0 ? _f : (p.walletId ? "customer" : "master");
    const readKind = resolveReadKind(chain, p.currency, p.token);
    if (typeof readKind !== "string")
        return readKind;
    try {
        switch (readKind) {
            case "native_evm":
            case "erc20": {
                const { getProvider } = require("@b/api/(ext)/ecosystem/utils/provider");
                const { balanceOf } = require("@b/api/(ext)/ecosystem/utils/evm-mover");
                const provider = await getProvider(chain);
                const contract = readKind === "erc20" ? String(p.token.contract) : null;
                const raw = await balanceOf(provider, contract, p.address);
                const decimals = readKind === "erc20" ? Number((_g = (_a = p.token) === null || _a === void 0 ? void 0 : _a.decimals) !== null && _g !== void 0 ? _g : 18) : 18;
                const balance = unitsFromRaw(raw, decimals);
                if (!Number.isFinite(balance))
                    throw new Error(`balanceOf returned a non-integer (${String(raw)})`);
                return { balance, source: "chain" };
            }
            case "sol": {
                const svc = await require("@b/blockchains/sol").default.getInstance();
                return { balance: Number(await svc.getBalance(p.address)), source: "chain" };
            }
            case "spl": {
                const svc = await require("@b/blockchains/sol").default.getInstance();
                const { PublicKey } = require("@solana/web3.js");
                const { getAssociatedTokenAddress } = require("@solana/spl-token");
                const ata = await getAssociatedTokenAddress(new PublicKey(String(p.token.contract)), new PublicKey(p.address), true);
                const info = await svc.rpc("getAccountInfo", (connection) => connection.getAccountInfo(ata));
                if (!info)
                    return { balance: 0, source: "chain" };
                let value;
                try {
                    const read = await svc.rpc("getTokenAccountBalance", (connection) => connection.getTokenAccountBalance(ata));
                    value = read === null || read === void 0 ? void 0 : read.value;
                }
                catch (error) {
                    if (isMissingTokenAccount(error))
                        return { balance: 0, source: "chain" };
                    throw error;
                }
                if ((value === null || value === void 0 ? void 0 : value.uiAmount) != null)
                    return { balance: Number(value.uiAmount), source: "chain" };
                const decimals = Number((_j = (_h = value === null || value === void 0 ? void 0 : value.decimals) !== null && _h !== void 0 ? _h : (_b = p.token) === null || _b === void 0 ? void 0 : _b.decimals) !== null && _j !== void 0 ? _j : 0);
                const balance = unitsFromRaw(String((_k = value === null || value === void 0 ? void 0 : value.amount) !== null && _k !== void 0 ? _k : "0"), decimals);
                if (!Number.isFinite(balance))
                    throw new Error(`getTokenAccountBalance returned no amount (${JSON.stringify(value !== null && value !== void 0 ? value : null).slice(0, 200)})`);
                return { balance, source: "chain" };
            }
            case "tron": {
                const svc = await require("@b/blockchains/tron").default.getInstance();
                return { balance: Number(await svc.getBalance(p.address)), source: "chain" };
            }
            case "trc20": {
                const svc = await require("@b/blockchains/tron").default.getInstance();
                const contract = String(p.token.contract);
                const result = await svc.rpc("balanceOf", (tronWeb) => tronWeb.transactionBuilder.triggerConstantContract(contract, "balanceOf(address)", {}, [{ type: "address", value: p.address }], p.address));
                const hex = (_c = result === null || result === void 0 ? void 0 : result.constant_result) === null || _c === void 0 ? void 0 : _c[0];
                if (!hex || typeof hex !== "string") {
                    throw new Error(`TRC20 balanceOf returned no constant_result (${JSON.stringify((_m = (_l = result === null || result === void 0 ? void 0 : result.result) !== null && _l !== void 0 ? _l : result) !== null && _m !== void 0 ? _m : null).slice(0, 200)})`);
                }
                const balance = unitsFromRaw(BigInt("0x" + hex), Number((_o = (_d = p.token) === null || _d === void 0 ? void 0 : _d.decimals) !== null && _o !== void 0 ? _o : 6));
                return { balance, source: "chain" };
            }
            case "ton": {
                const svc = await require("@b/blockchains/ton").default.getInstance();
                return { balance: Number(await svc.getBalance(p.address)), source: "chain" };
            }
            case "xmr": {
                if (kind === "customer") {
                    const mirror = (_p = p.mirrorBalance) !== null && _p !== void 0 ? _p : (await readMirrorFromWallet(p.walletId, chain));
                    if (mirror == null)
                        return { error: "Monero customer wallet has no mirror figure and no on-chain read exists for a bare address" };
                    return { balance: mirror, source: "mirror" };
                }
                if (kind === "custodial")
                    return { error: "Monero has no custodial contracts" };
                const walletFile = kind === "master" ? "master_wallet" : p.walletId;
                if (!walletFile)
                    return { error: "Monero treasury read needs the wallet id (the wallet file name)" };
                const svc = await require("@b/blockchains/xmr").default.getInstance();
                return { balance: Number(await svc.getBalance(String(walletFile))), source: "chain" };
            }
            case "utxo": {
                if (kind === "customer") {
                    if (!p.walletId)
                        return { error: "UTXO customer address has no wallet id for the pool read" };
                    const rows = (await db_1.models.ecosystemUtxo.findAll({
                        where: { walletId: p.walletId, status: "UNSPENT" },
                        attributes: ["amount"],
                        raw: true,
                    }));
                    let total = 0;
                    for (const r of rows)
                        total += Number(r.amount) || 0;
                    return { balance: total, source: "utxo_pool" };
                }
                const { isUtxoAddressOnConfiguredNetwork } = require("@b/utils/utxo-network");
                if (!isUtxoAddressOnConfiguredNetwork(chain, p.address, "pool-backing custody read")) {
                    return { error: `address is not on the configured ${chain} network` };
                }
                const { getUTXOProvider } = require("@b/api/(ext)/ecosystem/utils/utxo/providers/UTXOProviderFactory");
                const { satoshiToStandardUnit } = require("@b/api/(ext)/ecosystem/utils/blockchain");
                const provider = await getUTXOProvider(chain);
                const name = provider.getName ? provider.getName() : "UTXO provider";
                if (typeof provider.getBalanceStrict !== "function") {
                    return { error: `${name} has no throwing balance read (getBalanceStrict); its 0 cannot be told from an outage` };
                }
                const sats = Number(await provider.getBalanceStrict(p.address));
                if (!Number.isFinite(sats))
                    throw new Error(`${name} returned a non-numeric balance`);
                return { balance: Number(satoshiToStandardUnit(sats, chain)), source: "chain" };
            }
            default:
                return { error: `unsupported read kind ${String(readKind)}` };
        }
    }
    catch (error) {
        return { error: String((error === null || error === void 0 ? void 0 : error.message) || error) };
    }
}
async function readMirrorFromWallet(walletId, chain) {
    if (!walletId)
        return null;
    try {
        const wallet = await db_1.models.wallet.findOne({ where: { id: walletId }, attributes: ["address"], raw: true });
        const map = (0, treasury_1.parseAddressMap)(wallet === null || wallet === void 0 ? void 0 : wallet.address);
        if (!map)
            return null;
        for (const [key, entry] of Object.entries(map)) {
            if (key.toUpperCase() !== chain)
                continue;
            const n = Number(entry === null || entry === void 0 ? void 0 : entry.balance);
            return Number.isFinite(n) ? n : null;
        }
        return null;
    }
    catch (_a) {
        return null;
    }
}
async function loadToken(currency, chain) {
    var _a, _b;
    try {
        const token = await db_1.models.ecosystemToken.findOne({
            where: { currency, chain, status: true },
            attributes: ["contract", "decimals", "contractType"],
            raw: true,
        });
        if (!token)
            return null;
        const decimals = token.decimals != null ? Number(token.decimals) : undefined;
        return {
            contract: (_a = token.contract) !== null && _a !== void 0 ? _a : null,
            decimals: Number.isFinite(decimals) ? decimals : undefined,
            contractType: String((_b = token.contractType) !== null && _b !== void 0 ? _b : ""),
        };
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `ecosystemToken lookup for ${currency}/${chain} failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return null;
    }
}
function orderForRotation(rows) {
    const time = (v) => {
        if (v == null)
            return -1;
        const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
        return Number.isFinite(t) ? t : -1;
    };
    const key = (r) => (r.attemptedAt != null ? time(r.attemptedAt) : time(r.readAt));
    return [...rows].sort((a, b) => key(a) - key(b) || a.address.localeCompare(b.address));
}
async function refreshCustodyReads(p) {
    var _a, _b;
    const chain = String((_a = p.chain) !== null && _a !== void 0 ? _a : "").toUpperCase();
    const summary = {
        currency: p.currency,
        chain,
        addresses: 0,
        read: 0,
        errored: 0,
        deferred: 0,
        retired: 0,
        platformErrored: false,
        errors: [],
    };
    try {
        const list = (_b = p.addresses) !== null && _b !== void 0 ? _b : (await enumerateCustodyAddresses(p.currency, chain));
        summary.addresses = list.length;
        const table = db_1.models.poolBackingCustodyRead;
        const where = { currency: p.currency, chain };
        let existing = (await table.findAll({ where, raw: true }));
        const enumerated = new Set(list.map((a) => a.address));
        const stale = existing.filter((r) => !enumerated.has(String(r.address)));
        if (stale.length) {
            try {
                const CHUNK = 500;
                for (let i = 0; i < stale.length; i += CHUNK) {
                    const ids = stale.slice(i, i + CHUNK).map((r) => String(r.id));
                    await table.destroy({ where: { id: ids } });
                }
                summary.retired = stale.length;
                console_1.logger.info("POOL_BACKING", `Custody reads ${p.currency}/${chain}: retired ${stale.length} row(s) whose address left the inventory (${stale.slice(0, 3).map((r) => `${r.kind} ${r.address}`).join(", ")}${stale.length > 3 ? ", …" : ""})`);
                existing = existing.filter((r) => enumerated.has(String(r.address)));
            }
            catch (error) {
                summary.errors.push(`${stale.length} stale row(s) not retired: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            }
        }
        if (!list.length)
            return summary;
        const token = p.token === undefined ? await loadToken(p.currency, chain) : p.token;
        let byAddress = new Map(existing.map((r) => [String(r.address), r]));
        const missing = list.filter((a) => !byAddress.has(a.address));
        if (missing.length) {
            const drafts = missing.map((a) => ({ ...where, address: a.address, walletId: a.walletId, kind: a.kind, source: "chain" }));
            try {
                await table.bulkCreate(drafts, { ignoreDuplicates: true });
            }
            catch (error) {
                console_1.logger.warn("POOL_BACKING", `Custody rows for ${p.currency}/${chain} not bulk-created (${(error === null || error === void 0 ? void 0 : error.message) || error}); creating one by one`);
                for (const d of drafts) {
                    try {
                        await table.create(d);
                    }
                    catch (_c) {
                    }
                }
            }
            existing = (await table.findAll({ where, raw: true }));
            byAddress = new Map(existing.map((r) => [String(r.address), r]));
        }
        const platform = list.filter((a) => a.kind !== "customer");
        const customers = orderForRotation(list
            .filter((a) => a.kind === "customer")
            .map((a) => {
            var _a, _b;
            const row = byAddress.get(a.address);
            return { ...a, readAt: (_a = row === null || row === void 0 ? void 0 : row.readAt) !== null && _a !== void 0 ? _a : null, attemptedAt: (_b = row === null || row === void 0 ? void 0 : row.attemptedAt) !== null && _b !== void 0 ? _b : null };
        }));
        const perRun = Math.max(0, Math.floor(Number(p.perRun) || 0));
        const slice = customers.slice(0, perRun);
        summary.deferred = customers.length - slice.length;
        for (const a of [...platform, ...slice]) {
            if (readNeedsRpc(chain, a.kind))
                await p.limiter.acquire(chain);
            const attemptedAt = new Date();
            const result = await readAddressBalance({
                chain,
                currency: p.currency,
                address: a.address,
                walletId: a.walletId,
                kind: a.kind,
                mirrorBalance: a.mirrorBalance,
                token,
            });
            let patch;
            if ("error" in result) {
                summary.errored += 1;
                if (a.kind === "treasury" || a.kind === "master")
                    summary.platformErrored = true;
                summary.errors.push(`${a.kind} ${a.address}: ${result.error}`);
                patch = { walletId: a.walletId, kind: a.kind, error: result.error.slice(0, 2000), attemptedAt };
            }
            else {
                summary.read += 1;
                patch = { walletId: a.walletId, kind: a.kind, balance: result.balance, readAt: attemptedAt, attemptedAt, error: null, source: result.source };
            }
            try {
                await table.update(patch, { where: { ...where, address: a.address } });
            }
            catch (error) {
                summary.errors.push(`${a.kind} ${a.address}: row not written: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            }
        }
        if (summary.errors.length) {
            console_1.logger.warn("POOL_BACKING", `Custody reads ${p.currency}/${chain}: ${summary.read} read, ${summary.errored} failed — ${summary.errors.slice(0, 3).join("; ")}`);
        }
    }
    catch (error) {
        summary.errors.push(String((error === null || error === void 0 ? void 0 : error.message) || error));
        console_1.logger.warn("POOL_BACKING", `Custody refresh ${p.currency}/${chain} failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    return summary;
}
async function computeEcosystemSide(currency, inventory, run) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const inv = inventory !== null && inventory !== void 0 ? inventory : (await collectCustodyInventory(currency));
    const refreshedChains = new Set([...((_a = run === null || run === void 0 ? void 0 : run.refreshed) !== null && _a !== void 0 ? _a : [])].map((c) => String(c).toUpperCase()));
    const since = (run === null || run === void 0 ? void 0 : run.since) instanceof Date ? run.since.getTime() : (run === null || run === void 0 ? void 0 : run.since) != null ? new Date(run.since).getTime() : NaN;
    let rows = [];
    try {
        rows = (await db_1.models.poolBackingCustodyRead.findAll({ where: { currency }, raw: true }));
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Custody reads for ${currency} not read: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    const rowsByChain = new Map();
    for (const r of rows) {
        const key = String((_b = r.chain) !== null && _b !== void 0 ? _b : "").toUpperCase();
        if (!rowsByChain.has(key))
            rowsByChain.set(key, []);
        rowsByChain.get(key).push(r);
    }
    const openByChain = new Map();
    const waivedByChain = new Map();
    try {
        const rows = (await db_1.models.poolBackingObligation.findAll({
            where: { currency, status: ["OPEN", "CLAIMED", "WAIVED"], side: ["both", "ecosystem"] },
            attributes: ["chain", "amount", "status"],
            raw: true,
        }));
        for (const o of rows) {
            if (!(o === null || o === void 0 ? void 0 : o.chain))
                continue;
            const key = String(o.chain).toUpperCase();
            const target = String(o.status) === "WAIVED" ? waivedByChain : openByChain;
            target.set(key, ((_c = target.get(key)) !== null && _c !== void 0 ? _c : 0) + (Number(o.amount) || 0));
        }
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Open ecosystem-side rows for ${currency} not read: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    const chains = new Set([...inv.le.keys(), ...inv.addresses.keys(), ...openByChain.keys(), ...waivedByChain.keys()]);
    const out = {};
    for (const chain of [...chains].sort()) {
        const le = (_d = inv.le.get(chain)) !== null && _d !== void 0 ? _d : { le: 0, leTreasury: 0, mirror: null };
        const enumerated = (_e = inv.addresses.get(chain)) !== null && _e !== void 0 ? _e : [];
        const universe = new Set(enumerated.map((a) => a.address));
        const chainRows = ((_f = rowsByChain.get(chain)) !== null && _f !== void 0 ? _f : []).filter((r) => universe.has(String(r.address)));
        const rowByAddress = new Map(chainRows.map((r) => [String(r.address), r]));
        const heByKind = { treasury: 0, master: 0, custodial: 0, customer: 0 };
        let heKnown = 0;
        let read = 0;
        let errored = 0;
        let platformErrored = false;
        const unknownReasons = [];
        let oldest = null;
        let newest = null;
        for (const r of chainRows) {
            const kind = ((_g = r.kind) !== null && _g !== void 0 ? _g : "customer");
            if (r.error != null && r.error !== "") {
                errored += 1;
                if (kind === "treasury" || kind === "master") {
                    platformErrored = true;
                    unknownReasons.push(`${kind} ${r.address} failed: ${String(r.error).slice(0, 200)}`);
                }
            }
            if (r.balance == null)
                continue;
            const n = Number(r.balance) || 0;
            read += 1;
            heKnown += n;
            heByKind[kind] = ((_h = heByKind[kind]) !== null && _h !== void 0 ? _h : 0) + n;
            const t = r.readAt ? new Date(r.readAt).getTime() : NaN;
            if (Number.isFinite(t)) {
                oldest = oldest == null ? t : Math.min(oldest, t);
                newest = newest == null ? t : Math.max(newest, t);
            }
        }
        if (refreshedChains.has(chain) && Number.isFinite(since)) {
            for (const a of enumerated) {
                if (a.kind !== "treasury" && a.kind !== "master")
                    continue;
                const r = rowByAddress.get(a.address);
                const readAt = (r === null || r === void 0 ? void 0 : r.readAt) ? new Date(r.readAt).getTime() : NaN;
                const freshEnough = Number.isFinite(readAt) && readAt >= since && (r.error == null || r.error === "");
                if (freshEnough)
                    continue;
                if (!platformErrored || !((r === null || r === void 0 ? void 0 : r.error) != null && r.error !== "")) {
                    unknownReasons.push(`${a.kind} ${a.address} was not read this run${(r === null || r === void 0 ? void 0 : r.readAt) ? ` (last read ${new Date(r.readAt).toISOString()})` : " (never read)"}`);
                }
                platformErrored = true;
            }
        }
        const total = universe.size;
        let status;
        if (platformErrored)
            status = "unknown";
        else if (read < total)
            status = "partial";
        else if (total === 0 && le.le > 0)
            status = "partial";
        else
            status = "ok";
        const he = status === "ok" ? heKnown : null;
        const gapE = he == null ? null : le.le - he;
        const openObligations = (_j = openByChain.get(chain)) !== null && _j !== void 0 ? _j : 0;
        const waivedObligations = (_k = waivedByChain.get(chain)) !== null && _k !== void 0 ? _k : 0;
        out[chain] = {
            le: le.le,
            leTreasury: le.leTreasury,
            leUnattributed: inv.leUnattributed,
            he,
            heKnown,
            heByKind,
            addressesTotal: total,
            addressesRead: read,
            addressesErrored: errored,
            oldestReadAt: oldest == null ? null : new Date(oldest).toISOString(),
            newestReadAt: newest == null ? null : new Date(newest).toISOString(),
            gapE,
            status,
            unknownReason: status === "unknown" ? [...new Set(unknownReasons)].join("; ") || "a treasury or master read failed this run" : null,
            mirror: le.mirror,
            openObligations,
            waivedObligations,
            residual: gapE == null ? null : gapE + openObligations + waivedObligations,
        };
    }
    return out;
}
