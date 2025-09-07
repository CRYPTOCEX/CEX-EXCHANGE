import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, col, literal, Op } from "sequelize";
import { CacheManager } from "@b/utils/cache";

export const metadata = {
  summary: "Get ICO Offering (Admin)",
  description:
    "Retrieves a single ICO offering by its ID for admin review and management, including calculated metrics (with rejected investments), platform averages, and timeline events.",
  operationId: "getIcoOfferingAdmin",
  tags: ["ICO", "Admin", "Offerings"],
  requiresAuth: true,
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", description: "The ID of the ICO offering." },
    },
  ],
  responses: {
    200: {
      description:
        "ICO offering retrieved successfully with calculated metrics, platform averages, and timeline events.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            description:
              "An object containing the ICO offering record, its computed metrics (including rejected funds), platform averages, and timeline events.",
          },
        },
      },
    },
    401: { description: "Unauthorized – Admin privileges required." },
    404: { description: "ICO offering not found." },
    500: { description: "Internal Server Error" },
  },
  permission: "view.ico.offer",
};

interface Handler {
  user?: { id: string; [key: string]: any };
  params: { id: string };
}

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Admin privileges required.",
    });
  }

  const id = params.id;
  if (!id || typeof id !== "string") {
    throw createError({ statusCode: 400, message: "Invalid offering ID." });
  }

  // Fetch the offering and all associations in one call.
  const offering = await models.icoTokenOffering.findOne({
    where: { id },
    include: [
      { model: models.icoTokenDetail, as: "tokenDetail" },
      { model: models.icoLaunchPlan, as: "plan" },
      {
        model: models.icoTokenOfferingUpdate,
        as: "updates",
        include: [{ model: models.user, as: "user" }],
      },
      { model: models.icoTokenOfferingPhase, as: "phases" },
      { model: models.icoRoadmapItem, as: "roadmapItems" },
      { model: models.icoAdminActivity, as: "adminActivities" },
      { model: models.user, as: "user" },
    ],
  });

  if (!offering) {
    throw createError({ statusCode: 404, message: "ICO offering not found." });
  }

  // Retrieve minimum investment from cached settings.
  const cacheManager = CacheManager.getInstance();
  const minInvestmentSetting = await cacheManager.getSetting(
    "icoMinInvestmentAmount"
  );
  const minInvestmentAmount = Number(minInvestmentSetting) || 100;

  // --- Offer-specific Metrics ---
  const msPerDay = 1000 * 60 * 60 * 24;
  const startDate = offering.startDate ? new Date(offering.startDate) : null;
  const endDate = offering.endDate ? new Date(offering.endDate) : null;
  if (!startDate) {
    throw createError({
      statusCode: 500,
      message: "Offering start date is missing.",
    });
  }
  const now = new Date();
  // If the offering is marked as "SUCCESS", use its endDate; otherwise use current date.
  const durationDays =
    offering.status === "SUCCESS" && endDate
      ? Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay)
      : Math.floor((now.getTime() - startDate.getTime()) / msPerDay);

  // Combine computation of non-rejected and rejected transaction sums in one query.
  const [offeringTxAggregates, investorAggregates] = await Promise.all([
    models.icoTransaction.findOne({
      attributes: [
        [
          fn(
            "SUM",
            literal(
              "CASE WHEN status NOT IN ('REJECTED') THEN price * amount ELSE 0 END"
            )
          ),
          "computedRaised",
        ],
        [
          fn(
            "SUM",
            literal(
              "CASE WHEN status = 'REJECTED' THEN price * amount ELSE 0 END"
            )
          ),
          "rejectedFunds",
        ],
      ],
      where: { offeringId: id },
      raw: true,
    }),
    // Group transactions by user for investor aggregates.
    models.icoTransaction.findAll({
      attributes: [
        "userId",
        [fn("SUM", literal("price * amount")), "totalCost"],
        [fn("COUNT", literal("id")), "transactionCount"],
      ],
      where: {
        offeringId: id,
        status: { [Op.not]: ["REJECTED"] },
      },
      group: ["userId"],
      raw: true,
    }),
  ]);

  const computedCurrentRaised =
    parseFloat(offeringTxAggregates?.computedRaised) || 0;
  const rejectedInvestment =
    parseFloat(offeringTxAggregates?.rejectedFunds) || 0;
  const fundingRate = computedCurrentRaised / (durationDays || 1);
  const avgInvestment = computedCurrentRaised / (offering.participants || 1);
  const completionTime = durationDays;

  // Calculate largest investment and transactions per investor.
  const largestInvestment = investorAggregates.reduce((max, inv) => {
    const totalCost = Number(inv.totalCost) || 0;
    return totalCost > max ? totalCost : max;
  }, 0);
  const totalTransactions = investorAggregates.reduce(
    (sum, inv) => sum + Number(inv.transactionCount),
    0
  );
  const transactionsPerInvestor =
    investorAggregates.length > 0
      ? totalTransactions / investorAggregates.length
      : 0;

  const metrics = {
    avgInvestment,
    fundingRate,
    largestInvestment,
    smallestInvestment: minInvestmentAmount,
    transactionsPerInvestor,
    completionTime,
    rejectedInvestment,
    currentRaised: computedCurrentRaised,
  };

  // --- Platform-wide Metrics ---
  // Run independent platform queries concurrently.
  const [
    totalRaisedAllRow,
    offeringsData,
    platformLargestRow,
    transactionsAggregate,
    platformRejectedAggregate,
  ] = await Promise.all([
    // 1. Total Raised across offerings with status ACTIVE or SUCCESS.
    models.icoTransaction.findOne({
      attributes: [[fn("SUM", literal("price * amount")), "totalRaisedAll"]],
      include: [
        {
          model: models.icoTokenOffering,
          as: "offering",
          attributes: [],
          where: { status: { [Op.in]: ["ACTIVE", "SUCCESS"] } },
        },
      ],
      raw: true,
    }),
    // 2. Total Participants and average duration (in days) from offerings.
    models.icoTokenOffering.findOne({
      attributes: [
        [fn("SUM", col("participants")), "totalParticipants"],
        [
          fn("AVG", literal("TIMESTAMPDIFF(DAY, startDate, endDate)")),
          "avgDuration",
        ],
      ],
      where: { status: { [Op.in]: ["ACTIVE", "SUCCESS"] } },
      raw: true,
    }),
    // 3. Largest investment across all offerings (using a subquery).
    models.icoTokenOffering.findOne({
      attributes: [
        [
          fn(
            "MAX",
            literal(`(SELECT SUM(amount * price) FROM ico_transaction 
                       WHERE ico_transaction.offeringId = icoTokenOffering.id 
                       AND status IN ('PENDING', 'RELEASED'))`)
          ),
          "maxInvestment",
        ],
      ],
      raw: true,
    }),
    // 4. Aggregated transaction data (non-rejected).
    models.icoTransaction.findOne({
      attributes: [
        [fn("SUM", literal("price * amount")), "totalCost"],
        [fn("COUNT", literal("id")), "transactionCount"],
        [fn("COUNT", fn("DISTINCT", col("userId"))), "investorCount"],
      ],
      where: { status: { [Op.not]: ["REJECTED"] } },
      raw: true,
    }),
    // 5. Total rejected funds platform-wide.
    models.icoTransaction.findOne({
      attributes: [
        [
          fn("COALESCE", fn("SUM", literal("price * amount")), 0),
          "rejectedFunds",
        ],
      ],
      where: { status: "REJECTED" },
      raw: true,
    }),
  ]);

  const totalRaisedAll = parseFloat(totalRaisedAllRow?.totalRaisedAll) || 0;
  const totalParticipants = parseFloat(offeringsData?.totalParticipants) || 0;
  const avgDuration = parseFloat(offeringsData?.avgDuration) || 0;
  const platformAvgInvestment =
    totalParticipants > 0 ? totalRaisedAll / totalParticipants : 0;
  const platformFundingRate =
    avgDuration > 0 ? totalRaisedAll / avgDuration : 0;
  const platformLargestInvestment = platformLargestRow
    ? parseFloat(platformLargestRow.maxInvestment) || 0
    : 0;
  const platformSmallestInvestment = minInvestmentAmount;
  const totalTransactionCount =
    parseFloat(transactionsAggregate?.transactionCount) || 0;
  const investorCount = parseFloat(transactionsAggregate?.investorCount) || 0;
  const platformTransactionsPerInvestor =
    investorCount > 0 ? totalTransactionCount / investorCount : 0;
  const platformCompletionTime = avgDuration;
  const platformRejectedInvestment =
    parseFloat(platformRejectedAggregate?.rejectedFunds) || 0;

  const platformMetrics = {
    avgInvestment: platformAvgInvestment,
    fundingRate: platformFundingRate,
    largestInvestment: platformLargestInvestment,
    smallestInvestment: platformSmallestInvestment,
    transactionsPerInvestor: platformTransactionsPerInvestor,
    completionTime: platformCompletionTime,
    rejectedInvestment: platformRejectedInvestment,
  };

  // --- Compute Timeline Events ---
  const timeline = computeIcoOfferTimeline(offering);

  return { offering, metrics, platformMetrics, timeline };
};

