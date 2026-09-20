"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const investment_compliance_1 = require("@b/utils/investment-compliance");
exports.metadata = {
    summary: "Reads the investment territory-gate state",
    description: "Returns the configured block list, the list actually enforced, the recorded risk acknowledgement, and any territories the operator asked to unblock that are still blocked for want of one.",
    operationId: "getInvestmentCompliance",
    tags: ["Admin", "Finance", "Investment", "Compliance"],
    requiresAuth: true,
    permission: "view.investment",
    responses: {
        200: {
            description: "Investment compliance state",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            configuredBlockList: { type: "array", items: { type: "string" } },
                            effectiveBlockList: { type: "array", items: { type: "string" } },
                            defaultBlockList: { type: "array", items: { type: "string" } },
                            pendingUnblocks: { type: "array", items: { type: "string" } },
                            acknowledged: { type: "boolean" },
                            acknowledgement: { type: "object", nullable: true },
                            statement: { type: "string" },
                            statementVersion: { type: "string" },
                            canAcknowledge: { type: "boolean" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const compliance = await (0, investment_compliance_1.getInvestmentCompliance)();
    const userPk = await db_1.models.user.findByPk(user.id, {
        include: [{ model: db_1.models.role, as: "role" }],
    });
    const canAcknowledge = !!(userPk === null || userPk === void 0 ? void 0 : userPk.role) && userPk.role.name === "Super Admin";
    return {
        configuredBlockList: compliance.configuredBlockList,
        effectiveBlockList: compliance.effectiveBlockList,
        defaultBlockList: investment_compliance_1.INVESTMENT_GEO_BLOCK_DEFAULT,
        pendingUnblocks: compliance.pendingUnblocks,
        acknowledged: compliance.acknowledged,
        acknowledgement: compliance.acknowledgement,
        statement: investment_compliance_1.INVESTMENT_RISK_STATEMENT,
        statementVersion: investment_compliance_1.INVESTMENT_RISK_STATEMENT_VERSION,
        canAcknowledge,
    };
};
