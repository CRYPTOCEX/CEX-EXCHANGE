"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Add evidence to P2P dispute",
    description: "Uploads and attaches evidence files (images only) to a P2P dispute. Evidence is stored with admin information and timestamps for audit trail.",
    operationId: "addEvidenceToAdminP2PDispute",
    tags: ["Admin", "P2P", "Dispute"],
    requiresAuth: true,
    logModule: "ADMIN_P2P",
    logTitle: "Add evidence to dispute",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Dispute ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "Evidence data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        fileUrl: { type: "string" },
                        fileName: { type: "string" },
                        fileType: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                    },
                    required: ["fileUrl", "fileName"],
                },
            },
        },
    },
    responses: {
        200: { description: "Evidence added successfully." },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Resource"),
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.p2p.dispute",
};
exports.default = async (data) => {
    const { params, body, user, ctx } = data;
    const { id } = params;
    const { fileUrl, fileName, fileType, title, description } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching dispute");
        const dispute = await db_1.models.p2pDispute.findByPk(id, {
            include: [
                {
                    model: db_1.models.p2pTrade,
                    as: "trade",
                    include: [
                        {
                            model: db_1.models.p2pOffer,
                            as: "offer",
                            attributes: ["id", "type", "currency", "walletType"],
                        },
                        {
                            model: db_1.models.user,
                            as: "buyer",
                            attributes: ["id", "firstName", "lastName", "email", "avatar"],
                        },
                        {
                            model: db_1.models.user,
                            as: "seller",
                            attributes: ["id", "firstName", "lastName", "email", "avatar"],
                        },
                    ],
                },
                {
                    model: db_1.models.user,
                    as: "reportedBy",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
                {
                    model: db_1.models.user,
                    as: "against",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
            ],
        });
        if (!dispute) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Dispute not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Dispute not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating file type");
        const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
        if (fileType && !allowedImageTypes.includes(fileType.toLowerCase())) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid file type");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Only image files are allowed (JPEG, PNG, GIF, WebP)"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding evidence");
        let existingEvidence = dispute.evidence;
        if (typeof existingEvidence === "string") {
            try {
                existingEvidence = JSON.parse(existingEvidence);
            }
            catch (_a) {
                existingEvidence = [];
            }
        }
        if (!Array.isArray(existingEvidence)) {
            existingEvidence = [];
        }
        const adminName = user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.email || "Admin";
        existingEvidence.push({
            fileUrl,
            fileName,
            fileType,
            title: title || fileName,
            description: description || "",
            submittedBy: "admin",
            adminId: user.id,
            adminName,
            createdAt: new Date().toISOString(),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving dispute");
        dispute.evidence = existingEvidence;
        await dispute.save();
        const plainDispute = dispute.get({ plain: true });
        const messages = Array.isArray(plainDispute.messages) ? plainDispute.messages.map((msg) => ({
            id: msg.id || `${msg.createdAt}-${msg.sender}`,
            sender: msg.senderName || msg.sender || "Unknown",
            senderId: msg.sender,
            content: msg.content || msg.message || "",
            timestamp: msg.createdAt || msg.timestamp,
            isAdmin: msg.isAdmin || false,
            avatar: msg.avatar,
            senderInitials: msg.senderName ? msg.senderName.split(" ").map((n) => n[0]).join("").toUpperCase() : "?",
        })) : [];
        const activityLog = Array.isArray(plainDispute.activityLog) ? plainDispute.activityLog : [];
        const adminNotes = activityLog
            .filter((entry) => entry.type === "note")
            .map((entry) => ({
            content: entry.content || entry.note,
            createdAt: entry.createdAt,
            createdBy: entry.adminName || "Admin",
            adminId: entry.adminId,
        }));
        const evidence = Array.isArray(plainDispute.evidence) ? plainDispute.evidence.map((e) => ({
            ...e,
            submittedBy: e.submittedBy || "admin",
            timestamp: e.createdAt || e.timestamp,
        })) : [];
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Evidence added successfully");
        return {
            ...plainDispute,
            messages,
            adminNotes,
            evidence,
        };
    }
    catch (err) {
        if (err.statusCode) {
            throw err;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to add evidence");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
