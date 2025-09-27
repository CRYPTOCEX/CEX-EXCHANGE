import { updateRecordResponses } from "@b/utils/query";
import { kycUpdateSchema } from "../utils";
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { sendKycEmail } from "@b/utils/emails";
import { RedisSingleton } from "@b/utils/redis";

export const metadata = {
  summary: "Updates an existing KYC application",
  operationId: "updateKycApplication",
  tags: ["Admin", "CRM", "KYC"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the KYC application to update",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated data for the KYC application",
    content: {
      "application/json": {
        schema: kycUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("KYC Application"),
  requiresAuth: true,
  permission: "edit.kyc.application",
};

export default async (req: Handler): Promise<any> => {
  const { body, params } = req;
  const { id } = params;
  // Expecting payload to contain "status" and "adminNotes" (note: no "level" field here)
  const { status, adminNotes } = body;

  // Validate and sanitize admin notes
  if (adminNotes !== undefined) {
    if (typeof adminNotes !== "string") {
      throw createError({
        statusCode: 400,
        message: "Admin notes must be a string",
      });
    }
    
    // Check for maximum length to prevent DoS attacks
    if (adminNotes.length > 5000) {
      throw createError({
        statusCode: 400,
        message: "Admin notes cannot exceed 5000 characters",
      });
    }
    
    // Sanitize admin notes to prevent XSS
    const sanitizedNotes = sanitizeAdminNotes(adminNotes);
    if (sanitizedNotes !== adminNotes) {
      console.warn("Admin notes contained potentially dangerous content and were sanitized");
    }
    
    // Replace the original notes with sanitized version
    body.adminNotes = sanitizedNotes;
  }

  // Validate status if provided
  if (status !== undefined) {
    const validStatuses = ["PENDING", "APPROVED", "REJECTED", "ADDITIONAL_INFO_REQUIRED"];
    if (!validStatuses.includes(status)) {
      throw createError({
        statusCode: 400,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }
  }

  // Retrieve the KYC application (using the correct model name) with the user relation
  const kycApplication = await models.kycApplication.findByPk(id, {
    include: [{ model: models.user, as: "user" }],
  });
  if (!kycApplication) throw createError(404, "KYC application not found");

  // Store the old status for comparison
  const oldStatus = kycApplication.status;

  // Update the application fields (status and adminNotes)
  if (status) kycApplication.status = status;
  if (body.adminNotes !== undefined) kycApplication.adminNotes = body.adminNotes;

  kycApplication.reviewedAt = new Date(); // Set the reviewedAt timestamp
  await kycApplication.save();

  // Clear user cache if status changed (especially for approvals/rejections)
  // This ensures feature access is updated immediately
  if (status && status !== oldStatus) {
    try {
      const redis = RedisSingleton.getInstance();
      await redis.del(`user:${kycApplication.userId}:profile`);
    } catch (error) {
      console.error("Error clearing user cache:", error);
      // Don't fail the request if cache clearing fails
    }
  }

  // Fetch the associated level record using levelId and extract its level value
  const levelData = await models.kycLevel.findByPk(kycApplication.levelId);
  // For email purposes, we add a "level" field to our application object
  kycApplication.level = levelData ? levelData.level : "N/A";

  // Determine which email template to use based on the updated status.
  // We'll use:
  // - "KycApproved" if status is APPROVED
  // - "KycRejected" if status is REJECTED
  // - "KycUpdate" if status is ADDITIONAL_INFO_REQUIRED (or any update besides the above)
  let emailType: "KycApproved" | "KycRejected" | "KycUpdate" | null = null;
  if (status === "APPROVED") {
    emailType = "KycApproved";
  } else if (status === "REJECTED") {
    emailType = "KycRejected";
  } else if (status === "ADDITIONAL_INFO_REQUIRED") {
    emailType = "KycUpdate";
  }

  if (emailType) {
    try {
      await sendKycEmail(kycApplication.user, kycApplication, emailType);
    } catch (error) {
      console.error("Error sending KYC email:", error);
    }
  }

  return {
    message: "KYC application updated successfully",
  };
};

/**
 * Sanitize admin notes to prevent XSS and other injection attacks
 */
function sanitizeAdminNotes(notes: string): string {
  if (!notes) return "";
  
  // Remove potential HTML/XML tags
  let sanitized = notes.replace(/<[^>]*>/g, "");
  
  // Remove JavaScript-related content
  sanitized = sanitized.replace(/javascript:/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=/gi, "");
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gis, "");
  
  // Remove potential SQL injection patterns
  sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, "");
  
  // Remove excessive whitespace and normalize
  sanitized = sanitized.replace(/\s+/g, " ").trim();
  
  // Remove control characters except newlines and tabs
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  
  return sanitized;
}
