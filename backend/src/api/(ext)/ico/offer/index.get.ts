import { models } from "@b/db";
import { Op, literal, fn } from "sequelize";

export const metadata = {
  summary: "Get ICO Offerings by Status",
  description:
    "Retrieves ICO token offerings filtered by a given status and additional query parameters such as pagination, search, sort, blockchain, tokenType. If the status is 'COMPLETED', the endpoint returns offerings with statuses 'SUCCESS' and 'FAILED'.",
  operationId: "getIcoOfferingsByStatus",
  tags: ["ICO", "Offerings"],
  parameters: [
    {
      index: 1,
      name: "status",
      in: "query",
      description:
        "The offering status to filter by (e.g., ACTIVE, UPCOMING, COMPLETED). Use COMPLETED to fetch offerings with SUCCESS or FAILED status.",
      required: false,
      schema: { type: "string" },
    },
    {
      index: 2,
      name: "page",
      in: "query",
      description: "Page number for pagination.",
      required: false,
      schema: { type: "number" },
    },
    {
      index: 3,
      name: "limit",
      in: "query",
      description: "Number of items per page for pagination.",
      required: false,
      schema: { type: "number" },
    },
    {
      index: 4,
      name: "search",
      in: "query",
      description: "Search term to filter offerings by name or symbol.",
      required: false,
      schema: { type: "string" },
    },
    {
      index: 5,
      name: "sort",
      in: "query",
      description:
        "Sort option for offerings. Valid values: newest, oldest, raised-high, raised-low, target-high, target-low, ending-soon.",
      required: false,
      schema: { type: "string" },
    },
    {
      index: 6,
      name: "blockchain",
      in: "query",
      description:
        "Filter by blockchain. Accepts one or more values (e.g., Ethereum, Solana, Polygon, Binance Smart Chain).",
      required: false,
      schema: { type: "string" },
      style: "form",
      explode: true,
    },
    {
      index: 7,
      name: "tokenType",
      in: "query",
      description:
        "Filter by token type. Accepts one or more values (e.g., Utility, Security, Governance).",
      required: false,
      schema: { type: "string" },
      style: "form",
      explode: true,
    },
  ],
  responses: {
    200: {
      description: "ICO offerings retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              offerings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      description: "Unique identifier for the offering",
                    },
                    name: {
                      type: "string",
                      description: "Name of the offering",
                    },
                    ticker: {
                      type: "string",
                      description: "Token ticker",
                    },
                    description: {
                      type: "string",
                      description: "Detailed description of the offering",
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
                      properties: {
                        name: {
                          type: "string",
                          description: "Name of the current phase",
                        },
                        tokenPrice: {
                          type: "number",
                          description: "Token price in the current phase",
                        },
                        allocation: {
                          type: "number",
                          description: "Total allocation in the phase",
                        },
                        remaining: {
                          type: "number",
                          description: "Remaining tokens in the phase",
                        },
                        endsIn: {
                          type: "number",
                          description:
                            "Days until the phase ends (calculated dynamically)",
                        },
                      },
                    },
                    nextPhase: {
                      type: "object",
                      description: "Information about the next phase",
                      properties: {
                        name: {
                          type: "string",
                          description: "Name of the next phase",
                        },
                        tokenPrice: {
                          type: "number",
                          description: "Token price in the next phase",
                        },
                        allocation: {
                          type: "number",
                          description: "Total allocation in the phase",
                        },
                        remaining: {
                          type: "number",
                          description: "Remaining tokens in the phase",
                        },
                        endsIn: {
                          type: "number",
                          description:
                            "Days until the phase ends (using its full duration)",
                        },
                      },
                    },
                    phases: {
                      type: "array",
                      description: "List of all phases for the offering",
                      items: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                            description: "Phase name",
                          },
                          tokenPrice: {
                            type: "number",
                            description: "Token price during the phase",
                          },
                          allocation: {
                            type: "number",
                            description: "Total allocation for the phase",
                          },
                          remaining: {
                            type: "number",
                            description: "Remaining tokens for the phase",
                          },
                          duration: {
                            type: "number",
                            description: "Duration in days for the phase",
                          },
                        },
                      },
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
              pagination: {
                type: "object",
                properties: {
                  currentPage: { type: "number" },
                  totalPages: { type: "number" },
                  totalItems: { type: "number" },
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

export default async (data: { query?: any }): Promise<any> => {
  try {
    const { query } = data || {};

    // Parse parameters with defaults
    const statusParam: string = query?.status
      ? query.status.toUpperCase()
      : "PENDING";
    const page: number = query.page ? parseInt(query.page) : 1;
    const limit: number = query.limit ? parseInt(query.limit) : 10;
    const offset: number = (page - 1) * limit;
    const sort: string = query.sort || "newest";

    // Build base where clause from status
    const whereClause: Record<string | symbol, any> = {};
    if (statusParam === "COMPLETED") {
      whereClause.status = { [Op.in]: ["SUCCESS", "FAILED"] };
    } else {
      whereClause.status = statusParam;
    }

    // Apply search filter on name and symbol using LIKE
    if (query.search) {
      const searchTerm: string = query.search;
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { symbol: { [Op.like]: `%${searchTerm}%` } },
      ];
    }

    // Prepare tokenDetail conditions for blockchain and tokenType filters
    const tokenDetailConditions: Record<string, any> = {};
    if (query.blockchain) {
      const blockchains: string[] = Array.isArray(query.blockchain)
        ? query.blockchain
        : [query.blockchain];
      tokenDetailConditions.blockchain = { [Op.in]: blockchains };
    }
    if (query.tokenType) {
      const tokenTypes: string[] = Array.isArray(query.tokenType)
        ? query.tokenType
        : [query.tokenType];
      tokenDetailConditions.tokenType = { [Op.in]: tokenTypes };
    }
    Object.keys(tokenDetailConditions).forEach((key) => {
      whereClause[`$tokenDetail.${key}$`] = tokenDetailConditions[key];
    });

    // Determine order based on sort option
    const order: [string, string][] = [];
    switch (sort) {
      case "newest":
        order.push(["createdAt", "DESC"]);
        break;
      case "oldest":
        order.push(["createdAt", "ASC"]);
        break;
      case "target-high":
        order.push(["targetAmount", "DESC"]);
        break;
      case "target-low":
        order.push(["targetAmount", "ASC"]);
        break;
      case "ending-soon":
        order.push(["endDate", "ASC"]);
        break;
      default:
        order.push(["createdAt", "DESC"]);
    }

    // Fetch offerings with findAndCountAll for proper pagination
    const { count, rows } = await models.icoTokenOffering.findAndCountAll({
      where: whereClause,
      include: [
        { model: models.icoTokenOfferingPhase, as: "phases" },
        {
          model: models.icoTokenDetail,
          as: "tokenDetail",
          required: Object.keys(tokenDetailConditions).length > 0,
        },
        { model: models.icoTeamMember, as: "teamMembers" },
        { model: models.icoRoadmapItem, as: "roadmapItems" },
      ],
      limit,
      offset,
      order,
    });

    // Compute currentRaised for all offerings in one query
    const offeringIds = rows.map((offering: any) => offering.id);
    const raisedResults = await models.icoTransaction.findAll({
      attributes: [
        "offeringId",
        [fn("SUM", literal("price * amount")), "currentRaised"],
      ],
      where: {
        offeringId: { [Op.in]: offeringIds },
        status: {
          [Op.not]: ["REJECTED"],
        },
      },
      group: ["offeringId"],
    });
    const raisedMap: Record<string, number> = {};
    raisedResults.forEach((result: any) => {
      const offeringId = result.get("offeringId");
      const sum = result.get("currentRaised");
      raisedMap[offeringId] = sum ? Number(sum) : 0;
    });

    // Transform offerings: compute currentPhase and nextPhase based on phases and date logic
    const now: Date = new Date();
    const transformedOfferings = rows.map((offering: any) => {
      const phases: any[] = offering.phases || [];
      let cumulativeDays = 0;
      let currentPhase = null;
      let nextPhase = null;
      const startDate: Date = new Date(offering.startDate);
      const daysSinceStart: number = Math.floor(
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      for (let i = 0; i < phases.length; i++) {
        cumulativeDays += phases[i].duration;
        if (daysSinceStart < cumulativeDays) {
          const phaseEndsIn: number = cumulativeDays - daysSinceStart;
          currentPhase = { ...phases[i].toJSON(), endsIn: phaseEndsIn };
          if (i + 1 < phases.length) {
            nextPhase = {
              ...phases[i + 1].toJSON(),
              endsIn: phases[i + 1].duration,
            };
          }
          break;
        }
      }
      return {
        id: offering.id,
        name: offering.name,
        icon: offering.icon,
        purchaseWalletCurrency: offering.purchaseWalletCurrency,
        purchaseWalletType: offering.purchaseWalletType,
        symbol: offering.symbol,
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
        tokenDetail: offering.tokenDetail
          ? offering.tokenDetail.toJSON()
          : null,
        teamMembers: offering.teamMembers
          ? offering.teamMembers.map((tm: any) => tm.toJSON())
          : [],
        roadmapItems: offering.roadmapItems
          ? offering.roadmapItems.map((rm: any) => rm.toJSON())
          : [],
        currentRaised: raisedMap[offering.id] || 0,
      };
    });

    return {
      offerings: transformedOfferings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
      },
    };
  } catch (error) {
    console.error("Error in getIcoOfferingsByStatus:", error);
    throw error;
  }
};
