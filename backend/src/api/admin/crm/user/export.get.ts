// /server/api/admin/users/export.get.ts

import { createError } from "@b/utils/error";
import { models } from "@b/db";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

export const metadata: OperationObject = {
  summary: "Export all users as an Excel file with detailed information",
  operationId: "exportUsersToExcel",
  tags: ["Admin", "CRM", "User"],
  responses: {
    200: {
      description: "Excel file created successfully",
    },
  },
  requiresAuth: true,
  permission: "view.user",
};

export default async (data: Handler) => {
  const { user } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized access" });
  }

  // Fetch all user details with associations
  const users = await models.user.findAll({
    include: [
      { model: models.role, as: "role" },
      { model: models.kyc, as: "kyc" },
    ],
  });

  // Prepare data for Excel
  const userData = users.map((user) => ({
    ID: user.id,
    FirstName: user.firstName || "N/A",
    LastName: user.lastName || "N/A",
    Email: user.email || "N/A",
    EmailVerified: user.emailVerified ? "Yes" : "No",
    Phone: user.phone || "N/A",
    Role: user.role?.name || "N/A",
    Status: user.status,
    KYC_Status: user.kyc?.status || "N/A",
    CreatedAt: user.createdAt?.toISOString() || "N/A",
    LastLogin: user.lastLogin?.toISOString() || "N/A",
  }));

  // Create a worksheet
  const worksheet = XLSX.utils.json_to_sheet(userData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

  // Set file path and name
  const filePath = path.join(process.cwd(), "exports", "users.xlsx");

  // Create directory if not exists
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  // Write to the file
  XLSX.writeFile(workbook, filePath);

  return {
    message: `Excel file created successfully at ${filePath}`,
  };
};
