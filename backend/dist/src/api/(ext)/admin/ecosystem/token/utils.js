"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecosystemTokenStoreSchema = exports.ecosystemTokenImportSchema = exports.ecosystemTokenDeploySchema = exports.ecosystemTokenUpdateSchema = exports.baseEcosystemTokenSchema = exports.ecosystemTokenSchema = void 0;
exports.updateIconInCache = updateIconInCache;
exports.getEcosystemTokensAll = getEcosystemTokensAll;
exports.getEcosystemTokenByChainAndCurrency = getEcosystemTokenByChainAndCurrency;
exports.getEcosystemTokenById = getEcosystemTokenById;
exports.getEcosystemTokensByChain = getEcosystemTokensByChain;
exports.createEcosystemToken = createEcosystemToken;
exports.importEcosystemToken = importEcosystemToken;
exports.updateAdminTokenIcon = updateAdminTokenIcon;
exports.getNoPermitTokens = getNoPermitTokens;
exports.updateStatusBulk = updateStatusBulk;
exports.updateAdminToken = updateAdminToken;
const db_1 = require("@b/db");
const redis_1 = require("@b/utils/redis");
const schema_1 = require("@b/utils/schema");
const wallet_1 = require("@b/services/wallet");
const redis = redis_1.RedisSingleton.getInstance();
const CACHE_KEY_PREFIX = "ecosystem_token_icon:";
const CACHE_EXPIRY = 3600;
async function updateIconInCache(currency, icon, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Updating icon in cache for currency ${currency}`);
        const cacheKey = `${CACHE_KEY_PREFIX}${currency}`;
        await redis.set(cacheKey, icon, "EX", CACHE_EXPIRY);
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Icon cached for ${currency}`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
const id = (0, schema_1.baseStringSchema)("ID of the ecosystem token");
const contract = (0, schema_1.baseStringSchema)("Contract address of the token");
const name = (0, schema_1.baseStringSchema)("Name of the token");
const currency = (0, schema_1.baseStringSchema)("Currency of the token");
const chain = (0, schema_1.baseStringSchema)("Blockchain chain associated with the token");
const network = (0, schema_1.baseStringSchema)("Network where the token operates");
const type = (0, schema_1.baseStringSchema)("Type of the token");
const decimals = (0, schema_1.baseNumberSchema)("Number of decimals for the token");
const status = (0, schema_1.baseBooleanSchema)("Operational status of the token");
const precision = (0, schema_1.baseNumberSchema)("Precision level of the token");
const limits = {
    type: "object",
    nullable: true,
    properties: {
        deposit: {
            type: "object",
            properties: {
                min: (0, schema_1.baseNumberSchema)("Minimum deposit amount"),
                max: (0, schema_1.baseNumberSchema)("Maximum deposit amount"),
            },
        },
        withdraw: {
            type: "object",
            properties: {
                min: (0, schema_1.baseNumberSchema)("Minimum withdrawal amount"),
                max: (0, schema_1.baseNumberSchema)("Maximum withdrawal amount"),
            },
        },
    },
};
const fee = {
    type: "object",
    nullable: true,
    properties: {
        min: (0, schema_1.baseNumberSchema)("Minimum fee amount"),
        percentage: (0, schema_1.baseNumberSchema)("Percentage fee amount"),
    },
};
const icon = (0, schema_1.baseStringSchema)("URL to the token icon", 1000, 0, true);
const contractType = (0, schema_1.baseEnumSchema)("Type of contract (PERMIT, NO_PERMIT, NATIVE)", ["PERMIT", "NO_PERMIT", "NATIVE"]);
exports.ecosystemTokenSchema = {
    id,
    contract,
    name,
    currency,
    chain,
    network,
    type,
    decimals,
    status,
    precision,
    limits,
    fee,
    icon,
    contractType,
};
exports.baseEcosystemTokenSchema = {
    id,
    contract,
    name,
    currency,
    chain,
    network,
    type,
    decimals,
    status,
    precision,
    limits,
    fee,
    icon,
    contractType,
};
exports.ecosystemTokenUpdateSchema = {
    type: "object",
    properties: {
        icon,
        fee,
        limits,
        status,
    },
    required: [],
};
exports.ecosystemTokenDeploySchema = {
    type: "object",
    properties: {
        name,
        currency,
        chain,
        type,
        decimals,
        status,
        precision,
        limits,
        fee,
        icon,
        initialSupply: (0, schema_1.baseNumberSchema)("Initial supply of the token"),
        initialHolder: (0, schema_1.baseStringSchema)("Address of the initial token holder"),
        marketCap: (0, schema_1.baseNumberSchema)("Maximum supply cap of the token"),
    },
    required: [
        "name",
        "currency",
        "chain",
        "decimals",
        "initialSupply",
        "initialHolder",
        "marketCap",
    ],
};
exports.ecosystemTokenImportSchema = {
    type: "object",
    properties: {
        icon,
        name,
        currency,
        chain,
        network,
        contract,
        contractType,
        decimals,
        precision,
        type,
        fee,
        limits,
        status,
    },
    required: [
        "name",
        "currency",
        "chain",
        "network",
        "contract",
        "decimals",
        "type",
        "contractType",
    ],
};
exports.ecosystemTokenStoreSchema = {
    description: `Ecosystem token created or updated successfully`,
    content: {
        "application/json": {
            schema: exports.ecosystemTokenDeploySchema,
        },
    },
};
async function getEcosystemTokensAll(ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching all ecosystem tokens");
        const tokens = await db_1.models.ecosystemToken.findAll();
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Found ${tokens.length} ecosystem token(s)`);
        return tokens;
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function getEcosystemTokenByChainAndCurrency(chain, currency, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching token for chain ${chain} and currency ${currency}`);
        const token = await db_1.models.ecosystemToken.findOne({
            where: {
                chain,
                currency,
            },
        });
        if (token) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Token found for ${chain}/${currency}`);
        }
        else {
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `No token found for ${chain}/${currency}`);
        }
        return token;
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        throw error;
    }
}
async function getEcosystemTokenById(id, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching token with ID ${id}`);
        const token = await db_1.models.ecosystemToken.findByPk(id);
        if (token) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Token found with ID ${id}`);
        }
        else {
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `No token found with ID ${id}`);
        }
        return token;
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        throw error;
    }
}
async function getEcosystemTokensByChain(chain) {
    return db_1.models.ecosystemToken.findAll({
        where: {
            chain,
            network: process.env[`${chain}_NETWORK`],
        },
    });
}
async function createEcosystemToken({ chain, name, currency, contract, decimals, type, network, }, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Creating ecosystem token ${name} (${currency}) on ${chain}`);
        const token = await db_1.models.ecosystemToken.create({
            chain,
            name,
            currency,
            contract,
            decimals,
            type,
            network,
            status: true,
            contractType: "PERMIT",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Token ${name} created successfully`);
        await wallet_1.precisionCacheService.invalidateEcoToken(currency, chain);
        return token;
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function importEcosystemToken({ name, currency, chain, network, type, contract, decimals, contractType, }, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Importing token ${name} (${currency}) on ${chain}`);
        const token = await db_1.models.ecosystemToken.create({
            name,
            currency,
            chain,
            network,
            type,
            contract,
            decimals,
            status: true,
            contractType,
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Token ${name} imported successfully`);
        await wallet_1.precisionCacheService.invalidateEcoToken(currency, chain);
        return token;
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function updateAdminTokenIcon(id, icon, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Updating icon for token ID ${id}`);
        await db_1.models.ecosystemToken.update({ icon }, {
            where: { id },
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Token icon updated for ID ${id}`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function getNoPermitTokens(chain, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching NO_PERMIT tokens for chain ${chain}`);
        const tokens = await db_1.models.ecosystemToken.findAll({
            where: {
                chain,
                contractType: "NO_PERMIT",
                network: process.env[`${chain}_NETWORK`],
                status: true,
            },
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Found ${tokens.length} NO_PERMIT token(s) for ${chain}`);
        return tokens;
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function updateStatusBulk(ids, status, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Updating status for ${ids.length} token(s)`);
        await db_1.models.ecosystemToken.update({ status }, {
            where: { id: ids },
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Status updated for ${ids.length} token(s)`);
        await wallet_1.precisionCacheService.invalidateEcoCache();
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function updateAdminToken(id, precision, limits, fee, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Updating token details for ID ${id}`);
        const token = await db_1.models.ecosystemToken.findByPk(id);
        await db_1.models.ecosystemToken.update({
            precision,
            limits,
            fee,
        }, {
            where: { id },
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Token details updated for ID ${id}`);
        if (token) {
            await wallet_1.precisionCacheService.invalidateEcoToken(token.currency, token.chain);
        }
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
