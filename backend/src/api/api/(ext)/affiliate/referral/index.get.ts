import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "List referrals for authenticated affiliate",
  operationId: "listAffiliateReferrals",
  tags: ["Affiliate", "Referral"],
  requiresAuth: true,
  parameters: [
    { name: "page", in: "query", required: false, schema: { type: "number" } },
    {
      name: "perPage",
      in: "query",
      required: false,
      schema: { type: "number" },
    },
  ],
  responses: {
    200: { description: "Referral list retrieved successfully." },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async function handler(data: Handler) {
  const { user } = data;
  if (!user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  // Validate and sanitize pagination parameters to prevent DoS attacks
  const page = Math.max(1, Math.min(parseInt((data.query.page as string) || "1", 10) || 1, 1000));
  const perPage = Math.max(1, Math.min(parseInt((data.query.perPage as string) || "10", 10) || 10, 100));

  // fetch count + rows in one go
  const { count: totalItems, rows: referrals } =
    await models.mlmReferral.findAndCountAll({
      where: { referrerId: user.id },
      include: [
        {
          model: models.user,
          as: "referred",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
      ],
      order: [["createdAt", "DESC"]],
      offset: (page - 1) * perPage,
      limit: perPage,
    });

  return {
    referrals,
    pagination: {
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
    },
  };
}
