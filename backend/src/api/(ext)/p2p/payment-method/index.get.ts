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
  requiresAuth: true,
};

export default async (data: { user?: any }) => {
  const { user } = data;

  try {
    // Fetch global/system methods
    const globalMethods = await models.p2pPaymentMethod.findAll({
      where: {
        available: true,
        [Op.or]: [
          { isGlobal: true },
          { userId: null }
        ]
      },
      order: [
        ["isGlobal", "DESC"],
        ["popularityRank", "ASC"],
        ["name", "ASC"]
      ],
      raw: true,
    });

    // Fetch user's custom methods if authenticated
    let userMethods: any[] = [];
    if (user?.id) {
      userMethods = await models.p2pPaymentMethod.findAll({
        where: {
          userId: user.id,
          available: true,
        },
        order: [
          ["popularityRank", "ASC"],
          ["name", "ASC"]
        ],
        raw: true,
      });

      // Check which user methods have active trades or active offers (can't be edited/deleted)
      const userMethodIds = userMethods.map(m => m.id);

      if (userMethodIds.length > 0) {
        // Find methods that are used in active trades
        const activeTradesWithMethods = await models.p2pTrade.findAll({
          where: {
            status: { [Op.in]: ["PENDING", "PAYMENT_SENT", "DISPUTED"] },
            paymentMethod: { [Op.in]: userMethodIds }
          },
          attributes: ["paymentMethod"],
          raw: true,
        });

        const lockedByTradeIds = new Set(activeTradesWithMethods.map((t: any) => t.paymentMethod));

        // Find methods that are used in active offers
        const activeOffersWithMethods = await models.p2pOffer.findAll({
          include: [
            {
              model: models.p2pPaymentMethod,
              as: "paymentMethods",
              where: { id: { [Op.in]: userMethodIds } },
              attributes: ["id"],
              through: { attributes: [] },
            },
          ],
          where: {
            status: { [Op.in]: ["ACTIVE", "PENDING_APPROVAL", "PAUSED"] },
          },
          attributes: ["id"],
        });

        // Collect method IDs that are used in active offers
        const lockedByOfferIds = new Set<string>();
        for (const offer of activeOffersWithMethods) {
          const paymentMethods = (offer as any).paymentMethods || [];
          for (const pm of paymentMethods) {
            lockedByOfferIds.add(pm.id);
          }
        }

        // Add metadata to user methods
        userMethods = userMethods.map(method => {
          const hasActiveTrade = lockedByTradeIds.has(method.id);
          const hasActiveOffer = lockedByOfferIds.has(method.id);
          return {
            ...method,
            icon: null, // Don't show icon for custom methods
            isCustom: true,
            isGlobal: false,
            isSystem: false,
            canEdit: !hasActiveTrade,
            canDelete: !hasActiveTrade && !hasActiveOffer,
            hasActiveTrade,
            hasActiveOffer,
            usageInfo: hasActiveTrade || hasActiveOffer ? {
              inActiveTrade: hasActiveTrade,
              inActiveOffer: hasActiveOffer,
            } : null,
          };
        });
      }
    }

    // Add metadata to global/system methods
    const globalMethodsWithMetadata = globalMethods.map(method => ({
      ...method,
      isCustom: false,
      isGlobal: method.isGlobal === true || method.isGlobal === 1,
      isSystem: method.userId === null && !method.isGlobal,
      canEdit: false,
      canDelete: false,
      hasActiveTrade: false,
    }));

    console.log(`[P2P Payment Methods] Found ${globalMethods.length} global/system and ${userMethods.length} custom methods for user ${user?.id || 'anonymous'}`);

    // Return separated lists
    return {
      global: globalMethodsWithMetadata,
      custom: userMethods,
    };
  } catch (err: any) {
    console.error('[P2P Payment Methods] Error:', err);
    throw new Error("Internal Server Error: " + err.message);
  }
};
