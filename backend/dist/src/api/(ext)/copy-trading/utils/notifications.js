"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyLeaderApplicationEvent = notifyLeaderApplicationEvent;
exports.notifyLeaderNewFollower = notifyLeaderNewFollower;
exports.notifyLeaderFollowerStopped = notifyLeaderFollowerStopped;
exports.notifyFollowerSubscriptionEvent = notifyFollowerSubscriptionEvent;
exports.notifyFollowerAllocationEvent = notifyFollowerAllocationEvent;
exports.notifyFollowerTradeEvent = notifyFollowerTradeEvent;
exports.notifyFollowerRiskEvent = notifyFollowerRiskEvent;
exports.notifyProfitShareEvent = notifyProfitShareEvent;
exports.notifyCopyTradingAdmins = notifyCopyTradingAdmins;
const db_1 = require("@b/db");
const notification_1 = require("@b/services/notification");
const console_1 = require("@b/utils/console");
async function notifyLeaderApplicationEvent(userId, leaderId, event, data, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Sending leader application notification: ${event}`);
        let title = "";
        let message = "";
        let link = "/copy-trading/leader/me";
        let notifType = "SYSTEM";
        let channels = [
            "IN_APP",
            "PUSH",
        ];
        let priority = "NORMAL";
        let emailData = {};
        const user = await db_1.models.user.findByPk(userId);
        const leader = await db_1.models.copyTradingLeader.findByPk(leaderId);
        if (!user || !leader)
            return;
        switch (event) {
            case "APPLIED":
                title = "Leader Application Submitted";
                message =
                    "Your copy trading leader application has been submitted and is under review.";
                notifType = "SYSTEM";
                channels.push("EMAIL");
                priority = "NORMAL";
                emailData = {
                    template: "copyTradingLeaderApplication",
                    user,
                    leader,
                };
                break;
            case "APPROVED":
                title = "Leader Application Approved!";
                message =
                    "Congratulations! Your leader application has been approved. You can now start accepting followers.";
                notifType = "SYSTEM";
                channels.push("EMAIL");
                priority = "NORMAL";
                emailData = {
                    template: "copyTradingLeaderApproved",
                    user,
                };
                break;
            case "REJECTED":
                title = "Leader Application Status";
                message = (data === null || data === void 0 ? void 0 : data.rejectionReason)
                    ? `Your leader application was not approved. Reason: ${data.rejectionReason}`
                    : "Your leader application was not approved. Please contact support for details.";
                notifType = "ALERT";
                channels.push("EMAIL");
                priority = "HIGH";
                emailData = {
                    template: "copyTradingLeaderRejected",
                    user,
                    reason: (data === null || data === void 0 ? void 0 : data.rejectionReason) || "Application did not meet requirements",
                };
                break;
            case "SUSPENDED":
                title = "Leader Account Suspended";
                message = (data === null || data === void 0 ? void 0 : data.reason)
                    ? `Your leader account has been suspended. Reason: ${data.reason}`
                    : "Your leader account has been suspended. Please contact support.";
                link = "/support";
                notifType = "ALERT";
                channels.push("EMAIL");
                priority = "URGENT";
                emailData = {
                    template: "copyTradingLeaderSuspended",
                    user,
                    reason: (data === null || data === void 0 ? void 0 : data.reason) || "Violation of platform policies",
                };
                break;
            case "ACTIVATED":
                title = "Leader Account Reactivated";
                message =
                    "Your leader account has been reactivated. You can now accept followers again.";
                notifType = "SYSTEM";
                priority = "NORMAL";
                break;
        }
        await notification_1.notificationService.send({
            userId,
            channels,
            priority,
            type: notifType,
            data: {
                title,
                message,
                link,
                relatedId: leaderId,
                emailData,
            },
            idempotencyKey: `copy-trading:leader:${event.toLowerCase()}:${leaderId}:${Date.now()}`,
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Leader application notification sent: ${event}`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("copy-trading", `Failed to send leader application notification: ${event}`, error);
    }
}
async function notifyLeaderNewFollower(leaderId, followerUserId, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Notifying leader about new follower");
        const leader = await db_1.models.copyTradingLeader.findByPk(leaderId);
        if (!leader)
            return;
        const followerUser = await db_1.models.user.findByPk(followerUserId, {
            attributes: ["id", "firstName", "lastName"],
        });
        const followerName = followerUser
            ? `${followerUser.firstName} ${followerUser.lastName}`
            : "A user";
        const leaderUser = await db_1.models.user.findByPk(leader.userId);
        if (!leaderUser)
            return;
        const followerRecord = await db_1.models.copyTradingFollower.findOne({
            where: { leaderId, userId: followerUserId },
            order: [["createdAt", "DESC"]],
        });
        await notification_1.notificationService.send({
            userId: leader.userId,
            channels: [
                "IN_APP",
                "EMAIL",
                "PUSH",
            ],
            priority: "NORMAL",
            type: "SYSTEM",
            data: {
                title: "New Follower",
                message: `${followerName} started following your copy trading strategy.`,
                link: "/copy-trading/leader/followers",
                relatedId: leaderId,
                emailData: followerRecord
                    ? {
                        template: "copyTradingNewFollower",
                        user: leaderUser,
                        follower: followerRecord,
                        followerUser,
                    }
                    : undefined,
            },
            idempotencyKey: `copy-trading:leader:new-follower:${leaderId}:${followerUserId}:${Date.now()}`,
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Leader notified about new follower");
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("copy-trading", "Failed to notify leader about new follower", error);
    }
}
async function notifyLeaderFollowerStopped(leaderId, followerUserId, reason, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Notifying leader about follower stop");
        const leader = await db_1.models.copyTradingLeader.findByPk(leaderId);
        if (!leader)
            return;
        const followerUser = await db_1.models.user.findByPk(followerUserId, {
            attributes: ["id", "firstName", "lastName"],
        });
        const followerName = followerUser
            ? `${followerUser.firstName} ${followerUser.lastName}`
            : "A follower";
        const leaderUser = await db_1.models.user.findByPk(leader.userId);
        if (!leaderUser)
            return;
        const followerRecord = await db_1.models.copyTradingFollower.findOne({
            where: { leaderId, userId: followerUserId },
            order: [["createdAt", "DESC"]],
        });
        await notification_1.notificationService.send({
            userId: leader.userId,
            channels: [
                "IN_APP",
                "EMAIL",
                "PUSH",
            ],
            priority: "NORMAL",
            type: "SYSTEM",
            data: {
                title: "Follower Stopped",
                message: `${followerName} has stopped following your strategy${reason ? `: ${reason}` : ""}.`,
                link: "/copy-trading/leader/followers",
                relatedId: leaderId,
                emailData: followerRecord
                    ? {
                        template: "copyTradingFollowerStopped",
                        user: leaderUser,
                        follower: followerRecord,
                        followerUser,
                    }
                    : undefined,
            },
            idempotencyKey: `copy-trading:leader:follower-stopped:${leaderId}:${followerUserId}:${Date.now()}`,
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Leader notified about follower stop");
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("copy-trading", "Failed to notify leader about follower stop", error);
    }
}
async function notifyFollowerSubscriptionEvent(followerId, event, data, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Sending follower subscription notification: ${event}`);
        const follower = await db_1.models.copyTradingFollower.findByPk(followerId, {
            include: [
                {
                    model: db_1.models.copyTradingLeader,
                    as: "leader",
                    include: [
                        {
                            model: db_1.models.user,
                            as: "user",
                            attributes: ["firstName", "lastName"],
                        },
                    ],
                },
            ],
        });
        if (!follower)
            return;
        const leaderName = (data === null || data === void 0 ? void 0 : data.leaderName) ||
            (((_b = follower.leader) === null || _b === void 0 ? void 0 : _b.user)
                ? `${follower.leader.user.firstName} ${follower.leader.user.lastName}`
                : "the leader");
        let title = "";
        let message = "";
        let link = `/copy-trading/follower/${followerId}`;
        let notifType = "SYSTEM";
        let channels = [
            "IN_APP",
            "PUSH",
        ];
        let priority = "NORMAL";
        let emailData;
        const user = await db_1.models.user.findByPk(follower.userId);
        if (!user)
            return;
        switch (event) {
            case "STARTED":
                title = "Copy Trading Started";
                message = `You are now copying ${leaderName}'s trading strategy.`;
                notifType = "SYSTEM";
                channels.push("EMAIL");
                priority = "NORMAL";
                if (follower.leader) {
                    emailData = {
                        template: "copyTradingSubscriptionStarted",
                        user,
                        follower,
                        leader: follower.leader,
                    };
                }
                break;
            case "PAUSED":
                title = "Copy Trading Paused";
                message = `Your subscription to ${leaderName} has been paused. No new trades will be copied.`;
                notifType = "ALERT";
                channels.push("EMAIL");
                priority = "NORMAL";
                emailData = {
                    template: "copyTradingSubscriptionPaused",
                    user,
                    leaderName,
                    reason: (data === null || data === void 0 ? void 0 : data.reason) || "You manually paused this subscription",
                };
                break;
            case "RESUMED":
                title = "Copy Trading Resumed";
                message = `Your subscription to ${leaderName} has been resumed. Trades will be copied again.`;
                notifType = "SYSTEM";
                channels.push("EMAIL");
                priority = "NORMAL";
                emailData = {
                    template: "copyTradingSubscriptionResumed",
                    user,
                    leaderName,
                    copyMode: follower.copyMode,
                };
                break;
            case "STOPPED":
                title = "Copy Trading Stopped";
                message = (data === null || data === void 0 ? void 0 : data.reason)
                    ? `Your subscription to ${leaderName} has been stopped. Reason: ${data.reason}`
                    : `Your subscription to ${leaderName} has been stopped.`;
                notifType = "ALERT";
                channels.push("EMAIL");
                priority = "HIGH";
                const { getFollowerStats: getStoppedStats } = await Promise.resolve().then(() => __importStar(require("./stats-calculator")));
                const stoppedStats = await getStoppedStats(followerId);
                emailData = {
                    template: "copyTradingSubscriptionStopped",
                    user,
                    leaderName,
                    stats: stoppedStats,
                };
                break;
            case "FORCE_STOPPED":
                title = "Copy Trading Force Stopped";
                message = (data === null || data === void 0 ? void 0 : data.reason)
                    ? `Your subscription to ${leaderName} was stopped by admin. Reason: ${data.reason}`
                    : `Your subscription to ${leaderName} was stopped by admin.`;
                link = "/support";
                notifType = "ALERT";
                channels.push("EMAIL");
                priority = "HIGH";
                const { getFollowerStats: getForceStoppedStats } = await Promise.resolve().then(() => __importStar(require("./stats-calculator")));
                const forceStoppedStats = await getForceStoppedStats(followerId);
                emailData = {
                    template: "copyTradingSubscriptionStopped",
                    user,
                    leaderName,
                    stats: forceStoppedStats,
                };
                break;
        }
        await notification_1.notificationService.send({
            userId: follower.userId,
            channels,
            priority,
            type: notifType,
            data: {
                title,
                message,
                link,
                relatedId: followerId,
                emailData,
            },
            idempotencyKey: `copy-trading:follower:${event.toLowerCase()}:${followerId}:${Date.now()}`,
        });
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Follower subscription notification sent: ${event}`);
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        console_1.logger.error("copy-trading", `Failed to send follower subscription notification: ${event}`, error);
    }
}
async function notifyFollowerAllocationEvent(followerId, symbol, event, data, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Sending allocation notification: ${event}`);
        const follower = await db_1.models.copyTradingFollower.findByPk(followerId, {
            include: [
                {
                    model: db_1.models.copyTradingLeader,
                    as: "leader",
                    include: [
                        {
                            model: db_1.models.user,
                            as: "user",
                            attributes: ["firstName", "lastName"],
                        },
                    ],
                },
            ],
        });
        if (!follower)
            return;
        const leaderName = ((_b = follower.leader) === null || _b === void 0 ? void 0 : _b.user)
            ? `${follower.leader.user.firstName} ${follower.leader.user.lastName}`
            : "your leader";
        let title = "";
        let message = "";
        let link = `/copy-trading/follower/${followerId}`;
        let notifType = "SYSTEM";
        let priority = "NORMAL";
        switch (event) {
            case "CREATED":
                title = "Market Allocation Created";
                message = `Allocation created for ${symbol} with ${leaderName}'s strategy.`;
                notifType = "SYSTEM";
                priority = "NORMAL";
                break;
            case "FUNDS_ADDED":
                title = "Funds Added to Allocation";
                message = (data === null || data === void 0 ? void 0 : data.amount)
                    ? `Added ${data.amount} ${(data === null || data === void 0 ? void 0 : data.currency) || ""} to ${symbol} allocation.`
                    : `Funds added to ${symbol} allocation.`;
                notifType = "SYSTEM";
                priority = "NORMAL";
                break;
            case "FUNDS_REMOVED":
                title = "Funds Removed from Allocation";
                message = (data === null || data === void 0 ? void 0 : data.amount)
                    ? `Removed ${data.amount} ${(data === null || data === void 0 ? void 0 : data.currency) || ""} from ${symbol} allocation.`
                    : `Funds removed from ${symbol} allocation.`;
                notifType = "SYSTEM";
                priority = "NORMAL";
                break;
            case "INSUFFICIENT_BALANCE":
                title = "Insufficient Balance";
                message = `Your ${symbol} allocation has insufficient balance to copy trades. Please add funds.`;
                notifType = "ALERT";
                priority = "HIGH";
                break;
        }
        await notification_1.notificationService.send({
            userId: follower.userId,
            channels: ["IN_APP", "PUSH"],
            priority,
            type: notifType,
            data: {
                title,
                message,
                link,
                relatedId: followerId,
            },
            idempotencyKey: `copy-trading:follower:allocation:${event.toLowerCase()}:${followerId}:${symbol}:${Date.now()}`,
        });
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Allocation notification sent: ${event}`);
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        console_1.logger.error("copy-trading", `Failed to send allocation notification: ${event}`, error);
    }
}
async function notifyFollowerTradeEvent(followerId, tradeId, event, data, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Sending trade notification: ${event}`);
        const follower = await db_1.models.copyTradingFollower.findByPk(followerId);
        if (!follower)
            return;
        let title = "";
        let message = "";
        let link = `/copy-trading/follower/${followerId}/trades`;
        let notifType = "SYSTEM";
        let priority = "NORMAL";
        switch (event) {
            case "COPIED":
                title = "Trade Copied";
                message = (data === null || data === void 0 ? void 0 : data.symbol)
                    ? `Trade copied for ${data.symbol}`
                    : "Trade copied successfully";
                notifType = "SYSTEM";
                priority = "LOW";
                break;
            case "CLOSED":
                title = "Trade Closed";
                message = (data === null || data === void 0 ? void 0 : data.symbol)
                    ? `${data.symbol} trade has been closed`
                    : "Trade has been closed";
                notifType = "SYSTEM";
                priority = "NORMAL";
                break;
            case "FAILED":
                title = "Trade Copy Failed";
                message = (data === null || data === void 0 ? void 0 : data.reason)
                    ? `Failed to copy trade: ${data.reason}`
                    : "Failed to copy trade. Please check your balance.";
                notifType = "ALERT";
                priority = "HIGH";
                break;
            case "PROFIT":
                title = "Trade Profit";
                message = (data === null || data === void 0 ? void 0 : data.profit)
                    ? `Trade closed with profit: +${data.profit.toFixed(2)} USDT`
                    : "Trade closed with profit";
                notifType = "SYSTEM";
                priority = "NORMAL";
                break;
            case "LOSS":
                title = "Trade Loss";
                message = (data === null || data === void 0 ? void 0 : data.profit)
                    ? `Trade closed with loss: ${data.profit.toFixed(2)} USDT`
                    : "Trade closed with loss";
                notifType = "ALERT";
                priority = "NORMAL";
                break;
        }
        await notification_1.notificationService.send({
            userId: follower.userId,
            channels: ["IN_APP", "PUSH"],
            priority,
            type: notifType,
            data: {
                title,
                message,
                link,
                relatedId: tradeId,
            },
            idempotencyKey: `copy-trading:follower:trade:${event.toLowerCase()}:${tradeId}:${Date.now()}`,
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Trade notification sent: ${event}`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("copy-trading", `Failed to send trade notification: ${event}`, error);
    }
}
async function notifyFollowerRiskEvent(followerId, event, data, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Sending risk management notification: ${event}`);
        const follower = await db_1.models.copyTradingFollower.findByPk(followerId, {
            include: [
                {
                    model: db_1.models.copyTradingLeader,
                    as: "leader",
                    include: [
                        {
                            model: db_1.models.user,
                            as: "user",
                            attributes: ["firstName", "lastName"],
                        },
                    ],
                },
            ],
        });
        if (!follower)
            return;
        const leaderName = ((_b = follower.leader) === null || _b === void 0 ? void 0 : _b.user)
            ? `${follower.leader.user.firstName} ${follower.leader.user.lastName}`
            : "your leader";
        let title = "";
        let message = "";
        let link = `/copy-trading/follower/${followerId}`;
        let notifType = "ALERT";
        let priority = "HIGH";
        switch (event) {
            case "DAILY_LOSS_LIMIT":
                title = "Daily Loss Limit Reached";
                message = (data === null || data === void 0 ? void 0 : data.limit)
                    ? `You've reached your daily loss limit of ${data.limit}%. No new trades will be copied today.`
                    : "You've reached your daily loss limit. No new trades will be copied today.";
                priority = "HIGH";
                break;
            case "POSITION_SIZE_LIMIT":
                title = "Position Size Limit";
                message =
                    "Trade skipped due to position size limit. Adjust your limits to copy larger positions.";
                priority = "NORMAL";
                break;
            case "AUTO_PAUSED":
                title = "Auto-Paused";
                message = (data === null || data === void 0 ? void 0 : data.reason)
                    ? `Your subscription to ${leaderName} was automatically paused: ${data.reason}`
                    : `Your subscription to ${leaderName} was automatically paused.`;
                priority = "HIGH";
                break;
            case "AUTO_STOPPED":
                title = "Auto-Stopped";
                message = (data === null || data === void 0 ? void 0 : data.reason)
                    ? `Your subscription to ${leaderName} was automatically stopped: ${data.reason}`
                    : `Your subscription to ${leaderName} was automatically stopped.`;
                priority = "HIGH";
                break;
        }
        await notification_1.notificationService.send({
            userId: follower.userId,
            channels: ["IN_APP", "PUSH"],
            priority,
            type: notifType,
            data: {
                title,
                message,
                link,
                relatedId: followerId,
            },
            idempotencyKey: `copy-trading:follower:risk:${event.toLowerCase()}:${followerId}:${Date.now()}`,
        });
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Risk management notification sent: ${event}`);
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        console_1.logger.error("copy-trading", `Failed to send risk management notification: ${event}`, error);
    }
}
async function notifyProfitShareEvent(userId, event, data, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Sending profit share notification: ${event}`);
        let title = "";
        let message = "";
        let link = "/copy-trading/earnings";
        let notifType = "SYSTEM";
        let priority = "NORMAL";
        switch (event) {
            case "EARNED":
                title = "Profit Share Earned";
                message = data.followerName
                    ? `You earned ${data.amount.toFixed(2)} USDT profit share from ${data.followerName}'s trade.`
                    : `You earned ${data.amount.toFixed(2)} USDT profit share.`;
                link = "/copy-trading/leader/earnings";
                priority = "NORMAL";
                break;
            case "RECEIVED":
                title = "Profit Share Paid";
                message = data.leaderName
                    ? `Profit share of ${data.amount.toFixed(2)} USDT paid to ${data.leaderName}.`
                    : `Profit share of ${data.amount.toFixed(2)} USDT has been paid.`;
                link = "/copy-trading/follower/history";
                priority = "NORMAL";
                break;
            case "DISTRIBUTED":
                title = "Profit Shares Distributed";
                message = `Successfully distributed ${data.amount.toFixed(2)} USDT in profit shares.`;
                priority = "NORMAL";
                break;
        }
        await notification_1.notificationService.send({
            userId,
            channels: ["IN_APP", "PUSH"],
            priority,
            type: notifType,
            data: {
                title,
                message,
                link,
            },
            idempotencyKey: `copy-trading:profit-share:${event.toLowerCase()}:${userId}:${Date.now()}`,
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Profit share notification sent: ${event}`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("copy-trading", `Failed to send profit share notification: ${event}`, error);
    }
}
async function notifyCopyTradingAdmins(event, data, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Notifying admins about ${event}`);
        const admins = await db_1.models.user.findAll({
            include: [
                {
                    model: db_1.models.role,
                    as: "role",
                    include: [
                        {
                            model: db_1.models.permission,
                            as: "permissions",
                            through: { attributes: [] },
                            where: { name: "access.copy_trading" },
                        },
                    ],
                    required: true,
                },
            ],
            attributes: ["id", "email", "firstName", "lastName"],
        });
        if (!admins || admins.length === 0) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "No admin users with copy trading permissions found");
            return;
        }
        let title = "";
        let message = "";
        let link = "";
        let priority = "NORMAL";
        switch (event) {
            case "LEADER_APPLICATION":
                title = "New Leader Application";
                message = `${data.userName} applied to become a copy trading leader.`;
                link = `/admin/copy-trading/leader/${data.leaderId}`;
                priority = "NORMAL";
                break;
            case "SUSPICIOUS_ACTIVITY":
                title = "Suspicious Copy Trading Activity";
                message = `Suspicious activity detected: ${data.description}`;
                link = `/admin/copy-trading/audit`;
                priority = "HIGH";
                break;
            case "HIGH_LOSS_FOLLOWER":
                title = "High Loss Alert";
                message = `Follower ${data.userName} has high losses: ${data.lossPercent}%`;
                link = `/admin/copy-trading/follower/${data.followerId}`;
                priority = "HIGH";
                break;
            case "LEADER_SUSPENDED":
                title = "Leader Suspended";
                message = `Leader ${data.leaderName} has been suspended.`;
                link = `/admin/copy-trading/leader/${data.leaderId}`;
                priority = "NORMAL";
                break;
            default:
                title = "Copy Trading Admin Alert";
                message = `Event: ${event}`;
                link = "/admin/copy-trading";
                priority = "NORMAL";
        }
        for (const admin of admins) {
            try {
                await notification_1.notificationService.send({
                    userId: admin.id,
                    channels: ["IN_APP", "PUSH"],
                    priority,
                    type: "ALERT",
                    data: {
                        title,
                        message,
                        link,
                    },
                    idempotencyKey: `copy-trading:admin:${event}:${admin.id}:${Date.now()}`,
                });
            }
            catch (adminNotifError) {
                console_1.logger.error("copy-trading", `Failed to create admin notification for ${admin.id}`, adminNotifError);
            }
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Sent copy trading admin notifications (${event}) to ${admins.length} admin(s)`);
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        console_1.logger.error("copy-trading", "Failed to notify copy trading admins", error);
    }
}
