import { getWallet } from "@b/api/finance/wallet/utils";
import { createNotification } from "@b/utils/notifications";
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { rateLimiters } from "@b/handler/Middleware";

export const offeringCreationSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 2 },
    icon: { type: "string", description: "Token icon URL" },
    symbol: { type: "string", minLength: 2, maxLength: 8 },
    tokenType: { type: "string" },
    blockchain: { type: "string" },
    totalSupply: { type: "number" },
    description: { type: "string", minLength: 50, maxLength: 1000 },
    tokenDetails: {
      type: "object",
      properties: {
        whitepaper: { type: "string", format: "uri" },
        github: {
          type: "string",
          description: "GitHub repository URL",
          format: "uri",
        },
        twitter: {
          type: "string",
          description: "Twitter handle or URL",
          format: "uri",
        },
        telegram: {
          type: "string",
          description: "Telegram handle or URL",
          format: "uri",
        },
        useOfFunds: { type: "array", items: { type: "string" } },
      },
      required: ["whitepaper", "github", "useOfFunds", "twitter", "telegram"],
    },
    teamMembers: {
      type: "array",
      description: "Team members information",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", description: "Member name" },
          role: { type: "string", description: "Member role" },
          bio: { type: "string", description: "Member bio", maxLength: 500 },
          linkedin: {
            type: "string",
            description: "LinkedIn URL",
            format: "uri",
          },
          twitter: {
            type: "string",
            description: "Twitter URL",
            format: "uri",
          },
          github: { type: "string", description: "GitHub URL", format: "uri" },
          website: {
            type: "string",
            description: "Website URL",
            format: "uri",
          },
        },
        required: ["name", "role", "bio"],
      },
    },
    roadmap: {
      type: "array",
      description: "Roadmap items",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string", maxLength: 1000 },
          date: { type: "string", format: "date-time" },
          completed: { type: "boolean" },
        },
        required: ["title", "description", "date"],
      },
    },
    website: {
      type: "string",
      description: "Project website URL",
      format: "uri",
    },
    targetAmount: { type: "number" },
    startDate: {
      type: "string",
      description: "Start date of the offering",
      format: "date-time",
    },
    phases: {
      type: "array",
      description: "Offering phases",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          tokenPrice: { type: "number" },
          allocation: { type: "number" },
          durationDays: { type: "number" },
        },
        required: ["name", "tokenPrice", "allocation", "durationDays"],
      },
    },
    vestingEnabled: { 
      type: "boolean", 
      description: "Enable token vesting" 
    },
    vestingSchedule: {
      type: "object",
      description: "Vesting schedule configuration",
      properties: {
        type: { 
          type: "string", 
          enum: ["LINEAR", "CLIFF", "MILESTONE"] 
        },
        durationMonths: { type: "number" },
        cliffMonths: { type: "number" },
        milestones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              monthsAfterPurchase: { type: "number" },
              percentage: { type: "number" },
            },
          },
        },
      },
    },
    termsAccepted: { type: "boolean" },
    selectedPlan: {
      type: "string",
      description: "ID of the selected launch plan",
      pattern: "^[0-9a-fA-F-]{36}$",
    },
    paymentComplete: { type: "boolean" },
  },
  required: [
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
    "termsAccepted",
    "selectedPlan",
    "paymentComplete",
  ],
};

