"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("../../utils");
const notifications_1 = require("@b/utils/notifications");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Manage ICO Offering",
    description: "Performs an admin action on an ICO offering. The action is determined by the 'action' query parameter, which accepts one of: approve, flag, pause, reject, resume, or unflag. Depending on the action, the offering’s status is updated, admin activity is logged, and an email and in‑app notification is sent to the project owner if applicable.",
    operationId: "manageIcoOffering",
    tags: ["ICO", "Admin", "Offerings"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: {
                type: "string",
                description: "The ID of the ICO offering.",
            },
        },
        {
            index: 1,
            name: "action",
            in: "query",
            required: true,
            schema: {
                type: "string",
                enum: ["approve", "flag", "pause", "reject", "resume", "unflag"],
                description: "The admin action to perform on the ICO offering. Allowed values: approve, flag, pause, reject, resume, unflag.",
            },
        },
    ],
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        notes: {
                            type: "string",
                            description: "Optional notes for the action (required for rejection, optional for flagging).",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "ICO offering updated successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            offering: { type: "object" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized – Admin authentication required." },
        404: {
            description: "ICO offering not found or the current status is invalid for the requested action.",
        },
        500: { description: "Internal Server Error" },
    },
    permission: "edit.ico.offer",
    logModule: "ADMIN_ICO",
    logTitle: "Manage ICO Offering",
};
const offeringActions = {
    approve: async (offering, now, body) => {
        if (offering.status !== "PENDING") {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "ICO offering not found or not pending.",
            });
        }
        await offering.update({ status: "ACTIVE", approvedAt: now });
        return {
            emailTemplate: "IcoOfferingApproved",
            emailData: {
                OFFERING_NAME: offering.name,
                APPROVED_AT: now.toLocaleString(),
            },
            message: "ICO offering approved successfully.",
        };
    },
    flag: async (offering, now, body) => {
        if (offering.isFlagged) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Offering is already flagged.",
            });
        }
        await offering.update({ isFlagged: true });
        return {
            emailTemplate: "IcoOfferingFlagged",
            emailData: {
                OFFERING_NAME: offering.name,
                FLAG_REASON: (body === null || body === void 0 ? void 0 : body.notes) || "No additional reason provided",
            },
            message: "ICO offering flagged successfully.",
        };
    },
    pause: async (offering, now, body) => {
        if (offering.status !== "ACTIVE") {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "ICO offering not found or not active.",
            });
        }
        await offering.update({ isPaused: true });
        return {
            message: "ICO offering paused successfully.",
        };
    },
    reject: async (offering, now, body) => {
        if (offering.status !== "PENDING") {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "ICO offering not found or not pending.",
            });
        }
        if (!(body === null || body === void 0 ? void 0 : body.notes) || !body.notes.trim()) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Rejection notes are required.",
            });
        }
        await offering.update({
            status: "REJECTED",
            rejectedAt: now,
            reviewNotes: body.notes,
        });
        return {
            emailTemplate: "IcoOfferingRejected",
            emailData: {
                OFFERING_NAME: offering.name,
                REJECTION_REASON: body.notes,
            },
            message: "ICO offering rejected successfully.",
        };
    },
    resume: async (offering, now, body) => {
        if (offering.status !== "ACTIVE" || !offering.isPaused) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "ICO offering not found or not paused.",
            });
        }
        await offering.update({ isPaused: false });
        return {
            message: "ICO offering resumed successfully.",
        };
    },
    unflag: async (offering, now, body) => {
        if (!offering.isFlagged) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Offering is not flagged.",
            });
        }
        await offering.update({ isFlagged: false });
        return {
            emailTemplate: "IcoOfferingUnflagged",
            emailData: {
                OFFERING_NAME: offering.name,
            },
            message: "ICO offering unflagged successfully.",
        };
    },
};
const notifMapping = {
    approve: {
        title: "Offering Approved",
        message: (name) => `Your ICO offering "${name}" has been approved.`,
        details: (now) => `Your offering was approved on ${now.toLocaleString()}.`,
    },
    flag: {
        title: "Offering Flagged",
        message: (name) => `Your ICO offering "${name}" has been flagged.`,
        details: (emailData) => `Your offering has been flagged for review. Reason: ${emailData.FLAG_REASON}.`,
    },
    reject: {
        title: "Offering Rejected",
        message: (name) => `Your ICO offering "${name}" has been rejected.`,
        details: (emailData) => `Your offering was rejected. Reason: ${emailData.REJECTION_REASON}.`,
    },
    unflag: {
        title: "Offering Unflagged",
        message: (name) => `Your ICO offering "${name}" has been unflagged.`,
        details: () => `The flag has been removed from your offering.`,
    },
    pause: {
        title: "Offering Paused",
        message: (name) => `Your ICO offering "${name}" has been paused.`,
        details: () => `Your offering has been paused.`,
    },
    resume: {
        title: "Offering Resumed",
        message: (name) => `Your ICO offering "${name}" has been resumed.`,
        details: () => `Your offering has been resumed.`,
    },
};
exports.default = async (data) => {
    const { params, query, body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: Admin privileges required.",
        });
    }
    const offeringId = params.id;
    const action = (query.action || "").toLowerCase();
    const allowedActions = [
        "approve",
        "flag",
        "pause",
        "reject",
        "resume",
        "unflag",
    ];
    if (!allowedActions.includes(action)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid or missing action. Allowed actions: approve, flag, pause, reject, resume, unflag.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching ICO offering for action: ${action}`);
    const offering = await db_1.models.icoTokenOffering.findOne({
        where: { id: offeringId },
    });
    if (!offering) {
        throw (0, error_1.createError)({ statusCode: 404, message: "ICO offering not found." });
    }
    const now = new Date();
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing action: ${action}`);
    let result;
    try {
        result = await offeringActions[action](offering, now, body);
    }
    catch (err) {
        throw (0, error_1.createError)({
            statusCode: err.statusCode || 500,
            message: err.message,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging admin activity");
    await db_1.models.icoAdminActivity.create({
        type: action,
        offeringId: offering.id,
        offeringName: offering.name,
        adminId: user.id,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending email and notifications");
    const owner = await db_1.models.user.findByPk(offering.userId);
    const sendEmailIfNeeded = async (templateName, recipient, dataObj) => {
        if (recipient === null || recipient === void 0 ? void 0 : recipient.email) {
            try {
                await (0, utils_1.sendIcoEmail)(templateName, recipient.email, dataObj, ctx);
            }
            catch (emailErr) {
                console_1.logger.error("ADMIN_ICO_OFFER", `Failed to send ${templateName} email`, emailErr);
            }
        }
    };
    if (result.emailTemplate && owner) {
        const emailData = {
            ...result.emailData,
            PROJECT_OWNER_NAME: `${owner.firstName} ${owner.lastName}`,
        };
        await sendEmailIfNeeded(result.emailTemplate, owner, emailData);
    }
    if (owner && notifMapping[action]) {
        const notif = notifMapping[action];
        try {
            await (0, notifications_1.createNotification)({
                userId: owner.id,
                relatedId: offering.id,
                type: "system",
                title: notif.title,
                message: notif.message(offering.name),
                details: typeof notif.details === "function"
                    ? notif.details(result.emailData || now)
                    : "",
                link: `/ico/creator/token/${offering.id}`,
                actions: [
                    {
                        label: "View Offering",
                        link: `/ico/creator/token/${offering.id}`,
                        primary: true,
                    },
                ],
            }, ctx);
        }
        catch (notifErr) {
            console_1.logger.error("ADMIN_ICO_OFFER", `Failed to create in-app notification for action ${action}`, notifErr);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching updated offering data");
    const updatedOffering = await db_1.models.icoTokenOffering.findOne({
        where: { id: offeringId },
        include: [
            {
                model: db_1.models.icoTokenDetail,
                as: "tokenDetail",
                include: [{ model: db_1.models.icoTokenType, as: "tokenTypeData" }]
            },
            { model: db_1.models.icoLaunchPlan, as: "plan" },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`ICO offering ${action} action completed successfully`);
    return {
        message: result.message || "ICO offering updated successfully.",
        offering: updatedOffering,
    };
};
