"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get All P2P Activity (Admin)",
    description: "Retrieves all P2P activity logs with pagination and filtering options for the admin dashboard.",
    operationId: "getAllAdminP2PActivity",
    tags: ["Admin", "Dashboard", "Activity", "P2P"],
    logModule: "ADMIN_P2P",
    logTitle: "Get All P2P Activities",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "page",
            in: "query",
            description: "Page number for pagination",
            required: false,
            schema: { type: "integer", default: 1 },
        },
        {
            index: 1,
            name: "limit",
            in: "query",
            description: "Number of items per page",
            required: false,
            schema: { type: "integer", default: 20, maximum: 100 },
        },
        {
            index: 2,
            name: "type",
            in: "query",
            description: "Filter by activity type",
            required: false,
            schema: { type: "string" },
        },
        {
            index: 3,
            name: "userId",
            in: "query",
            description: "Filter by user ID",
            required: false,
            schema: { type: "string" },
        },
        {
            index: 4,
            name: "startDate",
            in: "query",
            description: "Filter activities from this date",
            required: false,
            schema: { type: "string", format: "date-time" },
        },
        {
            index: 5,
            name: "endDate",
            in: "query",
            description: "Filter activities until this date",
            required: false,
            schema: { type: "string", format: "date-time" },
        },
    ],
    responses: {
        200: { description: "Activity logs retrieved successfully." },
        401: { description: "Unauthorized." },
        500: { description: "Internal Server Error." },
    },
    permission: "view.p2p.activity",
    demoMask: ["activities.user.email"],
};
function formatActionTitle(type) {
    const actionMap = {
        ADMIN_UPDATE: "Offer Updated",
        ADMIN_ADMIN_UPDATE: "Offer Updated",
        ADMIN_APPROVE: "Offer Approved",
        ADMIN_REJECT: "Offer Rejected",
        ADMIN_FLAG: "Offer Flagged",
        ADMIN_DISABLE: "Offer Disabled",
        ADMIN_OFFER_APPROVED: "Offer Approved",
        ADMIN_OFFER_REJECTED: "Offer Rejected",
        ADMIN_OFFER_FLAGGED: "Offer Flagged",
        ADMIN_OFFER_DISABLED: "Offer Disabled",
        ADMIN_OFFER_UPDATED: "Offer Updated",
        ADMIN_PAYMENT_METHOD: "Payment Method Updated",
        ADMIN_DISPUTE_UPDATE: "Dispute Updated",
        OFFER_APPROVED: "Offer Approved",
        OFFER_REJECTED: "Offer Rejected",
        OFFER_FLAGGED: "Offer Flagged",
        OFFER_DISABLED: "Offer Disabled",
        OFFER_CREATED: "Offer Created",
        OFFER_UPDATED: "Offer Updated",
        TRADE_STARTED: "Trade Started",
        TRADE_COMPLETED: "Trade Completed",
        TRADE_CANCELLED: "Trade Cancelled",
        TRADE_DISPUTED: "Trade Disputed",
    };
    return actionMap[type] || type.replace(/_/g, ' ').replace(/ADMIN /g, '').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}
