"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("@b/api/content/chrome/utils");
exports.metadata = {
    summary: "Get the current site chrome selection",
    operationId: "getAdminSiteChrome",
    tags: ["Admin", "Content", "Chrome"],
    responses: {
        200: {
            description: "Site chrome selection retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                                nullable: true,
                                description: "Id of the stored row, or null if none exists yet",
                            },
                            navbarVariant: { type: "string" },
                            footerVariant: { type: "string" },
                            menuOverrides: {
                                type: "object",
                                additionalProperties: true,
                                description: "Menu override patches keyed by scope",
                            },
                            footerContent: {
                                type: "object",
                                additionalProperties: true,
                                description: "Footer brand text, link override patch and social links",
                            },
                            createdAt: {
                                type: "string",
                                format: "date-time",
                                nullable: true,
                            },
                            updatedAt: {
                                type: "string",
                                format: "date-time",
                                nullable: true,
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.design",
    logModule: "ADMIN_CMS",
    logTitle: "Get site chrome",
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading site chrome selection");
    const row = await (0, utils_1.readSiteChromeRowStrict)();
    const config = (0, utils_1.normalizeChrome)(row);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(row ? "Site chrome selection retrieved" : "No site chrome row; returning defaults");
    return {
        id: (_a = row === null || row === void 0 ? void 0 : row.id) !== null && _a !== void 0 ? _a : null,
        navbarVariant: config.navbarVariant,
        footerVariant: config.footerVariant,
        menuOverrides: config.menuOverrides,
        footerContent: config.footerContent,
        createdAt: (_b = row === null || row === void 0 ? void 0 : row.createdAt) !== null && _b !== void 0 ? _b : null,
        updatedAt: (_c = row === null || row === void 0 ? void 0 : row.updatedAt) !== null && _c !== void 0 ? _c : null,
    };
};
