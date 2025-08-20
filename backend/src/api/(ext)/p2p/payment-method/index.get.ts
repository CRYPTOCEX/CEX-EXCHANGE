import { models } from "@b/db";
import { serverErrorResponse } from "@b/utils/query";

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
    // Build where clause to include both system and user's custom methods
    const whereClause: any = {};
    
    if (user?.id) {
      // If user is authenticated, show both system methods and their custom methods
      whereClause[models.Sequelize.Op.or] = [
        { userId: null }, // System payment methods
        { userId: user.id } // User's custom payment methods
      ];
    } else {
      // If not authenticated, only show system methods
      whereClause.userId = null;
    }
    
    const methods = await models.p2pPaymentMethod.findAll({
      where: whereClause,
      order: [
        ["userId", "ASC"], // Show system methods first
        ["popularityRank", "ASC"],
        ["name", "ASC"]
      ],
      raw: true,
    });
    
    console.log(`[P2P Payment Methods] Found ${methods.length} payment methods for user ${user?.id || 'anonymous'}`);
    
    return methods;
  } catch (err: any) {
    console.error('[P2P Payment Methods] Error:', err);
    throw new Error("Internal Server Error: " + err.message);
  }
};
