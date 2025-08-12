import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { stringify } from "csv-stringify/sync";

export const metadata: OperationObject = {
  summary: "Export all users as a CSV file",
  operationId: "exportUsersToCSV",
  tags: ["Admin", "CRM", "User"],
  parameters: [
    {
      name: "includePasswords",
      in: "query",
      description: "Include encrypted passwords in export",
      required: false,
      schema: {
        type: "boolean",
        default: false,
      },
    },
    {
      name: "status",
      in: "query",
      description: "Filter by user status",
      required: false,
      schema: {
        type: "string",
        enum: ["ACTIVE", "INACTIVE", "BANNED", "SUSPENDED"],
      },
    },
  ],
  responses: {
    200: {
      description: "CSV file with user data",
      content: {
        "text/csv": {
          schema: {
            type: "string",
          },
        },
      },
    },
    401: {
      description: "Unauthorized access",
    },
  },
  requiresAuth: true,
  permission: "export.user",
};

export default async (data: Handler) => {
  const { user, query } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized access" });
  }

  const includePasswords = query?.includePasswords === "true";
  const statusFilter = query?.status;

  // Build query conditions
  const whereConditions: any = {};
  if (statusFilter) {
    whereConditions.status = statusFilter;
  }

  // Fetch all user details with associations
  const users = await models.user.findAll({
    where: whereConditions,
    include: [
      { model: models.role, as: "role" },
    ],
    order: [["createdAt", "DESC"]],
  });

  // Prepare data for CSV
  const csvData = users.map((user) => {
    const userData: any = {
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      password: includePasswords ? user.password : "", // Only include if requested
      phone: user.phone || "",
      status: user.status || "ACTIVE",
      emailVerified: user.emailVerified ? "true" : "false",
      twoFactor: user.twoFactor ? "true" : "false",
      roleId: user.roleId || "",
      avatar: user.avatar || "",
    };

    // Add profile data if exists
    if (user.profile) {
      const profile = typeof user.profile === "string" 
        ? JSON.parse(user.profile) 
        : user.profile;
      
      userData.bio = profile.bio || "";
      userData.address = profile.location?.address || "";
      userData.city = profile.location?.city || "";
      userData.country = profile.location?.country || "";
      userData.zip = profile.location?.zip || "";
      userData.facebook = profile.social?.facebook || "";
      userData.twitter = profile.social?.twitter || "";
      userData.instagram = profile.social?.instagram || "";
      userData.github = profile.social?.github || "";
      userData.dribbble = profile.social?.dribbble || "";
      userData.gitlab = profile.social?.gitlab || "";
    } else {
      // Add empty fields for profile data
      userData.bio = "";
      userData.address = "";
      userData.city = "";
      userData.country = "";
      userData.zip = "";
      userData.facebook = "";
      userData.twitter = "";
      userData.instagram = "";
      userData.github = "";
      userData.dribbble = "";
      userData.gitlab = "";
    }

    return userData;
  });

  // Convert to CSV
  const csv = stringify(csvData, {
    header: true,
    columns: [
      "email",
      "firstName",
      "lastName",
      "password",
      "phone",
      "status",
      "emailVerified",
      "twoFactor",
      "roleId",
      "avatar",
      "bio",
      "address",
      "city",
      "country",
      "zip",
      "facebook",
      "twitter",
      "instagram",
      "github",
      "dribbble",
      "gitlab",
    ],
  });

  // Return CSV with appropriate headers
  return {
    data: csv,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="users_export_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  };
};