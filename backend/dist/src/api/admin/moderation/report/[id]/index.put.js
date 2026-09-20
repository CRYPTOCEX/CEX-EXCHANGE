"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const STATUSES = ["PENDING", "REVIEWING", "ACTIONED", "DISMISSED"];
const CLOSING = ["ACTIONED", "DISMISSED"];
exports.metadata = {
    summary: "Updates a content report",
    description: "Moves a content report through the review queue and records the outcome.",
    operationId: "updateContentReport",
    tags: ["Admin", "Moderation", "Report"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Report ID",
            required: true,
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
                        status: { type: "string", enum: [...STATUSES] },
                        resolution: {
                            type: "string",
                            description: "What was decided, and why. Required to close a report.",
                            maxLength: 2000,
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: {
        200: { description: "Report updated." },
        400: { description: "Unusable update." },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Content Report"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_BLOG",
    logTitle: "Update content report",
    permission: "edit.blog.comment",
};
exports.default = async (data) => {
    var _a;
    const { params, body, user, ctx } = data;
    const id = String((params === null || params === void 0 ? void 0 : params.id) || "").trim();
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const status = String((body === null || body === void 0 ? void 0 : body.status) || "").trim().toUpperCase();
    if (!STATUSES.includes(status)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Unknown report status." });
    }
    const resolution = String((_a = body === null || body === void 0 ? void 0 : body.resolution) !== null && _a !== void 0 ? _a : "")
        .trim()
        .slice(0, 2000);
    if (CLOSING.includes(status) && !resolution) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Say what was decided before closing a report. A closed case with no stated reason is indistinguishable from a cleared queue.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading the report");
    const report = await db_1.models.contentReport.findByPk(id);
    if (!report)
        throw (0, error_1.createError)({ statusCode: 404, message: "Report not found" });
    const closing = CLOSING.includes(status);
    await report.update({
        status: status,
        resolution: resolution || report.resolution,
        reviewedById: closing ? user.id : report.reviewedById,
        reviewedAt: closing ? new Date() : report.reviewedAt,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Content report ${id.slice(0, 8)}... -> ${status}`);
    return { message: "Report updated." };
};
