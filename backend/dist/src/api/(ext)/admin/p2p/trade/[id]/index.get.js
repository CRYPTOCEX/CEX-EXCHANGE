"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get P2P Trade Details (Admin)",
    description: "Retrieves detailed information about a specific trade.",
    operationId: "getAdminP2PTradeById",
    tags: ["Admin", "Trades", "P2P"],
    requiresAuth: true,
    logModule: "ADMIN_P2P",
    logTitle: "Get P2P Trade",
    demoMask: ["buyer.email", "seller.email"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Trade ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "Trade details retrieved successfully." },
        401: { description: "Unauthorized." },
        404: { description: "Trade not found." },
        500: { description: "Internal Server Error." },
    },
    permission: "view.p2p.trade",
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { params, ctx } = data;
    const { id } = params;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
        const trade = await db_1.models.p2pTrade.findByPk(id, {
            include: [
                {
                    association: "buyer",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
                {
                    association: "seller",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
                {
                    association: "offer",
                    attributes: ["id", "type", "currency", "amountConfig", "priceConfig"],
                },
                {
                    association: "dispute",
                },
                {
                    association: "paymentMethodDetails",
                    attributes: ["id", "name", "instructions", "icon"],
                },
            ],
        });
        if (!trade)
            throw (0, error_1.createError)({ statusCode: 404, message: "Trade not found" });
        const tradeData = trade.toJSON();
        const getInitials = (user) => {
            var _a, _b;
            if (!user)
                return "?";
            const first = ((_a = user.firstName) === null || _a === void 0 ? void 0 : _a.charAt(0)) || "";
            const last = ((_b = user.lastName) === null || _b === void 0 ? void 0 : _b.charAt(0)) || "";
            return (first + last).toUpperCase() || "?";
        };
        const getFullName = (user) => {
            if (!user)
                return "Unknown";
            return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown";
        };
        let timelineData = tradeData.timeline;
        if (typeof timelineData === 'string') {
            try {
                timelineData = JSON.parse(timelineData);
            }
            catch (e) {
                console_1.logger.error("P2P", "Failed to parse timeline JSON", e);
                timelineData = [];
            }
        }
        if (!Array.isArray(timelineData)) {
            timelineData = [];
        }
        const formattedTimeline = timelineData
            .filter((event) => {
            const eventType = event.event || event.type || "";
            return eventType !== "MESSAGE";
        })
            .map((event) => {
            const eventType = event.event || event.type || "Event";
            const formattedEvent = eventType
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());
            return {
                event: formattedEvent,
                type: eventType,
                timestamp: event.timestamp || event.createdAt || new Date().toISOString(),
                details: event.message || event.details || "",
                userId: event.userId || null,
                adminName: event.adminName || null,
            };
        });
        const formattedMessages = timelineData
            .filter((event) => event.event === "MESSAGE" || event.type === "MESSAGE")
            .map((event) => {
            var _a, _b, _c, _d, _e, _f;
            let senderName = event.senderName || "Unknown";
            let avatar = null;
            let isAdmin = event.isAdminMessage || false;
            if (event.senderId === ((_a = tradeData.buyer) === null || _a === void 0 ? void 0 : _a.id)) {
                senderName = getFullName(tradeData.buyer);
                avatar = (_c = (_b = tradeData.buyer) === null || _b === void 0 ? void 0 : _b.avatar) !== null && _c !== void 0 ? _c : null;
            }
            else if (event.senderId === ((_d = tradeData.seller) === null || _d === void 0 ? void 0 : _d.id)) {
                senderName = getFullName(tradeData.seller);
                avatar = (_f = (_e = tradeData.seller) === null || _e === void 0 ? void 0 : _e.avatar) !== null && _f !== void 0 ? _f : null;
            }
            else if (event.senderName) {
                senderName = event.senderName;
            }
            return {
                id: event.id || `msg-${event.createdAt || Date.now()}`,
                sender: senderName,
                senderId: event.senderId || null,
                content: event.message || event.details || "",
                timestamp: new Date(event.createdAt || event.timestamp).toLocaleString(),
                avatar: avatar,
                isAdmin: isAdmin,
                attachments: event.attachments || [],
            };
        });
        const disputeData = tradeData.dispute || null;
        const priceCurrency = ((_b = (_a = tradeData.offer) === null || _a === void 0 ? void 0 : _a.priceConfig) === null || _b === void 0 ? void 0 : _b.currency) || 'USD';
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Trade details retrieved successfully");
        return {
            ...tradeData,
            crypto: tradeData.currency,
            fiatValue: tradeData.total ? `${tradeData.total} ${priceCurrency}` : "N/A",
            escrowFee: tradeData.escrowFee || "0",
            timeRemaining: null,
            buyer: {
                id: (_c = tradeData.buyer) === null || _c === void 0 ? void 0 : _c.id,
                name: getFullName(tradeData.buyer),
                initials: getInitials(tradeData.buyer),
                avatar: (_d = tradeData.buyer) === null || _d === void 0 ? void 0 : _d.avatar,
                email: (_e = tradeData.buyer) === null || _e === void 0 ? void 0 : _e.email,
            },
            seller: {
                id: (_f = tradeData.seller) === null || _f === void 0 ? void 0 : _f.id,
                name: getFullName(tradeData.seller),
                initials: getInitials(tradeData.seller),
                avatar: (_g = tradeData.seller) === null || _g === void 0 ? void 0 : _g.avatar,
                email: (_h = tradeData.seller) === null || _h === void 0 ? void 0 : _h.email,
            },
            timeline: formattedTimeline,
            messages: formattedMessages,
            disputeId: (disputeData === null || disputeData === void 0 ? void 0 : disputeData.id) || null,
            disputeReason: (disputeData === null || disputeData === void 0 ? void 0 : disputeData.reason) || null,
            disputeDetails: (disputeData === null || disputeData === void 0 ? void 0 : disputeData.details) || null,
            disputeEvidence: (disputeData === null || disputeData === void 0 ? void 0 : disputeData.evidence) || null,
            disputeFiledBy: (disputeData === null || disputeData === void 0 ? void 0 : disputeData.reportedById) || null,
        };
    }
    catch (err) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
function calculateTimeRemaining(expiresAt) {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    if (diff <= 0)
        return "Expired";
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0)
        return `${days}d ${hours % 24}h`;
    if (hours > 0)
        return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
}
