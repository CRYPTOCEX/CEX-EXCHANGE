import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { sendIcoEmail } from "../../utils";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Manage ICO Offering",
  description:
    "Performs an admin action on an ICO offering. The action is determined by the 'action' query parameter, which accepts one of: approve, flag, pause, reject, resume, or unflag. Depending on the action, the offering’s status is updated, admin activity is logged, and an email and in‑app notification is sent to the project owner if applicable.",
  operationId: "manageIcoOffering",
  tags: ["ICO", "Admin", "Offerings"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: {
        type: "string",
        description: "The ID of the ICO offering.",
      },
    },
    {
      index: 1,
      name: "action",
      in: "query",
      required: true,
      schema: {
        type: "string",
        enum: ["approve", "flag", "pause", "reject", "resume", "unflag"],
        description:
          "The admin action to perform on the ICO offering. Allowed values: approve, flag, pause, reject, resume, unflag.",
      },
    },
  ],
  requestBody: {
    required: false,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            notes: {
              type: "string",
              description:
                "Optional notes for the action (required for rejection, optional for flagging).",
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "ICO offering updated successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              offering: { type: "object" },
            },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized – Admin authentication required." },
    404: {
      description:
        "ICO offering not found or the current status is invalid for the requested action.",
    },
    500: { description: "Internal Server Error" },
  },
  permission: "edit.ico.offer",
};

// Mapping for offering update actions.
// Each function returns an object with optional emailTemplate and emailData.
const offeringActions = {
  approve: async (offering, now, body) => {
    if (offering.status !== "PENDING") {
      throw createError({
        statusCode: 404,
        message: "ICO offering not found or not pending.",
      });
    }
    await offering.update({ status: "ACTIVE", approvedAt: now });
    return {
      emailTemplate: "IcoOfferingApproved",
      emailData: {
        OFFERING_NAME: offering.name,
        APPROVED_AT: now.toLocaleString(),
      },
      message: "ICO offering approved successfully.",
    };
  },
  flag: async (offering, now, body) => {
    await offering.update({ isFlagged: true });
    return {
      emailTemplate: "IcoOfferingFlagged",
      emailData: {
        OFFERING_NAME: offering.name,
        FLAG_REASON: body?.notes || "No additional reason provided",
      },
      message: "ICO offering flagged successfully.",
    };
  },
  pause: async (offering, now, body) => {
    if (offering.status !== "ACTIVE") {
      throw createError({
        statusCode: 404,
        message: "ICO offering not found or not active.",
      });
    }
    await offering.update({ isPaused: true });
    return {
      message: "ICO offering paused successfully.",
    };
  },
  reject: async (offering, now, body) => {
    if (offering.status !== "PENDING") {
      throw createError({
        statusCode: 404,
        message: "ICO offering not found or not pending.",
      });
    }
    if (!body?.notes || !body.notes.trim()) {
      throw createError({
        statusCode: 400,
        message: "Rejection notes are required.",
      });
    }
    await offering.update({
      status: "REJECTED",
      rejectedAt: now,
      reviewNotes: body.notes,
    });
    return {
      emailTemplate: "IcoOfferingRejected",
      emailData: {
        OFFERING_NAME: offering.name,
        REJECTION_REASON: body.notes,
      },
      message: "ICO offering rejected successfully.",
    };
  },
  resume: async (offering, now, body) => {
    if (offering.status !== "ACTIVE" || !offering.isPaused) {
      throw createError({
        statusCode: 404,
        message: "ICO offering not found or not paused.",
      });
    }
    await offering.update({ isPaused: false });
    return {
      message: "ICO offering resumed successfully.",
    };
  },
  unflag: async (offering, now, body) => {
    await offering.update({ isFlagged: false });
    return {
      emailTemplate: "IcoOfferingUnflagged",
      emailData: {
        OFFERING_NAME: offering.name,
      },
      message: "ICO offering unflagged successfully.",
    };
  },
};

