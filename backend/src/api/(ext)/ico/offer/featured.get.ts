import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, literal, Op } from "sequelize";

export const metadata = {
  summary: "Get Popular ICO Offerings",
  description:
    "Returns the most popular ICO token offerings (by total raised).",
  operationId: "getPopularIcoOfferings",
  tags: ["ICO", "Offerings"],
  responses: {
    200: {
      description: "Popular ICO offerings retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              projects: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    image: { type: "string" },
                    description: { type: "string" },
                    raised: { type: "string" },
                    target: { type: "string" },
                    progress: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    500: { description: "Internal Server Error." },
  },
};

export default async function getPopularIcoOfferings() {
  try {
    // Only request fields that exist
    const offerings = await models.icoTokenOffering.findAll({
      attributes: [
        "id",
        "name",
        "targetAmount",
        "purchaseWalletCurrency",
        "icon",
      ],
      include: [
        {
          model: models.icoTokenDetail,
          as: "tokenDetail",
          attributes: ["description"],
        },
      ],
      limit: 12,
      raw: false,
    });

    if (!offerings || offerings.length === 0) {
      return { projects: [] };
    }

    const ids = offerings.map((o) => o.id);

    const raisedList = await models.icoTransaction.findAll({
      attributes: [
        "offeringId",
        [fn("SUM", literal("price * amount")), "raised"],
      ],
      where: {
        offeringId: { [Op.in]: ids },
        status: { [Op.ne]: "REJECTED" },
      },
      group: ["offeringId"],
      raw: true,
    });

    const raisedMap = {};
    for (const row of raisedList) {
      raisedMap[row.offeringId] = Number(row.raised) || 0;
    }

    const projects = offerings
      .map((o) => {
        const raised = raisedMap[o.id] || 0;
        const target = Number(o.targetAmount) || 1;
        const currency = o.purchaseWalletCurrency || "$";
        return {
          id: o.id,
          name: o.name,
          image: o.icon || "/img/placeholder.svg",
          description: o.tokenDetail?.description || "",
          raised: `${raised.toLocaleString()} ${currency}`,
          target: `${target.toLocaleString()} ${currency}`,
          progress: Math.min(Math.round((raised / target) * 100), 100),
        };
      })
      .sort(
        (a, b) =>
          parseFloat(b.raised.replace(/[^\d.]/g, "")) -
          parseFloat(a.raised.replace(/[^\d.]/g, ""))
      )
      .slice(0, 6);

    return { projects };
  } catch (error) {
    console.error("Error in getPopularIcoOfferings:", error);
    throw createError({ statusCode: 500, message: "Internal Server Error" });
  }
}
