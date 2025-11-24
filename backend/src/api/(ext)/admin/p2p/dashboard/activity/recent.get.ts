import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Recent Activity (Admin)",
  description:
    "Retrieves a list of recent activity logs for the admin dashboard.",
  operationId: "getRecentAdminP2PActivity",
  tags: ["Admin", "Dashboard", "Activity", "P2P"],
  requiresAuth: true,
  responses: {
    200: { description: "Recent activity logs retrieved successfully." },
    401: { description: "Unauthorized." },
    500: { description: "Internal Server Error." },
  },
  permission: "view.p2p.activity",
};

// Helper function to format action types into readable titles
function formatActionTitle(type: string): string {
  const actionMap: Record<string, string> = {
    // Admin actions
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
    // User actions
    OFFER_APPROVED: "Offer Approved",
    OFFER_REJECTED: "Offer Rejected",
    OFFER_FLAGGED: "Offer Flagged",
    OFFER_DISABLED: "Offer Disabled",
    OFFER_CREATED: "Offer Created",
    OFFER_UPDATED: "Offer Updated",
    // Trade actions
    TRADE_STARTED: "Trade Started",
    TRADE_COMPLETED: "Trade Completed",
    TRADE_CANCELLED: "Trade Cancelled",
    TRADE_DISPUTED: "Trade Disputed",
  };
  return actionMap[type] || type.replace(/_/g, ' ').replace(/ADMIN /g, '').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

// Helper function to format JSON details into readable description
function formatDescription(details: string, type: string, userName?: string): string {
  try {
    const data = typeof details === 'string' ? JSON.parse(details) : details;
    
    // Prioritize the userName parameter (from the user who performed the action)
    // Then fall back to fields stored in the details
    const updaterName = userName || 
                       data.updatedBy || data.approvedBy || data.rejectedBy || 
                       data.flaggedBy || data.disabledBy || data.adminName || 
                       null;
    
    // Helper to add updater name only if it exists and is not "undefined undefined"
    const addUpdaterName = (text: string): string => {
      if (updaterName && updaterName !== 'undefined undefined' && updaterName.trim()) {
        return `${text} by ${updaterName}`;
      }
      return text;
    };
    
    // Format based on action type
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
      const changes: string[] = [];
      if (data.currency) changes.push(`currency: ${data.currency}`);
      if (data.price) changes.push(`price: ${data.price}`);
      if (data.minAmount) changes.push(`min: ${data.minAmount}`);
      if (data.maxAmount) changes.push(`max: ${data.maxAmount}`);
      
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
    
    // Default: show key details if available
    const relevantData: string[] = [];
    if (data.amount) relevantData.push(`Amount: ${data.amount}`);
    if (data.currency) relevantData.push(`Currency: ${data.currency}`);
    if (data.status) relevantData.push(`Status: ${data.status}`);
    
    return relevantData.length > 0 ? relevantData.join(", ") : "Activity recorded";
  } catch (error) {
    // If JSON parsing fails, return cleaned up details
    return details || "Activity recorded";
  }
}

// Helper function to determine priority based on action type
function getPriority(type: string): "high" | "medium" | "low" {
  if (type.includes("DISPUTE") || type.includes("FLAG")) return "high";
  if (type.includes("APPROVE") || type.includes("REJECT")) return "medium";
  return "low";
}

export default async (data) => {
  try {
    // Retrieve the 5 most recent activity logs with user information
    const activityLogs = await models.p2pActivityLog.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5,
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
      ],
    });

    // Map database fields to the expected RecentActivity format
    const recentActivity = activityLogs.map((log) => {
      const plainLog = log.get({ plain: true });
      
      // Get the user name from the included user object
      const actorName = plainLog.user ? `${plainLog.user.firstName} ${plainLog.user.lastName}` : undefined;
      
      return {
        id: plainLog.id,
        type: plainLog.type.includes("TRADE") ? "trade" : 
              plainLog.type.includes("DISPUTE") ? "dispute" : 
              plainLog.type.includes("PAYMENT") ? "payment" : 
              plainLog.type.includes("USER") ? "user" : "system",
        title: formatActionTitle(plainLog.type),
        description: formatDescription(
          plainLog.details, 
          plainLog.type,
          actorName
        ),
        createdAt: new Date(plainLog.createdAt).toLocaleString(),
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
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