// Mapping for in‑app notification payloads per action.
const notifMapping = {
  approve: {
    title: "Offering Approved",
    message: (name) => `Your ICO offering "${name}" has been approved.`,
    details: (now) => `Your offering was approved on ${now.toLocaleString()}.`,
  },
  flag: {
    title: "Offering Flagged",
    message: (name) => `Your ICO offering "${name}" has been flagged.`,
    details: (emailData) =>
      `Your offering has been flagged for review. Reason: ${emailData.FLAG_REASON}.`,
  },
  reject: {
    title: "Offering Rejected",
    message: (name) => `Your ICO offering "${name}" has been rejected.`,
    details: (emailData) =>
      `Your offering was rejected. Reason: ${emailData.REJECTION_REASON}.`,
  },
  unflag: {
    title: "Offering Unflagged",
    message: (name) => `Your ICO offering "${name}" has been unflagged.`,
    details: () => `The flag has been removed from your offering.`,
  },
  pause: {
    title: "Offering Paused",
    message: (name) => `Your ICO offering "${name}" has been paused.`,
    details: () => `Your offering has been paused.`,
  },
  resume: {
    title: "Offering Resumed",
    message: (name) => `Your ICO offering "${name}" has been resumed.`,
    details: () => `Your offering has been resumed.`,
  },
};

export default async (data: Handler) => {
  const { params, query, body, user } = data;
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Admin privileges required.",
    });
  }

  const offeringId = params.id;
  const action = (query.action || "").toLowerCase();
  const allowedActions = [
    "approve",
    "flag",
    "pause",
    "reject",
    "resume",
    "unflag",
  ];

  if (!allowedActions.includes(action)) {
    throw createError({
      statusCode: 400,
      message:
        "Invalid or missing action. Allowed actions: approve, flag, pause, reject, resume, unflag.",
    });
  }

  // Fetch the offering
  const offering = await models.icoTokenOffering.findOne({
    where: { id: offeringId },
  });
  if (!offering) {
    throw createError({ statusCode: 404, message: "ICO offering not found." });
  }

  const now = new Date();

  // Process the action using the offeringActions mapping
  let result;
  try {
    result = await offeringActions[action](offering, now, body);
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message,
    });
  }

  // Log admin activity
  await models.icoAdminActivity.create({
    type: action,
    offeringId: offering.id,
    offeringName: offering.name,
    timestamp: now,
    adminId: user.id,
    adminName: `${user.firstName} ${user.lastName}`,
  });

  // Fetch the owner (project creator)
  const owner = await models.user.findByPk(offering.submittedBy);

  // Helper to send an email if recipient exists
  const sendEmailIfNeeded = async (
    templateName: string,
    recipient,
    dataObj
  ) => {
    if (recipient?.email) {
      try {
        await sendIcoEmail(templateName, recipient.email, dataObj);
      } catch (emailErr) {
        console.error(`Failed to send ${templateName} email`, emailErr);
      }
    }
  };

  // Send email if an email template was provided by the action result
  if (result.emailTemplate && owner) {
    const emailData = {
      ...result.emailData,
      PROJECT_OWNER_NAME: `${owner.firstName} ${owner.lastName}`,
    };
    await sendEmailIfNeeded(result.emailTemplate, owner, emailData);
  }

  // Send an in‑app notification using the notifMapping
  if (owner && notifMapping[action]) {
    const notif = notifMapping[action];
    try {
      await createNotification({
        userId: owner.id,
        relatedId: offering.id,
        type: "system",
        title: notif.title,
        message: notif.message(offering.name),
        details:
          typeof notif.details === "function"
            ? notif.details(result.emailData || now)
            : "",
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
        `Failed to create in‑app notification for action ${action}`,
        notifErr
      );
    }
  }

  return {
    message: result.message || "ICO offering updated successfully.",
  };
};