function formatDescription(details, type, userName) {
    try {
        const data = typeof details === 'string' ? JSON.parse(details) : details;
        const updaterName = userName ||
            data.updatedBy || data.approvedBy || data.rejectedBy ||
            data.flaggedBy || data.disabledBy || data.adminName ||
            null;
        const addUpdaterName = (text) => {
            if (updaterName && updaterName !== 'undefined undefined' && updaterName.trim()) {
                return `${text} by ${updaterName}`;
            }
            return text;
        };
        if (type.includes("APPROVE")) {
            return addUpdaterName("Offer was approved");
        }
        if (type.includes("REJECT")) {
            const base = `Offer was rejected${data.reason ? `: ${data.reason}` : ""}`;
            return addUpdaterName(base);
        }
        if (type.includes("FLAG")) {
            const base = `Offer was flagged for review${data.reason ? `: ${data.reason}` : ""}`;
            return addUpdaterName(base);
        }
        if (type.includes("DISABLE")) {
            const base = `Offer was disabled${data.reason ? `: ${data.reason}` : ""}`;
            return addUpdaterName(base);
        }
        if (type.includes("UPDATE")) {
            const changes = [];
            if (data.currency)
                changes.push(`currency: ${data.currency}`);
            if (data.price)
                changes.push(`price: ${data.price}`);
            if (data.minAmount)
                changes.push(`min: ${data.minAmount}`);
            if (data.maxAmount)
                changes.push(`max: ${data.maxAmount}`);
            if (changes.length > 0) {
                return addUpdaterName(`Updated ${changes.join(", ")}`);
            }
            return addUpdaterName("Offer details were updated");
        }
        if (type.includes("PAYMENT_METHOD")) {
            const action = data.action || "updated";
            const methodName = data.name ? ` "${data.name}"` : "";
            return addUpdaterName(`Payment method${methodName} ${action}`);
        }
        if (type === "TRADE_STARTED") {
            return `New trade started for ${data.amount || "N/A"} ${data.currency || ""}`;
        }
        if (type === "TRADE_COMPLETED") {
            return `Trade completed successfully for ${data.amount || "N/A"} ${data.currency || ""}`;
        }
        if (type === "TRADE_DISPUTED") {
            return `Trade disputed: ${data.reason || "No reason provided"}`;
        }
        if (type.includes("DISPUTE")) {
            const statusText = data.status ? ` to ${data.status}` : "";
            return addUpdaterName(`Dispute updated${statusText}`);
        }
        const relevantData = [];
        if (data.amount)
            relevantData.push(`Amount: ${data.amount}`);
        if (data.currency)
            relevantData.push(`Currency: ${data.currency}`);
        if (data.status)
            relevantData.push(`Status: ${data.status}`);
        return relevantData.length > 0 ? relevantData.join(", ") : "Activity recorded";
    }
    catch (error) {
        return details || "Activity recorded";
    }
}
function getPriority(type) {
    if (type.includes("DISPUTE") || type.includes("FLAG"))
        return "high";
    if (type.includes("APPROVE") || type.includes("REJECT"))
        return "medium";
    return "low";
}
function getActivityIcon(type) {
    if (type.includes("TRADE"))
        return "trade";
    if (type.includes("DISPUTE"))
        return "dispute";
    if (type.includes("PAYMENT"))
        return "payment";
    if (type.includes("USER"))
        return "user";
    return "system";
}
exports.default = async (data) => {
    try {
        const { query, ctx } = data;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching all P2P activity logs");
        const page = parseInt(query.page) || 1;
        const limit = Math.min(parseInt(query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        const where = {};
        if (query.type) {
            where.type = query.type;
        }
        if (query.userId) {
            where.userId = query.userId;
        }
        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate) {
                where.createdAt[sequelize_1.Op.gte] = new Date(query.startDate);
            }
            if (query.endDate) {
                where.createdAt[sequelize_1.Op.lte] = new Date(query.endDate);
            }
        }
        const totalCount = await db_1.models.p2pActivityLog.count({ where });
        const activityLogs = await db_1.models.p2pActivityLog.findAll({
            where,
            order: [["createdAt", "DESC"]],
            limit,
            offset,
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
            ],
        });
        const activities = activityLogs.map((log) => {
            var _a, _b;
            const plainLog = log.get({ plain: true });
            const actorName = plainLog.user ? `${plainLog.user.firstName} ${plainLog.user.lastName}` : undefined;
            return {
                id: plainLog.id,
                type: getActivityIcon(plainLog.type),
                title: formatActionTitle(plainLog.type),
                description: formatDescription((_a = plainLog.details) !== null && _a !== void 0 ? _a : "", plainLog.type, actorName),
                createdAt: new Date((_b = plainLog.createdAt) !== null && _b !== void 0 ? _b : new Date()).toLocaleString(),
                status: "active",
                priority: getPriority(plainLog.type),
                relatedEntity: plainLog.relatedEntity,
                relatedEntityId: plainLog.relatedEntityId,
                user: plainLog.user ? {
                    id: plainLog.user.id,
                    firstName: plainLog.user.firstName || "Unknown",
                    lastName: plainLog.user.lastName || "User",
                    email: plainLog.user.email || "",
                    avatar: plainLog.user.avatar || "/placeholder.svg",
                } : {
                    id: plainLog.userId,
                    firstName: "System",
                    lastName: "User",
                    email: "",
                    avatar: "/placeholder.svg",
                },
            };
        });
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        ctx === null || ctx === void 0 ? void 0 : ctx.success("P2P activity logs retrieved successfully");
        return {
            activities,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasNextPage,
                hasPrevPage,
            },
        };
    }
    catch (err) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
