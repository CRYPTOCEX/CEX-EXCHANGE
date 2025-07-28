import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

// This is a simplified schema; use your existing one as needed.
const adminOfferingCreationSchema = {
  type: "object",
  properties: {
    userId: { type: "string", minLength: 1, description: "Owner user ID" },
    name: { type: "string", minLength: 2 },
    icon: { type: "string", description: "Token icon URL" },
    symbol: { type: "string", minLength: 2, maxLength: 8 },
    tokenType: { type: "string" },
    blockchain: { type: "string" },
    totalSupply: { type: "number" },
    description: { type: "string", minLength: 50, maxLength: 1000 },
    tokenDetails: {
      /* ... same as user endpoint ... */
    },
    teamMembers: {
      /* ... same ... */
    },
    roadmap: {
      /* ... same ... */
    },
    website: { type: "string", format: "uri" },
    targetAmount: { type: "number" },
    startDate: { type: "string", format: "date-time" },
    phases: {
      /* ... same ... */
    },
    selectedPlan: { type: "string", pattern: "^[0-9a-fA-F-]{36}$" },
    // Optional admin fields:
    status: { type: "string" },
    submittedBy: { type: "string" },
    submittedAt: { type: "string", format: "date-time" },
  },
  required: [
    "userId",
    "name",
    "symbol",
    "icon",
    "tokenType",
    "blockchain",
    "totalSupply",
    "description",
    "tokenDetails",
    "website",
    "targetAmount",
    "startDate",
    "phases",
    "selectedPlan",
  ],
};

export const metadata = {
  summary: "Admin: Create ICO Offering (No Payment)",
  description:
    "Creates a new ICO offering as admin for any user without charging wallet.",
  operationId: "adminCreateIcoOffering",
  tags: ["ICO", "Admin"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: { "application/json": { schema: adminOfferingCreationSchema } },
  },
  responses: {
    200: { description: "ICO offering created successfully." },
    401: { description: "Unauthorized – Admin privileges required." },
    400: { description: "Bad Request" },
    500: { description: "Internal Server Error" },
  },
  permission: "create.ico.offer",
};