export const metadata = {
  summary: "Create ICO Offering",
  description:
    "Creates a new ICO offering along with token details, team members, and roadmap items. Also verifies user wallet balance and deducts the launch fee based on the selected launch plan.",
  operationId: "createIcoOffering",
  tags: ["ICO", "Offerings"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: offeringCreationSchema,
      },
    },
  },
  responses: {
    200: {
      description: "ICO offering created successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              offering: {
                type: "object",
                description: "The created offering record",
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized – Admin privileges required." },
    400: { description: "Bad Request" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  // Apply rate limiting - stricter for ICO creation
  await rateLimiters.orderCreation(data);
  
  const { user, body } = data;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: You must be logged in to create an offering.",
    });
  }

  const {
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
    vestingEnabled,
    vestingSchedule,
    termsAccepted,
    selectedPlan,
    paymentComplete,
  } = body;

  if (!termsAccepted) {
    throw createError({
      statusCode: 400,
      message: "Terms and conditions must be accepted to create an offering.",
    });
  }

  // Fetch the selected launch plan details.
  const launchPlan = await models.icoLaunchPlan.findOne({
    where: { id: selectedPlan },
  });
  if (!launchPlan) {
    throw createError({
      statusCode: 400,
      message: "Invalid launch plan selected.",
    });
  }

  // Parse the features from the launch plan.
  let planFeatures;
  try {
    planFeatures = JSON.parse(launchPlan.features);
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: "Failed to parse launch plan features.",
    });
  }

  // Check payload limits against the selected plan's features.
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

  // Find token type by ID
  if (!tokenType) {
    throw createError({
      statusCode: 400,
      message: "Token type is required.",
    });
  }

  // Validate that tokenType is a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tokenType);

  if (!isUUID) {
    throw createError({
      statusCode: 400,
      message: "Invalid token type ID format. Please provide a valid UUID.",
    });
  }

  // Find token type by ID
  const tokenTypeRecord = await models.icoTokenType.findOne({
    where: { id: tokenType },
  });

  if (!tokenTypeRecord) {
    throw createError({
      statusCode: 400,
      message: `Token type with ID ${tokenType} not found.`,
    });
  }

  // Verify if the user has sufficient wallet balance.
  const wallet = await getWallet(
    user.id,
    launchPlan.walletType,
    launchPlan.currency
  );
  if (!wallet || wallet.balance < launchPlan.price) {
    throw createError({
      statusCode: 400,
      message: "Insufficient balance for the launch.",
    });
  }

  // Wrap all DB operations in a transaction.
  const transaction = await sequelize.transaction();
  try {
    // Convert startDate string to a Date object.
    const startDateObj = new Date(startDate);

    // Calculate endDate by summing the durationDays of each phase.
    let totalDurationDays = 0;
    for (const phase of phases) {
      totalDurationDays += phase.durationDays;
    }
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + totalDurationDays);

    // Use the first phase's tokenPrice as the offering's tokenPrice.
    const tokenPrice = phases.length > 0 ? phases[0].tokenPrice : 0;

    // Create the main offering record.
    const offering = await models.icoTokenOffering.create(
      {
        userId: user.id,
        planId: launchPlan.id,
        typeId: tokenTypeRecord.id,
        name,
        icon,
        symbol: symbol.toUpperCase(),
        status: "PENDING",
        purchaseWalletCurrency: launchPlan.currency,
        purchaseWalletType: launchPlan.walletType,
        tokenPrice,
        targetAmount,
        startDate: startDateObj,
        endDate: endDateObj,
        participants: 0,
        isPaused: false,
        isFlagged: false,
        submittedAt: new Date(),
        website,
      },
      { transaction }
    );

    // Create token detail record with vesting configuration
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
        vestingEnabled: vestingEnabled || false,
        vestingSchedule: vestingEnabled ? vestingSchedule : null,
      },
      { transaction }
    );

    // Create offering phases (set remaining equal to allocation).
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

    // Create team member records if provided.
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

    // Create roadmap records if provided.
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

    // Re-read the wallet record inside the transaction using a row lock.
    const walletForUpdate = await models.wallet.findOne({
      where: { id: wallet.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!walletForUpdate) {
      throw new Error("Wallet not found during transaction.");
    }
    if (walletForUpdate.balance < launchPlan.price) {
      throw createError({
        statusCode: 400,
        message: "Insufficient wallet balance at transaction time.",
      });
    }

    // Deduct the launch fee from the user's wallet.
    await walletForUpdate.update(
      { balance: walletForUpdate.balance - launchPlan.price },
      { transaction }
    );

    // Commit the transaction after successful operations.
    await transaction.commit();

    // Create a detailed notification for the user about the successful offering creation.
    try {
      await createNotification({
        userId: user.id,
        relatedId: offering.id,
        title: "Offering Created",
        type: "system",
        message: `Your ICO offering "${offering.name}" has been created successfully.`,
        details:
          "Your offering is now pending review. You can track its progress and view more details on your dashboard.",
        link: `/ico/creator/token/${offering.id}`,
        actions: [
          {
            label: "View Offering",
            link: `/ico/creator/token/${offering.id}`,
            primary: true,
          },
        ],
      });
    } catch (notifErr) {
      console.error(
        "Failed to create notification for offering creation",
        notifErr
      );
      // You may decide whether a failure here should affect the response.
    }

    return {
      message: "Offering created successfully.",
    };
  } catch (err: any) {
    await transaction.rollback();
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
