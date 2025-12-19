/**
 * Copy Trading Notifications Utility
 *
 * Handles user-facing notifications for copy trading events.
 * Similar to P2P notifications, this provides real-time alerts to users
 * about important copy trading activities.
 *
 * Note: This is separate from audit logs which track admin/compliance data.
 */

import { models } from "@b/db";
import { messageBroker } from "@b/handler/Websocket";
import { logger } from "@b/utils/console";
import {
  sendCopyTradingLeaderApplicationEmail,
  sendCopyTradingLeaderApprovedEmail,
  sendCopyTradingLeaderRejectedEmail,
  sendCopyTradingLeaderSuspendedEmail,
  sendCopyTradingNewFollowerEmail,
  sendCopyTradingFollowerStoppedEmail,
  sendCopyTradingSubscriptionStartedEmail,
  sendCopyTradingSubscriptionPausedEmail,
  sendCopyTradingSubscriptionResumedEmail,
  sendCopyTradingSubscriptionStoppedEmail,
} from "@b/utils/emails";

export interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

// ============================================================================
// LEADER NOTIFICATIONS
// ============================================================================

/**
 * Notify user about leader application status changes
 */
export async function notifyLeaderApplicationEvent(
  userId: string,
  leaderId: string,
  event: "APPLIED" | "APPROVED" | "REJECTED" | "SUSPENDED" | "ACTIVATED",
  data?: { reason?: string; rejectionReason?: string },
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Sending leader application notification: ${event}`);

    let title = "";
    let message = "";
    let link = "/copy-trading/leader/me";
    let notifType: "alert" | "system" = "system";

    switch (event) {
      case "APPLIED":
        title = "Leader Application Submitted";
        message = "Your copy trading leader application has been submitted and is under review.";
        notifType = "system";
        break;

      case "APPROVED":
        title = "Leader Application Approved! 🎉";
        message = "Congratulations! Your leader application has been approved. You can now start accepting followers.";
        notifType = "system";
        break;

      case "REJECTED":
        title = "Leader Application Status";
        message = data?.rejectionReason
          ? `Your leader application was not approved. Reason: ${data.rejectionReason}`
          : "Your leader application was not approved. Please contact support for details.";
        notifType = "alert";
        break;

      case "SUSPENDED":
        title = "Leader Account Suspended";
        message = data?.reason
          ? `Your leader account has been suspended. Reason: ${data.reason}`
          : "Your leader account has been suspended. Please contact support.";
        link = "/support";
        notifType = "alert";
        break;

      case "ACTIVATED":
        title = "Leader Account Reactivated";
        message = "Your leader account has been reactivated. You can now accept followers again.";
        notifType = "system";
        break;
    }

    await createNotification({
      userId,
      relatedId: leaderId,
      title,
      message,
      type: notifType,
      link,
    });

    // Send email notification
    const user = await models.user.findByPk(userId);
    const leader = await models.copyTradingLeader.findByPk(leaderId);

    if (user && leader) {
      switch (event) {
        case "APPLIED":
          await sendCopyTradingLeaderApplicationEmail(user, leader, ctx);
          break;
        case "APPROVED":
          await sendCopyTradingLeaderApprovedEmail(user, ctx);
          break;
        case "REJECTED":
          await sendCopyTradingLeaderRejectedEmail(
            user,
            data?.rejectionReason || "Application did not meet requirements",
            ctx
          );
          break;
        case "SUSPENDED":
          await sendCopyTradingLeaderSuspendedEmail(
            user,
            data?.reason || "Violation of platform policies",
            ctx
          );
          break;
      }
    }

    ctx?.success?.(`Leader application notification sent: ${event}`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("COPY_NOTIF", `Failed to send leader application notification: ${event}`, error);
  }
}

/**
 * Notify leader about new follower
 */
export async function notifyLeaderNewFollower(
  leaderId: string,
  followerUserId: string,
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.("Notifying leader about new follower");

    const leader = await models.copyTradingLeader.findByPk(leaderId);
    if (!leader) return;

    const followerUser = await models.user.findByPk(followerUserId, {
      attributes: ["id", "firstName", "lastName"],
    });

    const followerName = followerUser
      ? `${followerUser.firstName} ${followerUser.lastName}`
      : "A user";

    await createNotification({
      userId: leader.userId,
      relatedId: leaderId,
      title: "New Follower",
      message: `${followerName} started following your copy trading strategy.`,
      type: "system",
      link: "/copy-trading/leader/followers",
    });

    // Send email notification
    const leaderUser = await models.user.findByPk(leader.userId);

    // Find the follower record to get copy mode
    const followerRecord = await models.copyTradingFollower.findOne({
      where: { leaderId, userId: followerUserId },
      order: [["createdAt", "DESC"]],
    });

    if (leaderUser && followerUser && followerRecord) {
      await sendCopyTradingNewFollowerEmail(
        leaderUser,
        followerRecord,
        followerUser,
        ctx
      );
    }

    ctx?.success?.("Leader notified about new follower");
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("COPY_NOTIF", "Failed to notify leader about new follower", error);
  }
}

/**
 * Notify leader about follower unfollow/stop
 */
export async function notifyLeaderFollowerStopped(
  leaderId: string,
  followerUserId: string,
  reason?: string,
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.("Notifying leader about follower stop");

    const leader = await models.copyTradingLeader.findByPk(leaderId);
    if (!leader) return;

    const followerUser = await models.user.findByPk(followerUserId, {
      attributes: ["id", "firstName", "lastName"],
    });

    const followerName = followerUser
      ? `${followerUser.firstName} ${followerUser.lastName}`
      : "A follower";

    await createNotification({
      userId: leader.userId,
      relatedId: leaderId,
      title: "Follower Stopped",
      message: `${followerName} has stopped following your strategy${reason ? `: ${reason}` : ""}.`,
      type: "system",
      link: "/copy-trading/leader/followers",
    });

    // Send email notification
    const leaderUser = await models.user.findByPk(leader.userId);

    // Find the most recent follower record for this user
    const followerRecord = await models.copyTradingFollower.findOne({
      where: { leaderId, userId: followerUserId },
      order: [["createdAt", "DESC"]],
    });

    if (leaderUser && followerUser && followerRecord) {
      await sendCopyTradingFollowerStoppedEmail(
        leaderUser,
        followerRecord,
        followerUser,
        ctx
      );
    }

    ctx?.success?.("Leader notified about follower stop");
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("COPY_NOTIF", "Failed to notify leader about follower stop", error);
  }
}

// ============================================================================
// FOLLOWER NOTIFICATIONS
// ============================================================================

/**
 * Notify follower about subscription events
 */
export async function notifyFollowerSubscriptionEvent(
  followerId: string,
  event: "STARTED" | "PAUSED" | "RESUMED" | "STOPPED" | "FORCE_STOPPED",
  data?: { reason?: string; leaderName?: string },
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Sending follower subscription notification: ${event}`);

    const follower = await models.copyTradingFollower.findByPk(followerId, {
      include: [
        {
          model: models.copyTradingLeader,
          as: "leader",
          include: [
            {
              model: models.user,
              as: "user",
              attributes: ["firstName", "lastName"],
            },
          ],
        },
      ],
    });

    if (!follower) return;

    const leaderName =
      data?.leaderName ||
      (follower.leader?.user
        ? `${follower.leader.user.firstName} ${follower.leader.user.lastName}`
        : "the leader");

    let title = "";
    let message = "";
    let link = `/copy-trading/follower/${followerId}`;
    let notifType: "alert" | "system" = "system";

    switch (event) {
      case "STARTED":
        title = "Copy Trading Started";
        message = `You are now copying ${leaderName}'s trading strategy.`;
        notifType = "system";
        break;

      case "PAUSED":
        title = "Copy Trading Paused";
        message = `Your subscription to ${leaderName} has been paused. No new trades will be copied.`;
        notifType = "alert";
        break;

      case "RESUMED":
        title = "Copy Trading Resumed";
        message = `Your subscription to ${leaderName} has been resumed. Trades will be copied again.`;
        notifType = "system";
        break;

      case "STOPPED":
        title = "Copy Trading Stopped";
        message = data?.reason
          ? `Your subscription to ${leaderName} has been stopped. Reason: ${data.reason}`
          : `Your subscription to ${leaderName} has been stopped.`;
        notifType = "alert";
        break;

      case "FORCE_STOPPED":
        title = "Copy Trading Force Stopped";
        message = data?.reason
          ? `Your subscription to ${leaderName} was stopped by admin. Reason: ${data.reason}`
          : `Your subscription to ${leaderName} was stopped by admin.`;
        link = "/support";
        notifType = "alert";
        break;
    }

    await createNotification({
      userId: follower.userId,
      relatedId: followerId,
      title,
      message,
      type: notifType,
      link,
    });

    // Send email notification
    const user = await models.user.findByPk(follower.userId);

    if (user && follower.leader) {
      switch (event) {
        case "STARTED":
          await sendCopyTradingSubscriptionStartedEmail(
            user,
            follower,
            follower.leader,
            ctx
          );
          break;
        case "PAUSED":
          await sendCopyTradingSubscriptionPausedEmail(
            user,
            leaderName,
            data?.reason || "You manually paused this subscription",
            ctx
          );
          break;
        case "RESUMED":
          await sendCopyTradingSubscriptionResumedEmail(
            user,
            leaderName,
            follower.copyMode,
            ctx
          );
          break;
        case "STOPPED":
        case "FORCE_STOPPED":
          // Get stats for the stopped subscription
          const { getFollowerStats } = await import("./stats-calculator");
          const stats = await getFollowerStats(followerId);
          await sendCopyTradingSubscriptionStoppedEmail(
            user,
            leaderName,
            stats,
            ctx
          );
          break;
      }
    }

    ctx?.success?.(`Follower subscription notification sent: ${event}`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("COPY_NOTIF", `Failed to send follower subscription notification: ${event}`, error);
  }
}

