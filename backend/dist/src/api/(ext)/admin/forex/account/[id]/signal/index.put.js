"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Sets the signals assigned to a Forex account",
    description: "Replaces the set of Forex signals assigned to an account. Pass the complete list of signal IDs the account should be subscribed to; any not listed are unassigned.",
    operationId: "setForexAccountSignals",
    tags: ["Admin", "Forex", "Account", "Signal"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "The forex account ID",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        signalIds: {
                            type: "array",
                            items: { type: "string" },
                            description: "The complete set of signal IDs this account should be subscribed to",
                        },
                    },
                    required: ["signalIds"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Signals assigned successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            assigned: { type: "number" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Account"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.forex.account",
    logModule: "ADMIN_FOREX",
    logTitle: "Assign forex signals to account",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    const { id } = params;
    const { signalIds } = body;
    if (!Array.isArray(signalIds)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "signalIds must be an array of signal IDs",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating forex account ${id}`);
    const account = await db_1.models.forexAccount.findByPk(id);
    if (!account) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Forex account not found" });
    }
    const unique = [...new Set(signalIds.map(String))];
    if (unique.length) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating the signals exist");
        const found = await db_1.models.forexSignal.findAll({
            where: { id: { [sequelize_1.Op.in]: unique } },
            attributes: ["id"],
        });
        if (found.length !== unique.length) {
            const known = new Set(found.map((s) => s.id));
            const missing = unique.filter((s) => !known.has(s));
            throw (0, error_1.createError)({
                statusCode: 404,
                message: `Unknown signal${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Assigning ${unique.length} signal(s) to the account`);
    await db_1.sequelize.transaction(async (t) => {
        await db_1.models.forexAccountSignal.destroy({
            where: { forexAccountId: id },
            transaction: t,
            force: true,
        });
        if (unique.length) {
            await db_1.models.forexAccountSignal.bulkCreate(unique.map((signalId) => ({ forexAccountId: id, forexSignalId: signalId })), { transaction: t });
        }
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(unique.length
        ? `Assigned ${unique.length} signal(s) to forex account ${id}`
        : `Cleared all signals from forex account ${id}`);
    return {
        message: unique.length
            ? `${unique.length} signal${unique.length === 1 ? "" : "s"} assigned.`
            : "All signals unassigned.",
        assigned: unique.length,
    };
};
