import { models } from "@b/db";

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
  data: TradeEventData
): Promise<void> {
  try {
    // Find the trade with related users
    const trade = await models.p2pTrade.findByPk(tradeId, {
      include: [
        { model: models.user, as: "buyer", attributes: ["id", "email", "firstName", "lastName"] },
        { model: models.user, as: "seller", attributes: ["id", "email", "firstName", "lastName"] },
      ],
    });

    if (!trade) {
      console.error(`Trade ${tradeId} not found for notification`);
      return;
    }

    // Log notification event
    console.log(`P2P Trade Event: ${event}`, { tradeId, data });

    // TODO: Implement actual notification sending
    // This would integrate with your notification service
    // For now, just log the notification details
    
    const recipients = await getRecipientsForEvent(trade, event, data);
    
    for (const recipient of recipients) {
      console.log(`Would send notification to user ${recipient.userId}:`, {
        title: recipient.title,
        message: recipient.message,
        type: "P2P_TRADE",
      });
    }

  } catch (error) {
    console.error(`Failed to send trade notification for ${event}:`, error);
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

    case "NEW_MESSAGE":
      const messageRecipient = data.senderId === trade.buyerId ? trade.seller : trade.buyer;
      recipients.push({
        userId: messageRecipient.id,
        email: messageRecipient.email,
        userName: `${messageRecipient.firstName} ${messageRecipient.lastName}`,
        title: "New Message",
        message: `You have a new message in trade #${trade.id}`,
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
  }

  return recipients;
}

/**
 * Notify admins about important P2P events
 */
export async function notifyAdmins(
  event: string,
  data: any
): Promise<void> {
  try {
    // Get admin users with P2P permissions
    const admins = await models.user.findAll({
      include: [{
        model: models.role,
        as: "role",
        where: {
          name: ["admin", "super_admin"],
        },
      }],
    });

    for (const admin of admins) {
      console.log(`Would notify admin ${admin.id} about ${event}:`, data);
      // TODO: Implement actual admin notification
    }
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
}

/**
 * Send offer-related notifications
 */
export async function notifyOfferEvent(
  offerId: string,
  event: string,
  data: any
): Promise<void> {
  try {
    const offer = await models.p2pOffer.findByPk(offerId, {
      include: [{ model: models.user, as: "user" }],
    });

    if (!offer) return;

    let title = "";
    let message = "";

    switch (event) {
      case "OFFER_APPROVED":
        title = "Offer Approved";
        message = `Your P2P offer has been approved by admin.`;
        break;
      case "OFFER_REJECTED":
        title = "Offer Rejected";
        message = `Your P2P offer has been rejected. Reason: ${data.reason}`;
        break;
      case "OFFER_EXPIRED":
        title = "Offer Expired";
        message = `Your P2P offer has expired and is no longer active.`;
        break;
    }

    if (title && message) {
      console.log(`Would notify user ${offer.user.id}:`, { title, message });
      // TODO: Implement actual notification
    }
  } catch (error) {
    console.error("Failed to send offer notification:", error);
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

    switch (event) {
      case "REPUTATION_INCREASED":
        title = "Reputation Increased";
        message = `Your P2P reputation has increased! You now have ${data.newRating} stars.`;
        break;
      case "REPUTATION_DECREASED":
        title = "Reputation Decreased";
        message = `Your P2P reputation has decreased due to ${data.reason}.`;
        break;
      case "MILESTONE_REACHED":
        title = "Milestone Reached!";
        message = `Congratulations! You've completed ${data.trades} trades.`;
        break;
    }

    if (title && message) {
      console.log(`Would notify user ${userId}:`, { title, message });
      // TODO: Implement actual notification
    }
  } catch (error) {
    console.error("Failed to send reputation notification:", error);
  }
}