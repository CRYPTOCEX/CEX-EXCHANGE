"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists the customer's TransFi virtual IBANs",
    description: "Returns the permanent bank details issued to this customer. Served from local storage, which is authoritative for display; optionally refreshes status from TransFi.",
    operationId: "listTransfiIbans",
    tags: ["Finance", "Deposit", "TransFi"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "refresh",
            in: "query",
            description: "Set to 'true' to re-read status from TransFi",
            required: false,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "IBAN list", content: { "application/json": { schema: { type: "object" } } } },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const rows = await db_1.models.transfiIban.findAll({
        where: { userId: user.id },
        order: [["createdAt", "ASC"]],
    });
    if (String((query === null || query === void 0 ? void 0 : query.refresh) || "") === "true" && rows.length) {
        try {
            const res = await (0, utils_1.transfiRequest)("/v3/iban/list-iban", {
                query: { limit: 100 },
            });
            const remote = Array.isArray(res === null || res === void 0 ? void 0 : res.data) ? res.data : [];
            for (const row of rows) {
                const hit = remote.find((r) => r.ibId === row.ibId);
                if ((hit === null || hit === void 0 ? void 0 : hit.status) && hit.status !== row.status) {
                    await row.update({ status: hit.status, lastSyncedAt: new Date() });
                }
            }
        }
        catch (error) {
            console_1.logger.warn("TRANSFI", `IBAN refresh failed for ${user.id}: ${error === null || error === void 0 ? void 0 : error.message}`);
        }
    }
    return {
        success: true,
        data: rows.map((r) => ({
            ibId: r.ibId,
            currency: r.currency,
            iban: r.iban,
            bic: r.bic,
            accountNumber: r.accountNumber,
            bankName: r.bankName,
            bankAddress: r.bankAddress,
            accountHolderName: r.accountHolderName,
            status: r.status,
        })),
    };
};
