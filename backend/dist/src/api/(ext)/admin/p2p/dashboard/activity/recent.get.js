"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Recent Activity (Admin)",
    description: "Retrieves a list of recent activity logs for the admin dashboard.",
    operationId: "getRecentAdminP2PActivity",
    tags: ["Admin", "Dashboard", "Activity", "P2P"],
    logModule: "ADMIN_P2P",
    logTitle: "Get Recent P2P Activities",
    requiresAuth: true,
    responses: {
        200: { description: "Recent activity logs retrieved successfully." },
        401: { description: "Unauthorized." },
        500: { description: "Internal Server Error." },
    },
    permission: "view.p2p.activity",
    demoMask: ["user.email"],
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
exports.default = async (data) => {
    try {
        const activityLogs = await db_1.models.p2pActivityLog.findAll({
            order: [["createdAt", "DESC"]],
            limit: 5,
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
            ],
        });
        const recentActivity = activityLogs.map((log) => {
            var _a, _b;
            const plainLog = log.get({ plain: true });
            const actorName = plainLog.user ? `${plainLog.user.firstName} ${plainLog.user.lastName}` : undefined;
            return {
                id: plainLog.id,
                type: plainLog.type.includes("TRADE") ? "trade" :
                    plainLog.type.includes("DISPUTE") ? "dispute" :
                        plainLog.type.includes("PAYMENT") ? "payment" :
                            plainLog.type.includes("USER") ? "user" : "system",
                title: formatActionTitle(plainLog.type),
                description: formatDescription((_a = plainLog.details) !== null && _a !== void 0 ? _a : "", plainLog.type, actorName),
                createdAt: new Date((_b = plainLog.createdAt) !== null && _b !== void 0 ? _b : new Date()).toLocaleString(),
                status: "active",
                priority: getPriority(plainLog.type),
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
        return recentActivity;
    }
    catch (err) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
