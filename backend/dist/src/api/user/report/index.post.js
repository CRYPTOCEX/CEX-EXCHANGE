"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const TARGET_TYPES = [
    "BLOG_COMMENT",
    "BLOG_POST",
    "NFT_LISTING",
    "USER_PROFILE",
    "SUPPORT_TICKET",
];
const REASONS = [
    "SPAM",
    "ABUSIVE_CONDUCT",
    "HATE_SPEECH",
    "SEXUAL_CONTENT",
    "VIOLENCE",
    "SCAM_OR_FRAUD",
    "IMPERSONATION",
    "OTHER",
];
const MIN_DETAILS = 20;
const MAX_DETAILS = 2000;
const DAILY_LIMIT = 10;
async function resolveTarget(targetType, targetId, reporterId) {
    var _a, _b, _c;
    switch (targetType) {
        case "BLOG_COMMENT": {
            const row = await db_1.models.comment.findByPk(targetId, {
                attributes: ["id", "userId"],
            });
            return row ? { ownerId: (_a = row.userId) !== null && _a !== void 0 ? _a : null } : null;
        }
        case "BLOG_POST": {
            const row = await db_1.models.post.findByPk(targetId, {
                attributes: ["id", "authorId"],
            });
            return row ? { ownerId: (_b = row.authorId) !== null && _b !== void 0 ? _b : null } : null;
        }
        case "USER_PROFILE": {
            const row = await db_1.models.user.findByPk(targetId, { attributes: ["id"] });
            return row ? { ownerId: targetId } : null;
        }
        case "SUPPORT_TICKET": {
            const row = await db_1.models.supportTicket.findByPk(targetId, {
                attributes: ["id", "userId"],
            });
            if (!row || row.userId !== reporterId)
                return null;
            return { ownerId: null };
        }
        case "NFT_LISTING": {
            const listing = db_1.models.nftListing;
            if (!listing)
                return null;
            const row = await listing.findByPk(targetId, {
                attributes: ["id", "sellerId"],
            });
            return row ? { ownerId: (_c = row.sellerId) !== null && _c !== void 0 ? _c : null } : null;
        }
        default:
            return null;
    }
}
exports.metadata = {
    summary: "Report a piece of content",
    description: "Files a complaint about a comment, post, listing or profile for an operator to review. The reported content stays visible until a human acts on it.",
    operationId: "reportContent",
    tags: ["User", "Report"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Report content",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        targetType: { type: "string", enum: [...TARGET_TYPES] },
                        targetId: { type: "string" },
                        reason: { type: "string", enum: [...REASONS] },
                        details: { type: "string" },
                    },
                    required: ["targetType", "targetId", "reason", "details"],
                },
            },
        },
    },
    responses: {
        200: { description: "Report filed." },
        400: { description: "Unusable report." },
        401: query_1.unauthorizedResponse,
        404: { description: "No such content." },
        409: { description: "You already have an open report on this item." },
        429: { description: "Too many reports today." },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const targetType = String((body === null || body === void 0 ? void 0 : body.targetType) || "").trim().toUpperCase();
    if (!TARGET_TYPES.includes(targetType)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Unknown content type." });
    }
    const targetId = String((body === null || body === void 0 ? void 0 : body.targetId) || "").trim();
    if (!targetId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Content id is required." });
    }
    const reason = String((body === null || body === void 0 ? void 0 : body.reason) || "").trim().toUpperCase();
    if (!REASONS.includes(reason)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Pick a reason for the report.",
        });
    }
    const details = String((_a = body === null || body === void 0 ? void 0 : body.details) !== null && _a !== void 0 ? _a : "").trim().slice(0, MAX_DETAILS);
    if (details.length < MIN_DETAILS) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Say what is wrong with it — at least ${MIN_DETAILS} characters. A reviewer acts on what you write here.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving the reported content");
    const target = await resolveTarget(targetType, targetId, user.id);
    if (!target) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "That content no longer exists.",
        });
    }
    if (target.ownerId && target.ownerId === user.id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "That is your own content.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking the report guards");
    const open = await db_1.models.contentReport.findOne({
        attributes: ["id"],
        where: {
            reporterId: user.id,
            targetType,
            targetId,
            status: { [sequelize_1.Op.in]: ["PENDING", "REVIEWING"] },
        },
    });
    if (open) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "You already have a report on this waiting to be read. Anything else you have learned " +
                "is worth adding to that one rather than opening a second.",
        });
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayCount = await db_1.models.contentReport.count({
        where: { reporterId: user.id, createdAt: { [sequelize_1.Op.gte]: since } },
    });
    if (todayCount >= DAILY_LIMIT) {
        throw (0, error_1.createError)({
            statusCode: 429,
            message: `You have filed ${DAILY_LIMIT} reports in the last day. Try again tomorrow.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Filing the report");
    await db_1.models.contentReport.create({
        reporterId: user.id,
        targetType: targetType,
        targetId,
        targetOwnerId: target.ownerId,
        reason: reason,
        details,
        status: "PENDING",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Report filed on ${targetType}`);
    return {
        message: "Report filed. A reviewer reads every report — you will not get a reply on each one.",
    };
};
