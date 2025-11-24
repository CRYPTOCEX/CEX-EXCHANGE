import { models } from "@b/db";
import { serverErrorResponse } from "@b/utils/query";
import { Op } from "sequelize";

export const metadata = {
  summary: "List Payment Methods",
  description:
    "Retrieves a list of available payment methods using the payment methods model.",
  operationId: "listPaymentMethods",
  tags: ["P2P", "Payment Method"],
  responses: {
    200: { description: "Payment methods retrieved successfully." },
    500: serverErrorResponse,
  },
  requiresAuth: false,
};

export default async (data: { user?: any }) => {
  const { user } = data;
  
  try {
    // Build where clause to include global, system, and user's custom methods
    const whereClause: any = {};
    
    if (user?.id) {
      // If user is authenticated, show:
      // 1. Global payment methods (isGlobal = true)
      // 2. System payment methods (userId = null and isGlobal = false/null)
      // 3. User's own custom payment methods
      whereClause[Op.or] = [
        { isGlobal: true }, // Global payment methods created by admin
        { userId: null }, // System payment methods
        { userId: user.id } // User's custom payment methods
      ];
    } else {
      // If not authenticated, only show global and system methods
      whereClause[Op.or] = [
        { isGlobal: true }, // Global payment methods
        { userId: null } // System payment methods
      ];
    }
    
    // Only show available payment methods
    whereClause.available = true;
    
    const methods = await models.p2pPaymentMethod.findAll({
      where: whereClause,
      order: [
        ["isGlobal", "DESC"], // Show global methods first
        ["userId", "ASC"], // Then system methods (null), then user methods
        ["popularityRank", "ASC"],
        ["name", "ASC"]
      ],
      raw: true,
    });
    
    // Add metadata to indicate ownership and allow users to distinguish their custom methods
    const methodsWithMetadata = methods.map(method => ({
      ...method,
      isCustom: method.userId === user?.id, // User's own custom method
      isGlobal: method.isGlobal === true, // Admin-created global method
      isSystem: method.userId === null && !method.isGlobal, // Built-in system method
      canEdit: method.userId === user?.id, // User can only edit their own methods
      canDelete: method.userId === user?.id, // User can only delete their own methods
    }));
    
    console.log(`[P2P Payment Methods] Found ${methods.length} payment methods for user ${user?.id || 'anonymous'}`);
    
    return methodsWithMetadata;
  } catch (err: any) {
    console.error('[P2P Payment Methods] Error:', err);
    throw new Error("Internal Server Error: " + err.message);
  }
};
