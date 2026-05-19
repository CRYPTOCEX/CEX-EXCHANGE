"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Get template options",
    operationId: "getMailwizardTemplateOptions",
    tags: ["Admin", "Mailwizard", "Templates"],
    description: "Retrieves a simplified list of all Mailwizard templates (ID and name only) for use in dropdown selections and UI components. This endpoint is optimized for quick loading in form selects.",
    requiresAuth: true,
    logModule: "ADMIN_MAIL",
    logTitle: "Get Mail Template Options",
    responses: {
        200: {
            description: "Mailwizard template options retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string", description: "Template ID" },
                                name: { type: "string", description: "Template name" },
                            },
                            required: ["id", "name"],
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Mailwizard Template"),
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    try {
        const templates = await db_1.models.mailwizardTemplate.findAll();
        const formatted = templates.map((template) => ({
            id: template.id,
            name: template.name,
        }));
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Mail Template Options retrieved successfully");
        return formatted;
    }
    catch (error) {
        throw (0, error_1.createError)(500, "An error occurred while fetching mailwizard templates");
    }
};
