import { models, sequelize } from "@b/db";
import { serverErrorResponse } from "@b/utils/query";

export const metadata = {
  summary: "List Distinct Countries from User Profiles",
  description:
    "Retrieves a list of distinct countries extracted from user profile locations.",
  operationId: "listUserCountries",
  tags: ["User", "Countries"],
  logModule: "P2P",
  logTitle: "Get user countries",
  responses: {
    200: { description: "List of countries retrieved successfully." },
    500: serverErrorResponse,
  },
};

export default async (data: { ctx?: any }) => {
  const { ctx } = data || {};

  ctx?.step("Querying distinct countries");
  try {
    // Use correct table name "user"
    const [results] = await sequelize.query(`
      SELECT DISTINCT
        JSON_UNQUOTE(JSON_EXTRACT(profile, '$.location.country')) AS country
      FROM user
      WHERE profile IS NOT NULL
        AND JSON_EXTRACT(profile, '$.location.country') IS NOT NULL
      ORDER BY country
    `);

    ctx?.success(`Retrieved ${(results as any[]).length} countries`);
    return results;
  } catch (err: any) {
    ctx?.fail(err.message || "Failed to retrieve countries");
    throw new Error("Internal Server Error: " + err.message);
  }
};
