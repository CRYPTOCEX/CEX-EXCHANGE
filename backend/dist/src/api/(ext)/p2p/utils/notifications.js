"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyTradeEvent = notifyTradeEvent;
exports.notifyAdmins = notifyAdmins;
exports.notifyOfferEvent = notifyOfferEvent;
exports.notifyReputationEvent = notifyReputationEvent;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const notification_1 = require("@b/services/notification");
async function notifyTradeEvent(tradeId, event, data, ctx) {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Notifying trade event: ${event} for trade ${tradeId}`);
        const trade = await db_1.models.p2pTrade.findByPk(tradeId, {
            include: [
                { model: db_1.models.user, as: "buyer", attributes: ["id", "email", "firstName", "lastName"] },
                { model: db_1.models.user, as: "seller", attributes: ["id", "email", "firstName", "lastName"] },
            ],
        });
        if (!trade) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, `Trade ${tradeId} not found`);
            console_1.logger.error("P2P_NOTIF", `Trade ${tradeId} not found for notification`);
            return;
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Determining notification recipients");
        const recipients = await getRecipientsForEvent(trade, event, data);
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, `Sending notifications to ${recipients.length} recipient(s)`);
        for (const recipient of recipients) {
            try {
                const channels = getChannelsForEvent(event, recipient.sendEmail);
                await notification_1.notificationService.send({
                    userId: recipient.userId,
                    type: "TRADE",
                    channels,
                    data: {
                        title: recipient.title,
                        message: recipient.message,
                        link: `/p2p/trade/${tradeId}`,
                        relatedId: tradeId,
                    },
                    priority: getEventPriority(event),
                    idempotencyKey: `p2p-${event}-${tradeId}-${recipient.userId}`,
                });
                (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, `Notification sent to user ${recipient.userId}`);
            }
            catch (notifError) {
                console_1.logger.error("P2P_NOTIF", `Failed to create notification for user ${recipient.userId}`, notifError);
            }
        }
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _f === void 0 ? void 0 : _f.call(ctx, `Trade event notifications sent successfully for ${event}`);
    }
    catch (error) {
        (_g = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _g === void 0 ? void 0 : _g.call(ctx, error.message || `Failed to send trade notification for ${event}`);
        console_1.logger.error("P2P_NOTIF", `Failed to send trade notification for ${event}`, error);
    }
}
async function getRecipientsForEvent(trade, event, data) {
    const recipients = [];
    switch (event) {
        case "TRADE_INITIATED":
            const initiatorIsBuyer = data.initiatorId === trade.buyer.id;
            const otherParty = initiatorIsBuyer ? trade.seller : trade.buyer;
            recipients.push({
                userId: otherParty.id,
                email: otherParty.email,
                userName: `${otherParty.firstName} ${otherParty.lastName}`,
                title: "New P2P Trade Request",
                message: `You have a new trade request for ${data.amount} ${data.currency}`,
                sendEmail: true,
            });
            break;
        case "PAYMENT_CONFIRMED":
            recipients.push({
                userId: trade.seller.id,
                email: trade.seller.email,
                userName: `${trade.seller.firstName} ${trade.seller.lastName}`,
                title: "Payment Confirmed",
                message: `Buyer has confirmed payment for ${data.amount} ${data.currency}. Please verify and release funds.`,
                sendEmail: true,
            });
            break;
        case "ESCROW_RELEASED":
            recipients.push({
                userId: trade.buyer.id,
                email: trade.buyer.email,
                userName: `${trade.buyer.firstName} ${trade.buyer.lastName}`,
                title: "Funds Released",
                message: `Seller has released ${data.amount} ${data.currency} to your wallet.`,
                sendEmail: true,
            });
            break;
        case "TRADE_COMPLETED":
            recipients.push({
                userId: trade.buyer.id,
                email: trade.buyer.email,
                userName: `${trade.buyer.firstName} ${trade.buyer.lastName}`,
                title: "Trade Completed",
                message: `Your trade for ${data.amount} ${data.currency} has been completed successfully.`,
                sendEmail: true,
            });
            recipients.push({
                userId: trade.seller.id,
                email: trade.seller.email,
                userName: `${trade.seller.firstName} ${trade.seller.lastName}`,
                title: "Trade Completed",
                message: `Your trade for ${data.amount} ${data.currency} has been completed successfully.`,
                sendEmail: true,
            });
            break;
        case "TRADE_DISPUTED":
            recipients.push({
                userId: trade.buyer.id,
                email: trade.buyer.email,
                userName: `${trade.buyer.firstName} ${trade.buyer.lastName}`,
                title: "Trade Disputed",
                message: `Trade #${trade.id} has been disputed. Our support team will review the case.`,
                sendEmail: true,
            });
            recipients.push({
                userId: trade.seller.id,
                email: trade.seller.email,
                userName: `${trade.seller.firstName} ${trade.seller.lastName}`,
                title: "Trade Disputed",
                message: `Trade #${trade.id} has been disputed. Our support team will review the case.`,
                sendEmail: true,
            });
            await notifyAdmins("TRADE_DISPUTED", {
                tradeId: trade.id,
                buyerId: trade.buyerId,
                sellerId: trade.sellerId,
                amount: data.amount,
                currency: data.currency,
                reason: data.reason,
            });
            break;
        case "TRADE_CANCELLED":
            const cancelledBy = data.cancelledBy === trade.buyerId ? trade.buyer : trade.seller;
            const otherUser = data.cancelledBy === trade.buyerId ? trade.seller : trade.buyer;
            recipients.push({
                userId: otherUser.id,
                email: otherUser.email,
                userName: `${otherUser.firstName} ${otherUser.lastName}`,
                title: "Trade Cancelled",
                message: `Trade for ${data.amount} ${data.currency} has been cancelled by ${cancelledBy.firstName}.`,
                sendEmail: true,
            });
            break;
        case "TRADE_MESSAGE":
        case "NEW_MESSAGE":
            const messageRecipient = data.senderId === trade.buyerId ? trade.seller : trade.buyer;
            recipients.push({
                userId: messageRecipient.id,
                email: messageRecipient.email,
                userName: `${messageRecipient.firstName} ${messageRecipient.lastName}`,
                title: "New Message in P2P Trade",
                message: `You have a new message in your trade for ${data.amount} ${data.currency}`,
                sendEmail: false,
            });
            break;
        case "TRADE_EXPIRED":
            recipients.push({
                userId: trade.buyer.id,
                email: trade.buyer.email,
                userName: `${trade.buyer.firstName} ${trade.buyer.lastName}`,
                title: "Trade Expired",
                message: `Trade for ${data.amount} ${data.currency} has expired.`,
                sendEmail: true,
            });
            recipients.push({
                userId: trade.seller.id,
                email: trade.seller.email,
                userName: `${trade.seller.firstName} ${trade.seller.lastName}`,
                title: "Trade Expired",
                message: `Trade for ${data.amount} ${data.currency} has expired.`,
                sendEmail: true,
            });
            break;
        case "ADMIN_MESSAGE":
            recipients.push({
                userId: trade.buyer.id,
                email: trade.buyer.email,
                userName: `${trade.buyer.firstName} ${trade.buyer.lastName}`,
                title: "Message from Admin",
                message: data.message || `Admin has sent a message regarding your trade for ${data.amount} ${data.currency}`,
                sendEmail: true,
            });
            recipients.push({
                userId: trade.seller.id,
                email: trade.seller.email,
                userName: `${trade.seller.firstName} ${trade.seller.lastName}`,
                title: "Message from Admin",
                message: data.message || `Admin has sent a message regarding your trade for ${data.amount} ${data.currency}`,
                sendEmail: true,
            });
            break;
    }
    return recipients;
}
async function notifyAdmins(event, data, ctx) {
    var _a, _b, _c, _d, _e, _f;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Notifying admins about ${event}`);
        const admins = await db_1.models.user.findAll({
            include: [{
                    model: db_1.models.role,
                    as: "role",
                    where: {
                        name: ["Admin", "Super Admin"],
                    },
                }],
            attributes: ["id", "email", "firstName", "lastName"],
        });
        if (!admins || admins.length === 0) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "No admin users found");
            console_1.logger.warn("P2P_NOTIF", "No admin users found for P2P notifications");
            return;
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Found ${admins.length} admin(s) to notify`);
        let title = "";
        let message = "";
        let link = "";
        switch (event) {
            case "TRADE_DISPUTED":
                title = "P2P Trade Disputed";
                message = `Trade #${data.tradeId} has been disputed. Reason: ${data.reason || "Not specified"}. Amount: ${data.amount} ${data.currency}`;
                link = `/admin/p2p/trade/${data.tradeId}`;
                break;
            case "P2P_SECURITY_ALERT":
                title = `P2P Security Alert - ${data.riskLevel}`;
                message = `${data.eventType} detected for ${data.entityType} #${data.entityId}. User: ${data.userId}`;
                link = `/admin/p2p/${data.entityType.toLowerCase()}/${data.entityId}`;
                break;
            case "HIGH_VALUE_TRADE":
                title = "High Value P2P Trade";
                message = `Large trade initiated: ${data.amount} ${data.currency}. Trade ID: ${data.tradeId}`;
                link = `/admin/p2p/trade/${data.tradeId}`;
                break;
            case "SUSPICIOUS_ACTIVITY":
                title = "Suspicious P2P Activity";
                message = `Suspicious activity detected for user ${data.userId}. ${data.description || ""}`;
                link = `/admin/p2p/activity-log`;
                break;
            default:
                title = "P2P Admin Notification";
                message = `Event: ${event}`;
                link = "/admin/p2p";
        }
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Creating admin notifications");
        const adminUserIds = admins.map(admin => admin.id);
        if (adminUserIds.length > 0) {
            await notification_1.notificationService.sendBatch({
                userIds: adminUserIds,
                type: "ALERT",
                channels: ["IN_APP", "EMAIL", "PUSH"],
                data: {
                    title,
                    message,
                    link,
                },
                priority: "HIGH",
            });
        }
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _e === void 0 ? void 0 : _e.call(ctx, `Sent P2P admin notifications (${event}) to ${admins.length} admin(s)`);
        console_1.logger.debug("P2P_NOTIF", `Sent P2P admin notifications (${event}) to ${admins.length} admin(s)`);
    }
    catch (error) {
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, error.message || "Failed to notify admins");
        console_1.logger.error("P2P_NOTIF", "Failed to notify admins", error);
    }
}
async function notifyOfferEvent(offerId, event, data, ctx) {
    var _a, _b, _c, _d, _e;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Notifying offer event: ${event} for offer ${offerId}`);
        const offer = await db_1.models.p2pOffer.findByPk(offerId, {
            include: [{
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "email", "firstName", "lastName"]
                }],
        });
        if (!offer || !offer.user) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, `Offer ${offerId} or owner not found`);
            console_1.logger.error("P2P_NOTIF", `Offer ${offerId} or owner not found for notification`);
            return;
        }
        let title = "";
        let message = "";
        let link = `/p2p/offer/${offerId}`;
        switch (event) {
            case "OFFER_APPROVED":
                title = "Offer Approved";
                message = `Your P2P ${offer.type} offer for ${offer.currency} has been approved and is now active.`;
                break;
            case "OFFER_REJECTED":
                title = "Offer Rejected";
                message = `Your P2P ${offer.type} offer for ${offer.currency} has been rejected. ${data.reason ? `Reason: ${data.reason}` : "Please contact support for details."}`;
                break;
            case "OFFER_EXPIRED":
                title = "Offer Expired";
                message = `Your P2P ${offer.type} offer for ${offer.currency} has expired and is no longer active.`;
                break;
            case "OFFER_LOW_BALANCE":
                title = "Offer Low Balance";
                message = `Your P2P SELL offer for ${offer.currency} has insufficient balance to fulfill new trades.`;
                link = `/p2p/offer/${offerId}/edit`;
                break;
            case "OFFER_TRADE_INITIATED":
                title = "New Trade on Your Offer";
                message = `Someone wants to trade ${data.amount} ${offer.currency} on your ${offer.type} offer.`;
                link = `/p2p/trade/${data.tradeId}`;
                break;
            default:
                title = "Offer Update";
                message = `Your P2P offer has been updated.`;
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Creating offer notification");
        const channels = ["IN_APP", "PUSH"];
        let priority = "NORMAL";
        if (["OFFER_APPROVED", "OFFER_REJECTED", "OFFER_TRADE_INITIATED"].includes(event)) {
            channels.push("EMAIL");
            priority = event === "OFFER_REJECTED" ? "HIGH" : "NORMAL";
        }
        if (event === "OFFER_LOW_BALANCE") {
            priority = "HIGH";
        }
        await notification_1.notificationService.send({
            userId: offer.user.id,
            type: "TRADE",
            channels,
            data: {
                title,
                message,
                link,
                relatedId: offerId,
            },
            priority,
            idempotencyKey: `p2p-offer-${event}-${offerId}`,
        });
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, `Sent offer notification (${event}) to user ${offer.user.id}`);
        console_1.logger.debug("P2P_NOTIF", `Sent offer notification (${event}) to user ${offer.user.id}`);
    }
    catch (error) {
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, error.message || "Failed to send offer notification");
        console_1.logger.error("P2P_NOTIF", "Failed to send offer notification", error);
    }
}
async function notifyReputationEvent(userId, event, data) {
    try {
        let title = "";
        let message = "";
        let link = "/p2p/profile";
        let notifType = "system";
        switch (event) {
            case "REPUTATION_INCREASED":
                title = "Reputation Increased";
                message = `Your P2P reputation has increased! You now have ${data.newRating || data.rating} stars.`;
                notifType = "system";
                break;
            case "REPUTATION_DECREASED":
                title = "Reputation Decreased";
                message = `Your P2P reputation has decreased${data.reason ? ` due to ${data.reason}` : ""}.${data.newRating ? ` Current rating: ${data.newRating} stars.` : ""}`;
                notifType = "alert";
                break;
            case "MILESTONE_REACHED":
                title = "Milestone Reached!";
                message = `Congratulations! You've completed ${data.trades} P2P trade${data.trades > 1 ? "s" : ""}.${data.milestone ? ` ${data.milestone}` : ""}`;
                notifType = "system";
                break;
            case "POSITIVE_REVIEW":
                title = "New Positive Review";
                message = `You received a positive review from a trading partner!${data.comment ? ` "${data.comment}"` : ""}`;
                link = "/p2p/reviews";
                notifType = "system";
                break;
            case "NEGATIVE_REVIEW":
                title = "New Review Received";
                message = `You received a review from a trading partner.${data.rating ? ` Rating: ${data.rating} stars.` : ""}`;
                link = "/p2p/reviews";
                notifType = "alert";
                break;
            case "TRUSTED_STATUS":
                title = "Trusted Trader Status";
                message = `Congratulations! You've earned Trusted Trader status with ${data.completedTrades} completed trades and ${data.rating}+ rating.`;
                notifType = "system";
                break;
            default:
                title = "Reputation Update";
                message = `Your P2P reputation has been updated.`;
                notifType = "system";
        }
        const channels = ["IN_APP", "PUSH"];
        let priority = "NORMAL";
        if (["REPUTATION_DECREASED", "NEGATIVE_REVIEW", "MILESTONE_REACHED", "TRUSTED_STATUS"].includes(event)) {
            channels.push("EMAIL");
            priority = event === "REPUTATION_DECREASED" || event === "NEGATIVE_REVIEW" ? "HIGH" : "NORMAL";
        }
        await notification_1.notificationService.send({
            userId,
            type: notifType === "alert" ? "ALERT" : "SYSTEM",
            channels,
            data: {
                title,
                message,
                link,
            },
            priority,
            idempotencyKey: `p2p-reputation-${event}-${userId}-${Date.now()}`,
        });
        console_1.logger.debug("P2P_NOTIF", `Sent reputation notification (${event}) to user ${userId}`);
    }
    catch (error) {
        console_1.logger.error("P2P_NOTIF", "Failed to send reputation notification", error);
    }
}
function getChannelsForEvent(event, sendEmail) {
    const urgentEvents = [
        "TRADE_DISPUTED",
        "TRADE_EXPIRED",
    ];
    const importantEvents = [
        "TRADE_INITIATED",
        "TRADE_COMPLETED",
        "TRADE_CANCELLED",
        "PAYMENT_CONFIRMED",
        "ESCROW_RELEASED",
    ];
    const channels = ["IN_APP"];
    if (sendEmail && (urgentEvents.includes(event) || importantEvents.includes(event))) {
        channels.push("EMAIL");
    }
    if (event !== "TRADE_MESSAGE" && event !== "NEW_MESSAGE") {
        channels.push("PUSH");
    }
    return channels;
}
function getEventPriority(event) {
    const urgentEvents = ["TRADE_DISPUTED", "TRADE_EXPIRED"];
    const highPriorityEvents = ["PAYMENT_CONFIRMED", "ESCROW_RELEASED"];
    if (urgentEvents.includes(event))
        return "URGENT";
    if (highPriorityEvents.includes(event))
        return "HIGH";
    return "NORMAL";
}
