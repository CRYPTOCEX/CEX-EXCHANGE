import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Add a Team Member to an ICO Offering",
  description:
    "Adds a new team member to the specified ICO offering for the authenticated creator.",
  operationId: "addTeamMember",
  tags: ["ICO", "Creator", "Team"],
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
  requestBody: {
    description: "Team member data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            role: { type: "string" },
            bio: { type: "string" },
            avatar: { type: "string" },
            linkedin: { type: "string" },
            twitter: { type: "string" },
            website: { type: "string" },
            github: { type: "string" },
          },
          required: ["name", "role", "bio"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Team member added successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: { message: { type: "string" } },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: { user?: any; params?: any; body?: any }) => {
  const { user, params, body } = data;
  const offeringId = params.id;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  if (!offeringId) {
    throw createError({ statusCode: 400, message: "Offering ID is required" });
  }

  // Fetch offering with plan and current team members for limit check
  const offering = await models.icoTokenOffering.findOne({
    where: { id: offeringId, userId: user.id },
    include: [
      { model: models.icoLaunchPlan, as: "plan" },
      { model: models.icoTeamMember, as: "teamMembers" },
    ],
  });
  if (!offering) {
    throw createError({ statusCode: 404, message: "Offering not found" });
  }

  // Check team member limit based on the launch plan's features.
  if (
    offering.plan &&
    offering.teamMembers.length >= offering.plan.features.maxTeamMembers
  ) {
    throw createError({
      statusCode: 400,
      message:
        "Team member limit reached. Upgrade your plan to add more team members.",
    });
  }

  await models.icoTeamMember.create({
    ...body,
    offeringId,
  });

  // Create a notification about the new team member.
  try {
    await createNotification({
      userId: user.id,
      relatedId: offeringId,
      type: "system",
      title: "New Team Member Added",
      message: `New team member "${body.name}" added successfully.`,
      details: "A new team member has been added to your ICO offering.",
      link: `/ico/creator/token/${offeringId}?tab=team`,
      actions: [
        {
          label: "View Team",
          link: `/ico/creator/token/${offeringId}?tab=team`,
          primary: true,
        },
      ],
    });
  } catch (notifErr) {
    console.error(
      "Failed to create notification for team member addition",
      notifErr
    );
  }

  return { message: "Team member added successfully" };
};
