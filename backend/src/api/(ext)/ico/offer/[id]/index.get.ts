import { models } from "@b/db";
import { Op, literal, fn } from "sequelize";

export const metadata = {
  summary: "Get ICO Offering by ID",
  description:
    "Retrieves detailed ICO token offering data by its unique identifier. The response includes related phases, token details, team members, and roadmap items. Additionally, it calculates the current and next phases based on the offering's start date and the durations of its phases.",
  operationId: "getIcoOfferingById",
  tags: ["ICO", "Offerings"],
  parameters: [
    {
      name: "id",
      in: "path",
      description: "Unique identifier of the ICO offering",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "ICO offering retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "Unique identifier for the offering",
              },
              name: { type: "string", description: "Name of the offering" },
              symbol: { type: "string", description: "Token ticker" },
              icon: { type: "string", description: "Offering icon URL" },
              purchaseWalletCurrency: {
                type: "string",
                description: "Wallet currency for purchase",
              },
              purchaseWalletType: {
                type: "string",
                description: "Wallet type for purchase",
              },
              status: {
                type: "string",
                description:
                  "Current status (ACTIVE, PENDING, etc.). For COMPLETED queries, the status may be SUCCESS or FAILED.",
              },
              tokenPrice: {
                type: "number",
                description: "Current token price",
              },
              targetAmount: {
                type: "number",
                description: "Total funding target",
              },
              participants: {
                type: "number",
                description: "Number of participants",
              },
              isPaused: {
                type: "boolean",
                description: "Flag if the offering is paused",
              },
              isFlagged: {
                type: "boolean",
                description: "Flag if the offering is flagged",
              },
              startDate: {
                type: "string",
                format: "date-time",
                description: "Start date of the offering",
              },
              endDate: {
                type: "string",
                format: "date-time",
                description: "End date of the offering",
              },
              currentPhase: {
                type: "object",
                description: "Information about the current phase",
              },
              nextPhase: {
                type: "object",
                description: "Information about the next phase",
              },
              phases: {
                type: "array",
                description: "List of all phases for the offering",
                items: { type: "object" },
              },
              tokenDetail: {
                type: "object",
                description: "Detailed token information",
              },
              teamMembers: {
                type: "array",
                description: "List of team members",
                items: { type: "object" },
              },
              roadmapItems: {
                type: "array",
                description: "List of roadmap items",
                items: { type: "object" },
              },
              currentRaised: {
                type: "number",
                description:
                  "Sum of all transactions (price * amount) associated with this offering",
              },
            },
          },
        },
      },
    },
    404: { description: "ICO offering not found." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { params?: any }): Promise<any> => {
  try {
    // Validate input early
    const { id } = data.params || {};
    if (!id) {
      throw new Error("No offering ID provided");
    }

    // Fetch the offering with associations.
    // If phases need to be in a specific order, update the order option accordingly.
    const offering = await models.icoTokenOffering.findOne({
      where: { id },
      include: [
        {
          model: models.icoTokenOfferingPhase,
          as: "phases",
          // Ensure phases are ordered properly (e.g., by a sortOrder or createdAt column)
          order: [["sortOrder", "ASC"]],
        },
        { model: models.icoTokenDetail, as: "tokenDetail" },
        { model: models.icoTeamMember, as: "teamMembers" },
        { model: models.icoRoadmapItem, as: "roadmapItems" },
      ],
    });

    if (!offering) {
      return { error: "Offering not found" };
    }

    // Kick off the aggregation query concurrently
    const currentRaisedPromise = models.icoTransaction.findOne({
      attributes: [[fn("SUM", literal("price * amount")), "currentRaised"]],
      where: {
        offeringId: id,
        status: { [Op.not]: ["REJECTED"] },
      },
      raw: true,
    });

    // Calculate currentPhase and nextPhase based on the phases array
    const phases: any[] = offering.phases || [];
    const startDate = new Date(offering.startDate);
    const daysSinceStart = Math.floor(
      (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    let cumulativeDays = 0;
    let currentPhase = null;
    let nextPhase = null;

    for (let i = 0; i < phases.length; i++) {
      cumulativeDays += phases[i].duration;
      if (daysSinceStart < cumulativeDays) {
        currentPhase = {
          ...phases[i].toJSON(),
          endsIn: cumulativeDays - daysSinceStart,
        };
        if (i + 1 < phases.length) {
          nextPhase = {
            ...phases[i + 1].toJSON(),
            endsIn: phases[i + 1].duration,
          };
        }
        break;
      }
    }

    // Await the currentRaised aggregation query
    const currentRaisedResult = await currentRaisedPromise;
    const currentRaised =
      currentRaisedResult && currentRaisedResult.currentRaised
        ? Number(currentRaisedResult.currentRaised)
        : 0;

    // Assemble the response with plain objects
    const transformedOffering = {
      id: offering.id,
      name: offering.name,
      symbol: offering.symbol,
      icon: offering.icon,
      purchaseWalletCurrency: offering.purchaseWalletCurrency,
      purchaseWalletType: offering.purchaseWalletType,
      status: offering.status,
      tokenPrice: offering.tokenPrice,
      targetAmount: offering.targetAmount,
      participants: offering.participants,
      isPaused: offering.isPaused,
      isFlagged: offering.isFlagged,
      startDate: offering.startDate,
      endDate: offering.endDate,
      currentPhase,
      nextPhase,
      phases: phases.map((phase) => phase.toJSON()),
      tokenDetail: offering.tokenDetail ? offering.tokenDetail.toJSON() : null,
      teamMembers: offering.teamMembers
        ? offering.teamMembers.map((tm: any) => tm.toJSON())
        : [],
      roadmapItems: offering.roadmapItems
        ? offering.roadmapItems.map((rm: any) => rm.toJSON())
        : [],
      currentRaised,
    };

    return transformedOffering;
  } catch (error) {
    console.error("Error in getIcoOfferingById:", error);
    throw error;
  }
};
