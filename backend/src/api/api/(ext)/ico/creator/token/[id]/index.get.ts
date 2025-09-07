import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, col, literal, Op } from "sequelize";

export const metadata = {
  summary: "Get ICO Offering by ID (Creator)",
  description:
    "Retrieves detailed ICO offering data (including phases, token detail, team members, roadmap items, launch plan, computed stats, investor count, and rejected funds) for the authenticated creator.",
  operationId: "getCreatorIcoOfferingById",
  tags: ["ICO", "Creator", "Offerings"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ICO offering ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: { description: "ICO offering retrieved successfully." },
    401: { description: "Unauthorized" },
    404: { description: "Offering not found" },
    500: { description: "Internal Server Error" },
  },
};

function computeTimeline(offering: any) {
  const timeline: any[] = [];
  if (offering.createdAt) {
    timeline.push({
      id: "created",
      title: "Created",
      date: offering.createdAt,
    });
  }
  if (offering.startDate && offering.status === "ACTIVE") {
    timeline.push({
      id: "launched",
      title: "Launched",
      date: offering.startDate,
    });
  }
  if (offering.endDate) {
    timeline.push({
      id: "completed",
      title: "Completed",
      date: offering.endDate,
    });
  }
  return timeline;
}

export default async (data: { user?: any; params?: any }) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { id } = params;
  if (!id) {
    throw createError({ statusCode: 400, message: "No offering ID provided" });
  }

  // Fetch the offering with the necessary associations.
  const offering = await models.icoTokenOffering.findOne({
    where: { id, userId: user.id },
    include: [
      { model: models.icoTokenOfferingPhase, as: "phases" },
      { model: models.icoTokenDetail, as: "tokenDetail" },
      { model: models.icoLaunchPlan, as: "plan" },
      // Include additional associations (e.g., roadmap items) as needed.
    ],
  });

  if (!offering) {
    throw createError({ statusCode: 404, message: "Offering not found" });
  }

  // Calculate phases based on offering start date and phase durations.
  const now = new Date();
  const phases: any[] = offering.phases || [];
  let cumulativeDays = 0;
  let currentPhase = null;
  let nextPhase = null;
  const startDate = new Date(offering.startDate);
  const daysSinceStart = Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  for (let i = 0; i < phases.length; i++) {
    cumulativeDays += phases[i].duration;
    if (daysSinceStart < cumulativeDays) {
      const phaseEndsIn = cumulativeDays - daysSinceStart;
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

  // Compute valid fundraising figures:
  // Instead of relying on a stored "currentRaised" value, we recalc valid funds.
  // We now sum up (amount * price) from transactions with all statuses except "REJECTED".
  const validTxResult = await models.icoTransaction.findOne({
    attributes: [
      [
        fn("COALESCE", fn("SUM", literal("amount * price")), 0),
        "validFundsRaised",
      ],
    ],
    where: {
      offeringId: offering.id,
      status: { [Op.not]: ["REJECTED"] },
    },
    raw: true,
  });
  const fundsRaised = parseFloat(validTxResult.validFundsRaised) || 0;

  // Compute rejected funds separately.
  const rejectedTxResult = await models.icoTransaction.findOne({
    attributes: [
      [
        fn("COALESCE", fn("SUM", literal("amount * price")), 0),
        "rejectedFunds",
      ],
    ],
    where: {
      offeringId: offering.id,
      status: "REJECTED",
    },
    raw: true,
  });
  const rejectedFunds = parseFloat(rejectedTxResult.rejectedFunds) || 0;

  // Compute investor count based on valid transactions.
  const investorTransactions = await models.icoTransaction.findAll({
    attributes: ["userId"],
    where: {
      offeringId: offering.id,
      status: { [Op.in]: ["PENDING", "RELEASED"] },
    },
    group: ["userId"],
    raw: true,
  });
  const investorsCount = investorTransactions.length;

  // Additional computed fields.
  const fundingGoal = offering.targetAmount;
  const launchDate =
    offering.status === "ACTIVE" && offering.startDate
      ? offering.startDate
      : null;
  const timeline = computeTimeline(offering);

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
    plan: offering.plan ? offering.plan.toJSON() : null,
    fundsRaised,
    rejectedFunds,
    fundingGoal,
    launchDate,
    timeline,
    investorsCount,
  };

  return transformedOffering;
};