export default async (data: Handler) => {
  const { user, body } = data;

  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  // 2. Extract payload
  const {
    userId,
    name,
    symbol,
    icon,
    tokenType,
    blockchain,
    totalSupply,
    description,
    tokenDetails,
    teamMembers,
    roadmap,
    website,
    targetAmount,
    startDate,
    phases,
    selectedPlan,
    status = "PENDING",
    submittedBy = user.id,
    submittedAt = new Date().toISOString(),
  } = body;

  // 3. Validate selected plan
  const launchPlan = await models.icoLaunchPlan.findOne({
    where: { id: selectedPlan },
  });
  if (!launchPlan) {
    throw createError({
      statusCode: 400,
      message: "Invalid launch plan selected.",
    });
  }

  // 4. Find token type by name
  let tokenTypeRecord = await models.icoTokenType.findOne({
    where: { name: tokenType },
  });
  
  // If token type doesn't exist, try to find by name case-insensitive or create a default one
  if (!tokenTypeRecord) {
    tokenTypeRecord = await models.icoTokenType.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('name')),
        sequelize.fn('LOWER', tokenType)
      ),
    });
  }
  
  // If still not found, create a default token type
  if (!tokenTypeRecord) {
    try {
      tokenTypeRecord = await models.icoTokenType.create({
        name: tokenType,
        description: `Auto-created token type: ${tokenType}`,
        status: true,
      });
    } catch (createError) {
      // If creation fails, throw error
      throw createError({
        statusCode: 400,
        message: `Invalid token type: ${tokenType}. Please ensure token types are properly configured.`,
      });
    }
  }

  let planFeatures;
  try {
    planFeatures = JSON.parse(launchPlan.features);
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: "Failed to parse launch plan features.",
    });
  }

  // 5. Validate payload against plan limits
  if (teamMembers && teamMembers.length > planFeatures.maxTeamMembers) {
    throw createError({
      statusCode: 400,
      message: `Maximum allowed team members is ${planFeatures.maxTeamMembers}.`,
    });
  }
  if (roadmap && roadmap.length > planFeatures.maxRoadmapItems) {
    throw createError({
      statusCode: 400,
      message: `Maximum allowed roadmap items is ${planFeatures.maxRoadmapItems}.`,
    });
  }
  if (phases && phases.length > planFeatures.maxOfferingPhases) {
    throw createError({
      statusCode: 400,
      message: `Maximum allowed offering phases is ${planFeatures.maxOfferingPhases}.`,
    });
  }

  // 6. Transaction: Create records (no wallet check)
  const transaction = await sequelize.transaction();
  try {
    const startDateObj = new Date(startDate);

    // Calculate end date
    let totalDurationDays = 0;
    for (const phase of phases) totalDurationDays += phase.durationDays;
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + totalDurationDays);

    const tokenPrice = phases.length > 0 ? phases[0].tokenPrice : 0;

    // Main offering
    const offering = await models.icoTokenOffering.create(
      {
        userId,
        planId: launchPlan.id,
        typeId: tokenTypeRecord.id,
        name,
        icon,
        symbol: symbol.toUpperCase(),
        status: status.toUpperCase(),
        purchaseWalletCurrency: launchPlan.currency,
        purchaseWalletType: launchPlan.walletType,
        tokenPrice,
        targetAmount,
        startDate: startDateObj,
        endDate: endDateObj,
        participants: 0,
        isPaused: false,
        isFlagged: false,
        submittedAt,
        submittedBy,
        website,
      },
      { transaction }
    );

    // Token detail
    await models.icoTokenDetail.create(
      {
        offeringId: offering.id,
        tokenType,
        totalSupply,
        tokensForSale: totalSupply,
        salePercentage: 0,
        blockchain,
        description,
        useOfFunds: tokenDetails.useOfFunds,
        links: [
          { label: "whitepaper", url: tokenDetails.whitepaper },
          { label: "github", url: tokenDetails.github },
          { label: "twitter", url: tokenDetails.twitter },
          { label: "telegram", url: tokenDetails.telegram },
        ],
      },
      { transaction }
    );

    // Phases
    for (const phase of phases) {
      await models.icoTokenOfferingPhase.create(
        {
          offeringId: offering.id,
          name: phase.name,
          tokenPrice: phase.tokenPrice,
          allocation: phase.allocation,
          duration: phase.durationDays,
          remaining: phase.allocation,
        },
        { transaction }
      );
    }

    // Team members
    if (Array.isArray(teamMembers)) {
      for (const member of teamMembers) {
        if (member.name && member.role && member.bio) {
          await models.icoTeamMember.create(
            {
              offeringId: offering.id,
              name: member.name,
              role: member.role,
              bio: member.bio,
              avatar: member.avatar,
              linkedin: member.linkedin,
              twitter: member.twitter,
              website: member.website,
              github: member.github,
            },
            { transaction }
          );
        }
      }
    }

    // Roadmap
    if (Array.isArray(roadmap)) {
      for (const item of roadmap) {
        if (item.title && item.description && item.date) {
          await models.icoRoadmapItem.create(
            {
              offeringId: offering.id,
              title: item.title,
              description: item.description,
              date: item.date,
              completed: item.completed || false,
            },
            { transaction }
          );
        }
      }
    }

    await transaction.commit();

    // Optional: Notify user
    try {
      await createNotification({
        userId,
        relatedId: offering.id,
        title: "Admin Created Offering",
        type: "system",
        message: `An ICO offering "${offering.name}" has been created for you by the admin.`,
        details: "Check your dashboard for more details.",
        link: `/ico/creator/token/${offering.id}`,
      });
    } catch (notifErr) {
      console.error(
        "Failed to notify user for admin-created offering",
        notifErr
      );
    }

    return {
      message: "Offering created successfully.",
      offeringId: offering.id,
    };
  } catch (err: any) {
    await transaction.rollback();
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