/**
 * Notify follower about allocation changes
 */
export async function notifyFollowerAllocationEvent(
  followerId: string,
  symbol: string,
  event: "CREATED" | "FUNDS_ADDED" | "FUNDS_REMOVED" | "INSUFFICIENT_BALANCE",
  data?: { amount?: number; currency?: string },
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Sending allocation notification: ${event}`);

    const follower = await models.copyTradingFollower.findByPk(followerId, {
      include: [
        {
          model: models.copyTradingLeader,
          as: "leader",
          include: [
            {
              model: models.user,
              as: "user",
              attributes: ["firstName", "lastName"],
            },
          ],
        },
      ],
    });

    if (!follower) return;

    const leaderName = follower.leader?.user
      ? `${follower.leader.user.firstName} ${follower.leader.user.lastName}`
      : "your leader";

    let title = "";
    let message = "";
    let link = `/copy-trading/follower/${followerId}`;
    let notifType: "alert" | "system" = "system";

    switch (event) {
      case "CREATED":
        title = "Market Allocation Created";
        message = `Allocation created for ${symbol} with ${leaderName}'s strategy.`;
        notifType = "system";
        break;

      case "FUNDS_ADDED":
        title = "Funds Added to Allocation";
        message = data?.amount
          ? `Added ${data.amount} ${data?.currency || ""} to ${symbol} allocation.`
          : `Funds added to ${symbol} allocation.`;
        notifType = "system";
        break;

      case "FUNDS_REMOVED":
        title = "Funds Removed from Allocation";
        message = data?.amount
          ? `Removed ${data.amount} ${data?.currency || ""} from ${symbol} allocation.`
          : `Funds removed from ${symbol} allocation.`;
        notifType = "system";
        break;

      case "INSUFFICIENT_BALANCE":
        title = "Insufficient Balance";
        message = `Your ${symbol} allocation has insufficient balance to copy trades. Please add funds.`;
        notifType = "alert";
        break;
    }

    await createNotification({
      userId: follower.userId,
      relatedId: followerId,
      title,
      message,
      type: notifType,
      link,
    });

    ctx?.success?.(`Allocation notification sent: ${event}`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("COPY_NOTIF", `Failed to send allocation notification: ${event}`, error);
  }
}

