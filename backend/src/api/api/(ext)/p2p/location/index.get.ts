import { models, sequelize } from "@b/db";
import { serverErrorResponse } from "@b/utils/query";

export const metadata = {
  summary: "List Distinct Countries from User Profiles",
  description:
    "Retrieves a list of distinct countries extracted from user profile locations.",
  operationId: "listUserCountries",
  tags: ["User", "Countries"],
  responses: {
    200: { description: "List of countries retrieved successfully." },
    500: serverErrorResponse,
  },
};

export default async () => {
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
    return results;
  } catch (err: any) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