function computeIcoOfferTimeline(offering: any) {
  const timelineEvents: any[] = [];
  const msPerDay = 1000 * 60 * 60 * 24;

  // Basic events
  if (offering.createdAt) {
    timelineEvents.push({
      id: "created",
      type: "created",
      timestamp: new Date(offering.createdAt).toISOString(),
      adminName: "System",
      details: "Offering created",
    });
  }
  if (offering.startDate && offering.status === "ACTIVE") {
    timelineEvents.push({
      id: "launched",
      type: "launched",
      timestamp: new Date(offering.startDate).toISOString(),
      adminName: "System",
      details: "Offering launched",
    });
  }
  if (offering.endDate) {
    timelineEvents.push({
      id: "completed",
      type: "completed",
      timestamp: new Date(offering.endDate).toISOString(),
      adminName: "System",
      details: "Offering completed",
    });
  }

  // Submission/Review events
  if (offering.submittedAt) {
    timelineEvents.push({
      id: "submitted",
      type: "submission",
      timestamp: new Date(offering.submittedAt).toISOString(),
      adminName: offering.user?.name || "Creator",
      details: "Offering submitted for review",
    });
  }
  if (offering.approvedAt) {
    timelineEvents.push({
      id: "approved",
      type: "approval",
      timestamp: new Date(offering.approvedAt).toISOString(),
      adminName: "Admin",
      details: "Offering approved",
    });
  }
  if (offering.rejectedAt) {
    timelineEvents.push({
      id: "rejected",
      type: "rejection",
      timestamp: new Date(offering.rejectedAt).toISOString(),
      adminName: "Admin",
      details: "Offering rejected",
    });
  }

  // Updates (notes)
  if (offering.updates && Array.isArray(offering.updates)) {
    offering.updates.forEach((update: any) => {
      timelineEvents.push({
        id: update.id,
        type: "note",
        timestamp: new Date(update.createdAt).toISOString(),
        adminName: update.user?.name || "Admin",
        details: `${update.title}: ${update.content}`,
      });
    });
  }

  // Roadmap items as milestones
  if (offering.roadmapItems && Array.isArray(offering.roadmapItems)) {
    offering.roadmapItems.forEach((item: any) => {
      timelineEvents.push({
        id: `roadmap-${item.id}`,
        type: "milestone",
        timestamp: new Date(item.date).toISOString(),
        adminName: "System",
        details: `${item.title} - ${item.description}`,
        important: item.completed,
      });
    });
  }

  // Phases – compute a phase-start event based on offering start date and phase duration.
  if (offering.phases && Array.isArray(offering.phases)) {
    let phaseStart = new Date(offering.startDate);
    offering.phases.forEach((phase: any) => {
      timelineEvents.push({
        id: `phase-${phase.id}`,
        type: "phase",
        timestamp: phaseStart.toISOString(),
        adminName: "System",
        details: `Phase ${phase.name} started. Token Price: ${phase.tokenPrice}`,
      });
      phaseStart = new Date(phaseStart.getTime() + phase.duration * msPerDay);
    });
  }

  // Admin activities (if available)
  if (offering.adminActivities && Array.isArray(offering.adminActivities)) {
    offering.adminActivities.forEach((activity: any) => {
      timelineEvents.push({
        id: `activity-${activity.id}`,
        type: activity.type || "activity",
        timestamp: new Date(activity.createdAt).toISOString(),
        adminName: activity.adminName || "Admin",
        details: activity.details || "",
      });
    });
  }

  // Attach offering context and sort events chronologically.
  timelineEvents.forEach((event) => {
    event.offeringId = offering.id;
    event.offeringName = offering.name;
  });
  timelineEvents.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  return timelineEvents;
}