// ============================================================================
// TRADE NOTIFICATIONS
// ============================================================================

/**
 * Notify follower about trade events
 */
export async function notifyFollowerTradeEvent(
  followerId: string,
  tradeId: string,
  event: "COPIED" | "CLOSED" | "FAILED" | "PROFIT" | "LOSS",
  data?: { symbol?: string; profit?: number; reason?: string },
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Sending trade notification: ${event}`);

    const follower = await models.copyTradingFollower.findByPk(followerId);
    if (!follower) return;

    let title = "";
    let message = "";
    let link = `/copy-trading/follower/${followerId}/trades`;
    let notifType: "alert" | "system" = "system";

    switch (event) {
      case "COPIED":
        title = "Trade Copied";
        message = data?.symbol
          ? `Trade copied for ${data.symbol}`
          : "Trade copied successfully";
        notifType = "system";
        break;

      case "CLOSED":
        title = "Trade Closed";
        message = data?.symbol
          ? `${data.symbol} trade has been closed`
          : "Trade has been closed";
        notifType = "system";
        break;

      case "FAILED":
        title = "Trade Copy Failed";
        message = data?.reason
          ? `Failed to copy trade: ${data.reason}`
          : "Failed to copy trade. Please check your balance.";
        notifType = "alert";
        break;

      case "PROFIT":
        title = "Trade Profit 📈";
        message = data?.profit
          ? `Trade closed with profit: +${data.profit.toFixed(2)} USDT`
          : "Trade closed with profit";
        notifType = "system";
        break;

      case "LOSS":
        title = "Trade Loss";
        message = data?.profit
          ? `Trade closed with loss: ${data.profit.toFixed(2)} USDT`
          : "Trade closed with loss";
        notifType = "alert";
        break;
    }

    await createNotification({
      userId: follower.userId,
      relatedId: tradeId,
      title,
      message,
      type: notifType,
      link,
    });

    ctx?.success?.(`Trade notification sent: ${event}`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("COPY_NOTIF", `Failed to send trade notification: ${event}`, error);
  }
}

// ============================================================================
// RISK MANAGEMENT NOTIFICATIONS
// ============================================================================

/**
 * Notify follower about risk management events
 */
export async function notifyFollowerRiskEvent(
  followerId: string,
  event: "DAILY_LOSS_LIMIT" | "POSITION_SIZE_LIMIT" | "AUTO_PAUSED" | "AUTO_STOPPED",
  data?: { limit?: number; current?: number; reason?: string },
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Sending risk management notification: ${event}`);

    const follower = await models.copyTradingFollower.findByPk(followerId, {
      include: [
        {
          model: models.copyTradingLeader,
          as: "leader",
          include: [
            {
              model: models.user,
              as: "user",
              attributes: ["firstName", "lastName"],
            },
          ],
        },
      ],
    });

    if (!follower) return;

    const leaderName = follower.leader?.user
      ? `${follower.leader.user.firstName} ${follower.leader.user.lastName}`
      : "your leader";

    let title = "";
    let message = "";
    let link = `/copy-trading/follower/${followerId}`;
    let notifType: "alert" | "system" = "alert";

    switch (event) {
      case "DAILY_LOSS_LIMIT":
        title = "Daily Loss Limit Reached";
        message = data?.limit
          ? `You've reached your daily loss limit of ${data.limit}%. No new trades will be copied today.`
          : "You've reached your daily loss limit. No new trades will be copied today.";
        break;

      case "POSITION_SIZE_LIMIT":
        title = "Position Size Limit";
        message = "Trade skipped due to position size limit. Adjust your limits to copy larger positions.";
        break;

      case "AUTO_PAUSED":
        title = "Auto-Paused";
        message = data?.reason
          ? `Your subscription to ${leaderName} was automatically paused: ${data.reason}`
          : `Your subscription to ${leaderName} was automatically paused.`;
        break;

      case "AUTO_STOPPED":
        title = "Auto-Stopped";
        message = data?.reason
          ? `Your subscription to ${leaderName} was automatically stopped: ${data.reason}`
          : `Your subscription to ${leaderName} was automatically stopped.`;
        break;
    }

    await createNotification({
      userId: follower.userId,
      relatedId: followerId,
      title,
      message,
      type: notifType,
      link,
    });

    ctx?.success?.(`Risk management notification sent: ${event}`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("COPY_NOTIF", `Failed to send risk management notification: ${event}`, error);
  }
}

