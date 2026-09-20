"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POOL_BACKING_TREASURY_USER_ID = exports.POOL_BACKING_TREASURY_EMAIL = void 0;
exports.ensureTreasuryUser = ensureTreasuryUser;
exports.describeSquatter = describeSquatter;
exports.isTreasuryUser = isTreasuryUser;
exports.getTreasuryEcoWallet = getTreasuryEcoWallet;
exports.parseAddressMap = parseAddressMap;
exports.getTreasuryAddress = getTreasuryAddress;
exports.readTreasuryHoldings = readTreasuryHoldings;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const system_accounts_1 = require("@b/utils/system-accounts");
Object.defineProperty(exports, "POOL_BACKING_TREASURY_EMAIL", { enumerable: true, get: function () { return system_accounts_1.POOL_BACKING_TREASURY_EMAIL; } });
Object.defineProperty(exports, "POOL_BACKING_TREASURY_USER_ID", { enumerable: true, get: function () { return system_accounts_1.POOL_BACKING_TREASURY_USER_ID; } });
const TREASURY_USERNAME = system_accounts_1.POOL_BACKING_TREASURY_USERNAME;
async function ensureTreasuryUser() {
    var _a, _b;
    const existing = await db_1.models.user.findByPk(system_accounts_1.POOL_BACKING_TREASURY_USER_ID);
    if (existing)
        return existing;
    const role = await db_1.models.role.findOne({ where: { name: "User" } });
    try {
        const created = await db_1.models.user.create({
            id: system_accounts_1.POOL_BACKING_TREASURY_USER_ID,
            email: system_accounts_1.POOL_BACKING_TREASURY_EMAIL,
            password: null,
            username: TREASURY_USERNAME,
            firstName: "Pool Backing",
            lastName: "Treasury",
            emailVerified: false,
            phoneVerified: false,
            roleId: (_a = role === null || role === void 0 ? void 0 : role.id) !== null && _a !== void 0 ? _a : null,
            status: "ACTIVE",
        });
        console_1.logger.info("POOL_BACKING", `Created the pool-backing treasury account (${system_accounts_1.POOL_BACKING_TREASURY_USER_ID}). It holds the settlement reserve in ECO wallets and cannot be signed into.`);
        return created;
    }
    catch (error) {
        const again = await db_1.models.user.findByPk(system_accounts_1.POOL_BACKING_TREASURY_USER_ID);
        if (again)
            return again;
        throw ((_b = (await describeSquatter(system_accounts_1.POOL_BACKING_TREASURY_USER_ID, system_accounts_1.POOL_BACKING_TREASURY_EMAIL, TREASURY_USERNAME, "pool-backing treasury"))) !== null && _b !== void 0 ? _b : (0, error_1.createError)({
            statusCode: 500,
            message: `Could not create the pool-backing treasury account: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
        }));
    }
}
async function describeSquatter(systemId, email, username, name) {
    var _a;
    const squatter = await db_1.models.user.findOne({
        where: { [sequelize_1.Op.or]: [{ email }, { username }] },
        attributes: ["id", "email", "username", "deletedAt"],
        paranoid: false,
    });
    if (!squatter || squatter.id === systemId)
        return null;
    const holds = String((_a = squatter.email) !== null && _a !== void 0 ? _a : "").toLowerCase() === email
        ? `its address ${email}`
        : `its handle ${username}`;
    return (0, error_1.createError)({
        statusCode: 409,
        message: `Could not create the ${name} account: user ${squatter.id} already holds ${holds}` +
            `${squatter.deletedAt ? " (soft-deleted; the unique index still holds it)" : ""}. ` +
            `Hard-delete that row (DELETE /api/admin/crm/user/${squatter.id}?force=true) and retry.`,
    });
}
function isTreasuryUser(userId) {
    return (0, system_accounts_1.isSystemAccountId)(userId) && String(userId) === system_accounts_1.POOL_BACKING_TREASURY_USER_ID;
}
async function getTreasuryEcoWallet(currency) {
    await ensureTreasuryUser();
    let getWalletByUserIdAndCurrency;
    try {
        ({ getWalletByUserIdAndCurrency } = require("@b/api/(ext)/ecosystem/utils/wallet"));
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `The Ecosystem addon is not installed; the treasury has no custody wallet for ${currency} (${(error === null || error === void 0 ? void 0 : error.message) || error})`,
        });
    }
    try {
        const wallet = await getWalletByUserIdAndCurrency(system_accounts_1.POOL_BACKING_TREASURY_USER_ID, currency, "ECO");
        if (!wallet)
            throw new Error("the ecosystem wallet util returned nothing");
        return wallet;
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `No enabled ecosystem token for ${currency} on a network this install can reach (${(error === null || error === void 0 ? void 0 : error.message) || error})`,
        });
    }
}
function parseAddressMap(raw) {
    let map = raw;
    for (let pass = 0; pass < 2 && typeof map === "string"; pass++) {
        try {
            map = JSON.parse(map);
        }
        catch (_a) {
            return null;
        }
    }
    return map && typeof map === "object" && !Array.isArray(map) ? map : null;
}
function findChainEntry(map, chain) {
    if (!map)
        return null;
    if (map[chain])
        return { key: chain, entry: map[chain] };
    const wanted = chain.toUpperCase();
    for (const [key, entry] of Object.entries(map)) {
        if (key.toUpperCase() === wanted)
            return { key, entry };
    }
    return null;
}
async function getTreasuryAddress(currency, chain) {
    var _a;
    var _b, _c;
    const wallet = await getTreasuryEcoWallet(currency);
    const map = parseAddressMap(wallet === null || wallet === void 0 ? void 0 : wallet.address);
    const hit = findChainEntry(map, chain);
    if (!hit || !((_a = hit.entry) === null || _a === void 0 ? void 0 : _a.address))
        return null;
    let token = null;
    try {
        token = await db_1.models.ecosystemToken.findOne({
            where: { currency, chain: hit.key, status: true },
            attributes: ["contract", "decimals", "contractType"],
            raw: true,
        });
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `ecosystemToken lookup for ${currency}/${hit.key} failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    const decimals = (token === null || token === void 0 ? void 0 : token.decimals) != null ? Number(token.decimals) : undefined;
    return {
        walletId: String(wallet.id),
        address: String(hit.entry.address),
        contractType: (_b = token === null || token === void 0 ? void 0 : token.contractType) !== null && _b !== void 0 ? _b : undefined,
        contract: (_c = token === null || token === void 0 ? void 0 : token.contract) !== null && _c !== void 0 ? _c : undefined,
        decimals: Number.isFinite(decimals) ? decimals : undefined,
    };
}
async function readTreasuryHoldings() {
    var _a;
    const wallets = await db_1.models.wallet.findAll({
        where: { userId: system_accounts_1.POOL_BACKING_TREASURY_USER_ID, type: "ECO" },
        attributes: ["id", "currency", "balance", "address"],
    });
    const out = [];
    for (const w of wallets) {
        const map = (_a = parseAddressMap(w.address)) !== null && _a !== void 0 ? _a : {};
        const chains = {};
        for (const [chain, entry] of Object.entries(map)) {
            if (!entry || typeof entry !== "object" || !entry.address)
                continue;
            chains[chain] = { address: String(entry.address), balance: Number(entry.balance) || 0 };
        }
        out.push({
            currency: String(w.currency),
            walletId: String(w.id),
            balance: Number(w.balance) || 0,
            chains,
        });
    }
    out.sort((a, b) => a.currency.localeCompare(b.currency));
    return out;
}
