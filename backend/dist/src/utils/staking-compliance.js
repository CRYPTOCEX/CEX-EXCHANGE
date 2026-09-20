"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAKING_SYNTHETIC_GEO_BLOCK_DEFAULT = exports.STAKING_SYNTHETIC_RISK_STATEMENT = exports.STAKING_SYNTHETIC_RISK_STATEMENT_VERSION = exports.STAKING_SYNTHETIC_RISK_ACK_KEY = exports.STAKING_SYNTHETIC_GEO_BLOCK_KEY = void 0;
exports.parseBlockList = parseBlockList;
exports.parseAcknowledgement = parseAcknowledgement;
exports.isAcknowledgementCurrent = isAcknowledgementCurrent;
exports.resolveStakingCompliance = resolveStakingCompliance;
exports.getStakingCompliance = getStakingCompliance;
exports.assertFixedRateStakingGeoAllowed = assertFixedRateStakingGeoAllowed;
exports.assertOnChainStakingGeoAllowed = assertOnChainStakingGeoAllowed;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const geo_block_1 = require("@b/utils/geo-block");
exports.STAKING_SYNTHETIC_GEO_BLOCK_KEY = "stakingSyntheticGeoBlockList";
exports.STAKING_SYNTHETIC_RISK_ACK_KEY = "stakingSyntheticRiskAcknowledgement";
exports.STAKING_SYNTHETIC_RISK_STATEMENT_VERSION = "2026-09-03";
exports.STAKING_SYNTHETIC_RISK_STATEMENT = [
    "Fixed-rate staking pools on this platform pay an advertised percentage that",
    "is set by the operator. Nothing is staked, bonded or delegated on any",
    "blockchain, no validator is involved, and no network reward reaches the",
    "platform. Every reward is paid from the operator's own funds, and the",
    "software books each payout as a platform loss against the treasury.",
    "",
    "In many jurisdictions — including the United States, the United Kingdom and",
    "the European Union — offering this constitutes operating a collective",
    "investment scheme, taking deposits, or issuing a security, and doing so",
    "without authorisation is a criminal offence. Singapore prohibits it for",
    "retail customers outright and Hong Kong bars licensed platforms from it.",
    "These territories are therefore blocked by default.",
    "",
    "By unblocking a territory the operator confirms that they, and not the",
    "software vendor, are responsible for determining that they may lawfully",
    "offer this product to residents of that territory.",
].join("\n");
exports.STAKING_SYNTHETIC_GEO_BLOCK_DEFAULT = [
    "US",
    "GB",
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
    "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
    "SI", "ES", "SE",
    "SG",
    "HK",
];
function parseBlockList(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (Array.isArray(raw)) {
        return raw.map((v) => String(v).trim().toUpperCase()).filter(Boolean);
    }
    const text = String(raw).trim();
    if (text === "")
        return [];
    if (text.startsWith("[")) {
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                return parsed.map((v) => String(v).trim().toUpperCase()).filter(Boolean);
            }
        }
        catch (_a) {
        }
    }
    return text
        .split(/[,;\s]+/)
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean);
}
function parseAcknowledgement(raw) {
    if (raw === null || raw === undefined)
        return null;
    let value = raw;
    if (typeof raw === "string") {
        const text = raw.trim();
        if (text === "")
            return null;
        try {
            value = JSON.parse(text);
        }
        catch (_a) {
            return null;
        }
    }
    if (!value || typeof value !== "object")
        return null;
    if (typeof value.userId !== "string" || !value.userId)
        return null;
    if (typeof value.acceptedAt !== "string" || !value.acceptedAt)
        return null;
    if (typeof value.statementVersion !== "string" || !value.statementVersion)
        return null;
    return {
        userId: value.userId,
        email: typeof value.email === "string" ? value.email : null,
        acceptedAt: value.acceptedAt,
        statementVersion: value.statementVersion,
        statement: typeof value.statement === "string" ? value.statement : "",
    };
}
function isAcknowledgementCurrent(ack) {
    return !!ack && ack.statementVersion === exports.STAKING_SYNTHETIC_RISK_STATEMENT_VERSION;
}
function resolveStakingCompliance(storedList, storedAck) {
    const parsed = parseBlockList(storedList);
    const configuredBlockList = parsed === null ? [...exports.STAKING_SYNTHETIC_GEO_BLOCK_DEFAULT] : parsed;
    const acknowledgement = parseAcknowledgement(storedAck);
    const acknowledged = isAcknowledgementCurrent(acknowledgement);
    if (acknowledged) {
        return {
            configuredBlockList,
            effectiveBlockList: configuredBlockList,
            acknowledgement,
            acknowledged,
            pendingUnblocks: [],
        };
    }
    const union = new Set(configuredBlockList);
    const pendingUnblocks = [];
    for (const code of exports.STAKING_SYNTHETIC_GEO_BLOCK_DEFAULT) {
        if (!union.has(code))
            pendingUnblocks.push(code);
        union.add(code);
    }
    return {
        configuredBlockList,
        effectiveBlockList: Array.from(union),
        acknowledgement,
        acknowledged,
        pendingUnblocks,
    };
}
async function getStakingCompliance() {
    const rows = await db_1.models.settings.findAll({
        where: { key: [exports.STAKING_SYNTHETIC_GEO_BLOCK_KEY, exports.STAKING_SYNTHETIC_RISK_ACK_KEY] },
    });
    let storedList = null;
    let storedAck = null;
    for (const row of rows) {
        if (row.key === exports.STAKING_SYNTHETIC_GEO_BLOCK_KEY)
            storedList = row.value;
        if (row.key === exports.STAKING_SYNTHETIC_RISK_ACK_KEY)
            storedAck = row.value;
    }
    return resolveStakingCompliance(storedList, storedAck);
}
async function assertFixedRateStakingGeoAllowed(userId, headers) {
    let compliance;
    try {
        compliance = await getStakingCompliance();
    }
    catch (error) {
        console_1.logger.error("STAKING", "Could not read staking compliance settings; refusing on the default policy", error);
        compliance = resolveStakingCompliance(null, null);
    }
    const blockList = compliance.effectiveBlockList;
    if (blockList.length === 0)
        return;
    const blockedAs = await (0, geo_block_1.resolveBlockedCountry)(userId, blockList, headers);
    if (blockedAs) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: `Fixed-rate staking is not available in your country (${blockedAs}) due to regulatory restrictions.`,
        });
    }
}
async function assertOnChainStakingGeoAllowed(userId, blockList, headers) {
    if (!blockList.length)
        return;
    const blockedAs = await (0, geo_block_1.resolveBlockedCountry)(userId, blockList, headers);
    if (blockedAs) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: `On-chain staking is not available in your country (${blockedAs}) under this platform's declaration.`,
        });
    }
}
