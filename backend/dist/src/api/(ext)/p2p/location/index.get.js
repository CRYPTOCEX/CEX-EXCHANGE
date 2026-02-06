"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "List Distinct Countries from User Profiles",
    description: "Retrieves a list of distinct countries extracted from user profile locations.",
    operationId: "listUserCountries",
    tags: ["User", "Countries"],
    logModule: "P2P",
    logTitle: "Get user countries",
    responses: {
        200: { description: "List of countries retrieved successfully." },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { ctx } = data || {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Querying distinct countries");
    try {
        const [results] = await db_1.sequelize.query(`
      SELECT DISTINCT
        JSON_UNQUOTE(JSON_EXTRACT(profile, '$.location.country')) AS country
      FROM user
      WHERE profile IS NOT NULL
        AND JSON_EXTRACT(profile, '$.location.country') IS NOT NULL
      ORDER BY country
    `);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${results.length} countries`);
        return results;
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to retrieve countries");
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error: " + err.message });
    }
};