// ============================================================================
// PROFIT SHARE NOTIFICATIONS
// ============================================================================

/**
 * Notify about profit share distributions
 */
export async function notifyProfitShareEvent(
  userId: string,
  event: "EARNED" | "RECEIVED" | "DISTRIBUTED",
  data: {
    amount: number;
    leaderName?: string;
    followerName?: string;
    totalProfit?: number;
  },
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Sending profit share notification: ${event}`);

    let title = "";
    let message = "";
    let link = "/copy-trading/earnings";
    let notifType: "alert" | "system" = "system";

    switch (event) {
      case "EARNED":
        title = "Profit Share Earned 💰";
        message = data.followerName
          ? `You earned ${data.amount.toFixed(2)} USDT profit share from ${data.followerName}'s trade.`
          : `You earned ${data.amount.toFixed(2)} USDT profit share.`;
        link = "/copy-trading/leader/earnings";
        break;

      case "RECEIVED":
        title = "Profit Share Paid";
        message = data.leaderName
          ? `Profit share of ${data.amount.toFixed(2)} USDT paid to ${data.leaderName}.`
          : `Profit share of ${data.amount.toFixed(2)} USDT has been paid.`;
        link = "/copy-trading/follower/history";
        break;

      case "DISTRIBUTED":
        title = "Profit Shares Distributed";
        message = `Successfully distributed ${data.amount.toFixed(2)} USDT in profit shares.`;
        break;
    }

    await createNotification({
      userId,
      title,
      message,
      type: notifType,
      link,
    });

    ctx?.success?.(`Profit share notification sent: ${event}`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("COPY_NOTIF", `Failed to send profit share notification: ${event}`, error);
  }
}

