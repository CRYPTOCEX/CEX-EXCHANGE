import { models } from "@b/db";
import { messageBroker } from "@b/handler/Websocket";
import { logger } from "@b/utils/console";

/**
 * LogContext interface for operation logging
 */
export interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

interface TradeEventData {
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  [key: string]: any;
}

/**
 * Main function to notify trade participants about events
 */
export async function notifyTradeEvent(
  tradeId: string,
  event: string,
  data: TradeEventData,
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Notifying trade event: ${event} for trade ${tradeId}`);

    // Find the trade with related users
    const trade = await models.p2pTrade.findByPk(tradeId, {
      include: [
        { model: models.user, as: "buyer", attributes: ["id", "email", "firstName", "lastName"] },
        { model: models.user, as: "seller", attributes: ["id", "email", "firstName", "lastName"] },
      ],
    });

    if (!trade) {
      ctx?.fail?.(`Trade ${tradeId} not found`);
      logger.error("P2P_NOTIF", `Trade ${tradeId} not found for notification`);
      return;
    }

    ctx?.step?.("Determining notification recipients");
    const recipients = await getRecipientsForEvent(trade, event, data);

    ctx?.step?.(`Sending notifications to ${recipients.length} recipient(s)`);

    // Create in-app notifications for each recipient
    for (const recipient of recipients) {
      try {
        const notification = await models.notification.create({
          userId: recipient.userId,
          type: 'alert',
          title: recipient.title,
          message: recipient.message,
          link: `/p2p/trade/${tradeId}`,
          read: false,
        });

        // Push notification via WebSocket to user's notification dropdown
        const plainRecord = notification.get({ plain: true });
        messageBroker.sendToClientOnRoute("/api/user", recipient.userId, {
          type: "notification",
          method: "create",
          payload: plainRecord,
        });

        ctx?.step?.(`Notification sent to user ${recipient.userId}`);

        // TODO: Email service integration - when email service is configured, send email notifications
      } catch (notifError) {
        logger.error("P2P_NOTIF", `Failed to create notification for user ${recipient.userId}`, notifError);
      }
    }

    ctx?.success?.(`Trade event notifications sent successfully for ${event}`);
  } catch (error) {
    ctx?.fail?.((error as Error).message || `Failed to send trade notification for ${event}`);
    logger.error("P2P_NOTIF", `Failed to send trade notification for ${event}`, error);
  }
}

/**
 * Determine recipients and message content based on event
 */
async function getRecipientsForEvent(
  trade: any,
  event: string,
  data: TradeEventData
): Promise<Array<{
  userId: string;
  email: string;
  userName: string;
  title: string;
  message: string;
  sendEmail: boolean;
}>> {
  const recipients: Array<{
    userId: string;
    email: string;
    userName: string;
    title: string;
    message: string;
    sendEmail: boolean;
  }> = [];

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
      
      // Notify admins
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
      // Notify both buyer and seller about admin message
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

/**
 * Notify admins about important P2P events
 */
export async function notifyAdmins(
  event: string,
  data: any,
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Notifying admins about ${event}`);

    // Get admin users with P2P permissions
    const admins = await models.user.findAll({
      include: [{
        model: models.role,
        as: "role",
        where: {
          name: ["Admin", "Super Admin"],
        },
      }],
      attributes: ["id", "email", "firstName", "lastName"],
    });

    if (!admins || admins.length === 0) {
      ctx?.fail?.("No admin users found");
      logger.warn("P2P_NOTIF", "No admin users found for P2P notifications");
      return;
    }

    ctx?.step?.(`Found ${admins.length} admin(s) to notify`);

    // Determine notification content based on event type
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

    // Create notifications for all admins and push via WebSocket
    ctx?.step?.("Creating admin notifications");
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

        // Push notification via WebSocket to admin's notification dropdown
        const plainRecord = notification.get({ plain: true });
        messageBroker.sendToClientOnRoute("/api/user", admin.id, {
          type: "notification",
          method: "create",
          payload: plainRecord,
        });
        ctx?.step?.(`Notification sent to admin ${admin.id}`);
      } catch (adminNotifError) {
        logger.error("P2P_NOTIF", `Failed to create admin notification for ${admin.id}`, adminNotifError);
      }
    }

    ctx?.success?.(`Sent P2P admin notifications (${event}) to ${admins.length} admin(s)`);
    logger.debug("P2P_NOTIF", `Sent P2P admin notifications (${event}) to ${admins.length} admin(s)`);
  } catch (error) {
    ctx?.fail?.((error as Error).message || "Failed to notify admins");
    logger.error("P2P_NOTIF", "Failed to notify admins", error);
  }
}

/**
 * Send offer-related notifications
 */
export async function notifyOfferEvent(
  offerId: string,
  event: string,
  data: any,
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Notifying offer event: ${event} for offer ${offerId}`);

    const offer = await models.p2pOffer.findByPk(offerId, {
      include: [{
        model: models.user,
        as: "user",
        attributes: ["id", "email", "firstName", "lastName"]
      }],
    });

    if (!offer || !offer.user) {
      ctx?.fail?.(`Offer ${offerId} or owner not found`);
      logger.error("P2P_NOTIF", `Offer ${offerId} or owner not found for notification`);
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

    // Create notification for offer owner
    ctx?.step?.("Creating offer notification");
    const notification = await models.notification.create({
      userId: offer.user.id,
      type: "alert",
      title,
      message,
      link,
      read: false,
    });

    // Push notification via WebSocket to user's notification dropdown
    const plainRecord = notification.get({ plain: true });
    messageBroker.sendToClientOnRoute("/api/user", offer.user.id, {
      type: "notification",
      method: "create",
      payload: plainRecord,
    });

    ctx?.success?.(`Sent offer notification (${event}) to user ${offer.user.id}`);
    logger.debug("P2P_NOTIF", `Sent offer notification (${event}) to user ${offer.user.id}`);
  } catch (error) {
    ctx?.fail?.((error as Error).message || "Failed to send offer notification");
    logger.error("P2P_NOTIF", "Failed to send offer notification", error);
  }
}

/**
 * Send reputation-related notifications
 */
export async function notifyReputationEvent(
  userId: string,
  event: string,
  data: any
): Promise<void> {
  try {
    let title = "";
    let message = "";
    let link = "/p2p/profile";
    let notifType: "alert" | "system" = "system";

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

    // Create notification for user
    const notification = await models.notification.create({
      userId,
      type: notifType,
      title,
      message,
      link,
      read: false,
    });

    // Push notification via WebSocket to user's notification dropdown
    const plainRecord = notification.get({ plain: true });
    messageBroker.sendToClientOnRoute("/api/user", userId, {
      type: "notification",
      method: "create",
      payload: plainRecord,
    });

    logger.debug("P2P_NOTIF", `Sent reputation notification (${event}) to user ${userId}`);
  } catch (error) {
    logger.error("P2P_NOTIF", "Failed to send reputation notification", error);
  }
}