"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVESTMENT_GEO_BLOCK_DEFAULT = exports.INVESTMENT_RISK_STATEMENT = exports.INVESTMENT_RISK_STATEMENT_VERSION = exports.INVESTMENT_RISK_ACK_KEY = exports.INVESTMENT_GEO_BLOCK_KEY = void 0;
exports.parseBlockList = parseBlockList;
exports.parseAcknowledgement = parseAcknowledgement;
exports.isAcknowledgementCurrent = isAcknowledgementCurrent;
exports.resolveCompliance = resolveCompliance;
exports.getInvestmentCompliance = getInvestmentCompliance;
exports.assertInvestmentGeoAllowed = assertInvestmentGeoAllowed;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const geo_block_1 = require("@b/utils/geo-block");
exports.INVESTMENT_GEO_BLOCK_KEY = "investmentGeoBlockList";
exports.INVESTMENT_RISK_ACK_KEY = "investmentRiskAcknowledgement";
exports.INVESTMENT_RISK_STATEMENT_VERSION = "2026-08-26";
exports.INVESTMENT_RISK_STATEMENT = [
    "Fixed-return investment plans on this platform pay an advertised percentage",
    "that is set by the operator. The return does not derive from any underlying",
    "trading, lending or staking strategy, and the platform performs none on the",
    "investor's behalf. Every payout is made from the operator's own funds.",
    "",
    "In many jurisdictions — including the United States, the United Kingdom and",
    "the European Union — offering this constitutes operating a collective",
    "investment scheme or issuing a security, and doing so without authorisation",
    "is a criminal offence. These territories are therefore blocked by default.",
    "",
    "By unblocking a territory the operator confirms that they, and not the",
    "software vendor, are responsible for determining that they may lawfully",
    "offer this product to residents of that territory.",
].join("\n");
exports.INVESTMENT_GEO_BLOCK_DEFAULT = [
    "US",
    "GB",
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
    "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
    "SI", "ES", "SE",
];
function parseBlockList(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (Array.isArray(raw)) {
        return raw.map((v) => String(v).trim().toUpperCase()).filter(Boolean);
    }
    if (typeof raw !== "string")
        return null;
    const text = raw.trim();
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
    if (!raw)
        return null;
    let value = raw;
    if (typeof value === "string") {
        try {
            value = JSON.parse(value);
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
    if (typeof value.statementVersion !== "string")
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
    return !!ack && ack.statementVersion === exports.INVESTMENT_RISK_STATEMENT_VERSION;
}
function resolveCompliance(storedList, storedAck) {
    const parsed = parseBlockList(storedList);
    const configuredBlockList = parsed === null
        ? [...exports.INVESTMENT_GEO_BLOCK_DEFAULT]
        : parsed;
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
    for (const code of exports.INVESTMENT_GEO_BLOCK_DEFAULT) {
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
async function getInvestmentCompliance() {
    const rows = await db_1.models.settings.findAll({
        where: { key: [exports.INVESTMENT_GEO_BLOCK_KEY, exports.INVESTMENT_RISK_ACK_KEY] },
    });
    let storedList = null;
    let storedAck = null;
    for (const row of rows) {
        if (row.key === exports.INVESTMENT_GEO_BLOCK_KEY)
            storedList = row.value;
        if (row.key === exports.INVESTMENT_RISK_ACK_KEY)
            storedAck = row.value;
    }
    return resolveCompliance(storedList, storedAck);
}
async function assertInvestmentGeoAllowed(userId, headers) {
    let compliance;
    try {
        compliance = await getInvestmentCompliance();
    }
    catch (error) {
        console_1.logger.error("FINANCE", "Could not read investment compliance settings; refusing on the default policy", error);
        compliance = resolveCompliance(null, null);
    }
    const blockList = compliance.effectiveBlockList;
    if (blockList.length === 0)
        return;
    const blockedAs = await (0, geo_block_1.resolveBlockedCountry)(userId, blockList, headers);
    if (blockedAs) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: `Investment plans are not available in your country (${blockedAs}) due to regulatory restrictions.`,
        });
    }
}