// ============================================================================
// ADMIN NOTIFICATIONS
// ============================================================================

/**
 * Notify admins about copy trading events requiring attention
 */
export async function notifyCopyTradingAdmins(
  event: string,
  data: any,
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Notifying admins about ${event}`);

    // Get users with copy trading management permission
    const admins = await models.user.findAll({
      include: [
        {
          model: models.role,
          as: "role",
          include: [
            {
              model: models.permission,
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
      ctx?.fail?.("No admin users with copy trading permissions found");
      return;
    }

    let title = "";
    let message = "";
    let link = "";

    switch (event) {
      case "LEADER_APPLICATION":
        title = "New Leader Application";
        message = `${data.userName} applied to become a copy trading leader.`;
        link = `/admin/copy-trading/leader/${data.leaderId}`;
        break;

      case "SUSPICIOUS_ACTIVITY":
        title = "Suspicious Copy Trading Activity";
        message = `Suspicious activity detected: ${data.description}`;
        link = `/admin/copy-trading/audit`;
        break;

      case "HIGH_LOSS_FOLLOWER":
        title = "High Loss Alert";
        message = `Follower ${data.userName} has high losses: ${data.lossPercent}%`;
        link = `/admin/copy-trading/follower/${data.followerId}`;
        break;

      case "LEADER_SUSPENDED":
        title = "Leader Suspended";
        message = `Leader ${data.leaderName} has been suspended.`;
        link = `/admin/copy-trading/leader/${data.leaderId}`;
        break;

      default:
        title = "Copy Trading Admin Alert";
        message = `Event: ${event}`;
        link = "/admin/copy-trading";
    }

    for (const admin of admins) {
      try {
        const notification = await models.notification.create({
          userId: admin.id,
          type: "alert",
          title,
          message,
          link,
          read: false,
        });

        const plainRecord = notification.get({ plain: true });
        messageBroker.sendToClientOnRoute("/api/user", admin.id, {
          type: "notification",
          method: "create",
          payload: plainRecord,
        });
      } catch (adminNotifError) {
        logger.error("COPY_NOTIF", `Failed to create admin notification for ${admin.id}`, adminNotifError);
      }
    }

    ctx?.success?.(`Sent copy trading admin notifications (${event}) to ${admins.length} admin(s)`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("COPY_NOTIF", "Failed to notify copy trading admins", error);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a notification and send via WebSocket
 */
async function createNotification(options: {
  userId: string;
  relatedId?: string;
  title: string;
  message: string;
  type: "alert" | "system";
  link: string;
  details?: string;
}): Promise<void> {
  try {
    const notification = await models.notification.create({
      userId: options.userId,
      relatedId: options.relatedId,
      title: options.title,
      message: options.message,
      type: options.type,
      link: options.link,
      details: options.details,
      read: false,
    });

    // Push notification via WebSocket
    const plainRecord = notification.get({ plain: true });
    messageBroker.sendToClientOnRoute("/api/user", options.userId, {
      type: "notification",
      method: "create",
      payload: plainRecord,
    });

    logger.debug("COPY_NOTIF", `Notification sent to user ${options.userId}: ${options.title}`);
  } catch (error) {
    logger.error("COPY_NOTIF", "Failed to create notification", error);
    throw error;
  }
}
