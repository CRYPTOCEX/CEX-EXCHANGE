"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
const investment_compliance_1 = require("@b/utils/investment-compliance");
const geo_block_1 = require("@b/utils/geo-block");
exports.metadata = {
    summary: "Updates the investment territory gate",
    description: "Saves the investment geo block list, and optionally records the operator's acceptance of the fixed-return risk statement. Removing a default territory has no effect until a Super Admin has accepted the current statement.",
    operationId: "updateInvestmentCompliance",
    tags: ["Admin", "Finance", "Investment", "Compliance"],
    requiresAuth: true,
    permission: "edit.investment.plan",
    logModule: "FINANCE",
    logTitle: "Update investment territory gate",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        blockList: {
                            type: "array",
                            items: { type: "string" },
                            description: "ISO-3166 alpha-2 (or alpha-3) country codes to block. An empty array blocks nobody.",
                        },
                        acknowledgeRiskStatement: {
                            type: "boolean",
                            description: "Record the calling Super Admin's acceptance of the current risk statement.",
                        },
                        revokeAcknowledgement: {
                            type: "boolean",
                            description: "Withdraw the recorded acceptance. The default territories are enforced again immediately.",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Territory gate updated" },
        400: { description: "Invalid country code" },
        401: query_1.unauthorizedResponse,
        403: { description: "Acknowledging requires Super Admin" },
        500: query_1.serverErrorResponse,
    },
};
async function writeSetting(key, value) {
    const existing = await db_1.models.settings.findOne({ where: { key } });
    if (existing) {
        if (existing.value === value)
            return false;
        await db_1.models.settings.update({ value }, { where: { key } });
        return true;
    }
    await db_1.models.settings.create({ key, value });
    return true;
}
exports.default = async (data) => {
    var _a, _b, _c, _d;
    var _e, _f, _g, _h, _j, _k;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { blockList, acknowledgeRiskStatement = false, revokeAcknowledgement = false, } = body || {};
    if (acknowledgeRiskStatement && revokeAcknowledgement) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Cannot accept and withdraw the risk statement in the same request",
        });
    }
    const before = await (0, investment_compliance_1.getInvestmentCompliance)();
    const changes = [];
    let nextList = null;
    if (blockList !== undefined) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating country codes");
        const parsed = (0, investment_compliance_1.parseBlockList)(blockList);
        if (parsed === null) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "blockList must be an array of country codes",
            });
        }
        const invalid = parsed.filter((code) => (0, geo_block_1.toIsoCode)(code) === null);
        if (invalid.length) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid country codes: ${invalid.join(", ")}`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Not ISO-3166 country codes: ${invalid.join(", ")}. ` +
                    "Use two-letter codes such as US, GB, DE — a value that is not a code would block nobody.",
            });
        }
        nextList = Array.from(new Set(parsed.map((code) => (0, geo_block_1.toIsoCode)(code))));
    }
    if (acknowledgeRiskStatement || revokeAcknowledgement) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking authority to accept the risk statement");
        const userPk = await db_1.models.user.findByPk(user.id, {
            include: [{ model: db_1.models.role, as: "role" }],
        });
        const isSuperAdmin = !!(userPk === null || userPk === void 0 ? void 0 : userPk.role) && userPk.role.name === "Super Admin";
        if (!isSuperAdmin) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Risk acknowledgement requires Super Admin");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Only a Super Admin can accept or withdraw the fixed-return investment risk statement.",
            });
        }
        if (acknowledgeRiskStatement) {
            const record = {
                userId: String(user.id),
                email: (_e = userPk === null || userPk === void 0 ? void 0 : userPk.email) !== null && _e !== void 0 ? _e : null,
                acceptedAt: new Date().toISOString(),
                statementVersion: investment_compliance_1.INVESTMENT_RISK_STATEMENT_VERSION,
                statement: investment_compliance_1.INVESTMENT_RISK_STATEMENT,
            };
            await writeSetting(investment_compliance_1.INVESTMENT_RISK_ACK_KEY, JSON.stringify(record));
            changes.push("accepted the fixed-return risk statement");
            console_1.logger.warn("FINANCE", `Investment risk statement accepted by ${(_f = record.email) !== null && _f !== void 0 ? _f : record.userId} (version ${record.statementVersion})`);
        }
        else {
            await writeSetting(investment_compliance_1.INVESTMENT_RISK_ACK_KEY, "");
            changes.push("withdrew the fixed-return risk statement acceptance");
            console_1.logger.warn("FINANCE", `Investment risk statement acceptance WITHDRAWN by ${user.id}; default territories are enforced again`);
        }
    }
    if (nextList !== null) {
        const changed = await writeSetting(investment_compliance_1.INVESTMENT_GEO_BLOCK_KEY, JSON.stringify(nextList));
        if (changed)
            changes.push(`set the block list to ${nextList.join(", ") || "(empty)"}`);
    }
    try {
        await cache_1.CacheManager.getInstance().clearCache();
    }
    catch (error) {
        console_1.logger.error("FINANCE", "Failed to clear settings cache after compliance update", error);
    }
    const after = await (0, investment_compliance_1.getInvestmentCompliance)();
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Before: configured [${before.configuredBlockList.join(", ") || "none"}], ` +
        `enforced [${before.effectiveBlockList.join(", ") || "none"}], ` +
        `accepted by ${(_h = (_g = (_a = before.acknowledgement) === null || _a === void 0 ? void 0 : _a.email) !== null && _g !== void 0 ? _g : (_b = before.acknowledgement) === null || _b === void 0 ? void 0 : _b.userId) !== null && _h !== void 0 ? _h : "nobody"}`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`After: configured [${after.configuredBlockList.join(", ") || "none"}], ` +
        `enforced [${after.effectiveBlockList.join(", ") || "none"}], ` +
        `accepted by ${(_k = (_j = (_c = after.acknowledgement) === null || _c === void 0 ? void 0 : _c.email) !== null && _j !== void 0 ? _j : (_d = after.acknowledgement) === null || _d === void 0 ? void 0 : _d.userId) !== null && _k !== void 0 ? _k : "nobody"}`);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(changes.join("; ") || "No change");
    return {
        message: after.pendingUnblocks.length > 0
            ? `Saved. ${after.pendingUnblocks.join(", ")} remain blocked until a Super Admin accepts the risk statement.`
            : "Investment territory gate updated.",
        configuredBlockList: after.configuredBlockList,
        effectiveBlockList: after.effectiveBlockList,
        defaultBlockList: investment_compliance_1.INVESTMENT_GEO_BLOCK_DEFAULT,
        pendingUnblocks: after.pendingUnblocks,
        acknowledged: after.acknowledged,
        acknowledgement: after.acknowledgement,
    };
};
