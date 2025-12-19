import { models } from "@b/db";
import { fn, col, Op, literal } from "sequelize";

export const metadata: OperationObject = {
  summary: "Get ICO Landing Page Data",
  description:
    "Retrieves comprehensive data for the ICO landing page including stats, featured offerings, upcoming projects, success stories, and platform diversity.",
  operationId: "getIcoLandingData",
  tags: ["ICO", "Landing"],
  requiresAuth: false,
  responses: {
    200: {
      description: "ICO landing data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              stats: { type: "object" },
              featured: { type: "array" },
              upcoming: { type: "array" },
              successStories: { type: "array" },
              diversity: { type: "object" },
              launchPlans: { type: "array" },
            },
          },
        },
      },
    },
  },
};

export default async (data: Handler) => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    statusCounts,
    transactionStats,
    featuredOfferings,
    upcomingOfferings,
    successfulOfferings,
    blockchainCounts,
    tokenTypeCounts,
    launchPlans,
  ] = await Promise.all([
    // 1. Total offerings by status
    models.icoTokenOffering.findAll({
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true,
    }),

    // 2. Transaction stats
    models.icoTransaction.findOne({
      attributes: [
        [
          fn(
            "SUM",
            literal(
              "CASE WHEN status NOT IN ('REJECTED') THEN price * amount ELSE 0 END"
            )
          ),
          "totalRaised",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' AND status NOT IN ('REJECTED') THEN price * amount ELSE 0 END`
            )
          ),
          "currentRaised",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' AND status NOT IN ('REJECTED') THEN price * amount ELSE 0 END`
            )
          ),
          "previousRaised",
        ],
        [fn("COUNT", literal("DISTINCT userId")), "totalInvestors"],
        [
          fn(
            "COUNT",
            literal(
              `DISTINCT CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN userId ELSE NULL END`
            )
          ),
          "currentInvestors",
        ],
        [
          fn(
            "COUNT",
            literal(
              `DISTINCT CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN userId ELSE NULL END`
            )
          ),
          "previousInvestors",
        ],
      ],
      raw: true,
    }),

    // 3. Featured offerings (ACTIVE, featured flag)
    models.icoTokenOffering.findAll({
      where: { status: "ACTIVE", featured: true },
      include: [
        { model: models.icoTokenOfferingPhase, as: "phases" },
        {
          model: models.icoTokenDetail,
          as: "tokenDetail",
          attributes: ["description", "blockchain", "tokenType"],
        },
        {
          model: models.icoTeamMember,
          as: "teamMembers",
          attributes: ["name", "role", "avatar"],
          limit: 3,
        },
      ],
      limit: 6,
      order: [["createdAt", "DESC"]],
    }),

    // 4. Upcoming offerings
    models.icoTokenOffering.findAll({
      where: { status: "UPCOMING" },
      include: [
        {
          model: models.icoTokenDetail,
          as: "tokenDetail",
          attributes: ["description", "blockchain", "tokenType"],
        },
      ],
      limit: 4,
      order: [["startDate", "ASC"]],
    }),

    // 5. Success stories (recently completed)
    models.icoTokenOffering.findAll({
      where: { status: "SUCCESS" },
      include: [
        {
          model: models.icoTokenDetail,
          as: "tokenDetail",
          attributes: ["blockchain"],
        },
      ],
      limit: 4,
      order: [["updatedAt", "DESC"]],
    }),

    // 6. Blockchain diversity
    models.icoTokenDetail.findAll({
      attributes: ["blockchain", [fn("COUNT", col("offeringId")), "count"]],
      group: ["blockchain"],
      raw: true,
    }),

    // 7. Token type diversity
    models.icoTokenDetail.findAll({
      attributes: ["tokenType", [fn("COUNT", col("offeringId")), "count"]],
      group: ["tokenType"],
      raw: true,
    }),

    // 8. Launch plans
    models.icoLaunchPlan.findAll({
      where: { status: true },
      attributes: ["id", "name", "price", "features", "recommended"],
      order: [["price", "ASC"]],
      limit: 4,
    }),
  ]);

  // Process stats
  const statusMap: Record<string, number> = {};
  (statusCounts as any[]).forEach((s) => {
    statusMap[s.status] = parseInt(s.count) || 0;
  });

  const totalRaised = parseFloat((transactionStats as any)?.totalRaised) || 0;
  const currentRaised =
    parseFloat((transactionStats as any)?.currentRaised) || 0;
  const previousRaised =
    parseFloat((transactionStats as any)?.previousRaised) || 0;
  const totalInvestors =
    parseInt((transactionStats as any)?.totalInvestors) || 0;
  const currentInvestors =
    parseInt((transactionStats as any)?.currentInvestors) || 0;
  const previousInvestors =
    parseInt((transactionStats as any)?.previousInvestors) || 0;

  const totalOfferings = Object.values(statusMap).reduce(
    (a, b) => a + b,
    0
  ) as number;
  const successfulCount = statusMap["SUCCESS"] || 0;
  const failedCount = statusMap["FAILED"] || 0;
  const completedCount = successfulCount + failedCount;
  const successRate =
    completedCount > 0
      ? Math.round((successfulCount / completedCount) * 100)
      : 0;

  // Calculate growth rates
  const raisedGrowth =
    previousRaised > 0
      ? Math.round(((currentRaised - previousRaised) / previousRaised) * 100)
      : 0;
  const investorsGrowth =
    previousInvestors > 0
      ? Math.round(
          ((currentInvestors - previousInvestors) / previousInvestors) * 100
        )
      : 0;

  // Get raised amounts for featured offerings
  const featuredIds = featuredOfferings.map((o: any) => o.id);
  const featuredRaised =
    featuredIds.length > 0
      ? await models.icoTransaction.findAll({
          attributes: [
            "offeringId",
            [fn("SUM", literal("price * amount")), "raised"],
          ],
          where: {
            offeringId: { [Op.in]: featuredIds },
            status: { [Op.ne]: "REJECTED" },
          },
          group: ["offeringId"],
          raw: true,
        })
      : [];
  const featuredRaisedMap: Record<string, number> = {};
  (featuredRaised as any[]).forEach((r) => {
    featuredRaisedMap[r.offeringId] = parseFloat(r.raised) || 0;
  });

  // Get raised amounts for success stories
  const successIds = successfulOfferings.map((o: any) => o.id);
  const successRaised =
    successIds.length > 0
      ? await models.icoTransaction.findAll({
          attributes: [
            "offeringId",
            [fn("SUM", literal("price * amount")), "raised"],
          ],
          where: {
            offeringId: { [Op.in]: successIds },
            status: { [Op.ne]: "REJECTED" },
          },
          group: ["offeringId"],
          raw: true,
        })
      : [];
  const successRaisedMap: Record<string, number> = {};
  (successRaised as any[]).forEach((r) => {
    successRaisedMap[r.offeringId] = parseFloat(r.raised) || 0;
  });

  // Transform featured offerings
  const transformedFeatured = featuredOfferings.map((offering: any) => {
    const phases = offering.phases || [];
    const startDate = new Date(offering.startDate);
    const endDate = new Date(offering.endDate);
    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Calculate current phase
    let currentPhase: any = null;
    let nextPhase: any = null;
    let cumulativeDays = 0;
    const daysSinceStart = Math.floor(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    for (let i = 0; i < phases.length; i++) {
      cumulativeDays += phases[i].duration;
      if (daysSinceStart < cumulativeDays) {
        currentPhase = {
          name: phases[i].name,
          tokenPrice: phases[i].tokenPrice,
          remaining: phases[i].remaining,
          endsIn: cumulativeDays - daysSinceStart,
        };
        if (i + 1 < phases.length) {
          nextPhase = {
            name: phases[i + 1].name,
            tokenPrice: phases[i + 1].tokenPrice,
            startsIn: cumulativeDays - daysSinceStart,
          };
        }
        break;
      }
    }

    const raised = featuredRaisedMap[offering.id] || 0;
    const progress =
      offering.targetAmount > 0
        ? Math.min(Math.round((raised / offering.targetAmount) * 100), 100)
        : 0;

    return {
      id: offering.id,
      name: offering.name,
      symbol: offering.symbol,
      icon: offering.icon,
      description: offering.tokenDetail?.description || "",
      status: offering.status,
      targetAmount: offering.targetAmount,
      currentRaised: raised,
      progress,
      participants: offering.participants,
      currency: offering.purchaseWalletCurrency,
      startDate: offering.startDate,
      endDate: offering.endDate,
      daysRemaining,
      currentPhase,
      nextPhase,
      teamPreview: (offering.teamMembers || []).map((tm: any) => ({
        name: tm.name,
        role: tm.role,
        avatar: tm.avatar,
      })),
      blockchain: offering.tokenDetail?.blockchain || "Unknown",
      tokenType: offering.tokenDetail?.tokenType || "Unknown",
    };
  });

  // Transform upcoming offerings
  const transformedUpcoming = upcomingOfferings.map((offering: any) => {
    const startDate = new Date(offering.startDate);
    const daysUntilStart = Math.max(
      0,
      Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      id: offering.id,
      name: offering.name,
      symbol: offering.symbol,
      icon: offering.icon,
      description: offering.tokenDetail?.description || "",
      targetAmount: offering.targetAmount,
      startDate: offering.startDate,
      daysUntilStart,
      blockchain: offering.tokenDetail?.blockchain || "Unknown",
      tokenType: offering.tokenDetail?.tokenType || "Unknown",
    };
  });

  // Transform success stories
  const transformedSuccess = successfulOfferings.map((offering: any) => {
    const raised = successRaisedMap[offering.id] || 0;
    const fundedPercentage =
      offering.targetAmount > 0
        ? Math.round((raised / offering.targetAmount) * 100)
        : 0;
    const startDate = new Date(offering.startDate);
    const completedAt = new Date(offering.updatedAt);
    const daysToComplete = Math.ceil(
      (completedAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      id: offering.id,
      name: offering.name,
      symbol: offering.symbol,
      icon: offering.icon,
      targetAmount: offering.targetAmount,
      totalRaised: raised,
      fundedPercentage,
      participants: offering.participants,
      completedAt: offering.updatedAt,
      daysToComplete,
      blockchain: offering.tokenDetail?.blockchain || "Unknown",
    };
  });

  // Transform diversity data
  const blockchains = (blockchainCounts as any[])
    .map((b) => ({
      name: b.blockchain,
      value: b.blockchain,
      offeringCount: parseInt(b.count) || 0,
    }))
    .filter((b) => b.name);

  const tokenTypes = (tokenTypeCounts as any[])
    .map((t) => ({
      name: t.tokenType,
      value: t.tokenType,
      offeringCount: parseInt(t.count) || 0,
    }))
    .filter((t) => t.name);

  // Transform launch plans
  const transformedPlans = launchPlans.map((plan: any) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    features: Array.isArray(plan.features) ? plan.features.slice(0, 5) : [],
    popular: plan.recommended || false,
  }));

  return {
    stats: {
      totalOfferings,
      activeOfferings: statusMap["ACTIVE"] || 0,
      successfulOfferings: successfulCount,
      successRate,
      totalRaised,
      totalInvestors,
      uniqueProjects: totalOfferings,
      raisedGrowth,
      investorsGrowth,
      offeringsGrowth: 0,
      averageFundingPercentage: 0,
      averageTimeToTarget: 0,
    },
    featured: transformedFeatured,
    upcoming: transformedUpcoming,
    successStories: transformedSuccess,
    diversity: {
      blockchains,
      tokenTypes,
    },
    launchPlans: transformedPlans,
  };
};
