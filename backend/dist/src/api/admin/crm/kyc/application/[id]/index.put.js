"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const decision_1 = require("../decision");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates an existing KYC application",
    operationId: "updateKycApplication",
    tags: ["Admin", "CRM", "KYC"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the KYC application to update",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the KYC application",
        content: {
            "application/json": {
                schema: utils_1.kycUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("KYC Application"),
    requiresAuth: true,
    permission: "edit.kyc.application",
    logModule: "ADMIN_CRM",
    logTitle: "Update KYC application",
};
exports.default = async (req) => {
    const { body, params, ctx } = req;
    const { id } = params;
    const { status, adminNotes } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating KYC application ${id}`);
    if (adminNotes !== undefined) {
        if (typeof adminNotes !== "string") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Admin notes must be a string",
            });
        }
        if (adminNotes.length > 5000) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Admin notes cannot exceed 5000 characters",
            });
        }
        const sanitizedNotes = sanitizeAdminNotes(adminNotes);
        if (sanitizedNotes !== adminNotes) {
            console.warn("Admin notes contained potentially dangerous content and were sanitized");
        }
        body.adminNotes = sanitizedNotes;
    }
    if (status !== undefined && !decision_1.KYC_DECISION_STATUSES.includes(status)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Invalid status. Must be one of: ${decision_1.KYC_DECISION_STATUSES.join(", ")}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching KYC application");
    const kycApplication = await db_1.models.kycApplication.findByPk(id, {
        include: [{ model: db_1.models.user, as: "user" }],
    });
    if (!kycApplication)
        throw (0, error_1.createError)(404, "KYC application not found");
    const oldStatus = kycApplication.status;
    await (0, decision_1.applyKycDecision)({
        application: kycApplication,
        status: (status !== null && status !== void 0 ? status : oldStatus),
        adminNotes: body.adminNotes,
        decidedBy: "admin",
        ctx,
    });
    return {
        message: "KYC application updated successfully",
    };
};
function sanitizeAdminNotes(notes) {
    if (!notes)
        return "";
    let sanitized = notes.replace(/<[^>]*>/g, "");
    sanitized = sanitized.replace(/javascript:/gi, "");
    sanitized = sanitized.replace(/on\w+\s*=/gi, "");
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gis, "");
    sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, "");
    sanitized = sanitized.replace(/\s+/g, " ").trim();
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    return sanitized;
}
