import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get All P2P Activity (Admin)",
  description:
    "Retrieves all P2P activity logs with pagination and filtering options for the admin dashboard.",
  operationId: "getAllAdminP2PActivity",
  tags: ["Admin", "Dashboard", "Activity", "P2P"],
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

// Helper function to get activity icon based on type
function getActivityIcon(type: string): string {
  if (type.includes("TRADE")) return "trade";
  if (type.includes("DISPUTE")) return "dispute";
  if (type.includes("PAYMENT")) return "payment";
  if (type.includes("USER")) return "user";
  return "system";
}

export default async (data: any) => {
  try {
    const { query } = data;
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};
    
    if (query.type) {
      where.type = query.type;
    }
    
    if (query.userId) {
      where.userId = query.userId;
    }
    
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt[models.Sequelize.Op.gte] = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt[models.Sequelize.Op.lte] = new Date(query.endDate);
      }
    }

    // Get total count for pagination
    const totalCount = await models.p2pActivityLog.count({ where });

    // Retrieve activity logs with user information
    const activityLogs = await models.p2pActivityLog.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
      ],
    });

    // Map database fields to the expected format
    const activities = activityLogs.map((log) => {
      const plainLog = log.get({ plain: true });
      
      // Get the user name from the included user object (this is the admin who performed the action)
      const actorName = plainLog.user ? `${plainLog.user.firstName} ${plainLog.user.lastName}` : undefined;
      
      return {
        id: plainLog.id,
        type: getActivityIcon(plainLog.type),
        title: formatActionTitle(plainLog.type),
        description: formatDescription(plainLog.details, plainLog.type, actorName),
        createdAt: new Date(plainLog.createdAt).toLocaleString(),
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

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

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
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};