"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Get the public site chrome selection",
    operationId: "getPublicSiteChrome",
    tags: ["Content", "Chrome"],
    responses: {
        200: {
            description: "Site chrome selection retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            navbarVariant: {
                                type: "string",
                                description: "Id of the navbar layout variant to render",
                            },
                            footerVariant: {
                                type: "string",
                                description: "Id of the footer layout variant to render",
                            },
                            menuOverrides: {
                                type: "object",
                                additionalProperties: true,
                                description: "Menu override patches keyed by scope, limited to the scopes a public page can render (`user` and the non-admin `ext_*` menus). `admin` and every `ext_admin_*` scope are withheld from this endpoint. `{}` means every menu renders exactly as shipped.",
                            },
                            footerContent: {
                                type: "object",
                                additionalProperties: true,
                                description: "Footer brand text, link override patch and social links. Nulls mean 'fall back to the env/settings value'.",
                            },
                        },
                        required: [
                            "navbarVariant",
                            "footerVariant",
                            "menuOverrides",
                            "footerContent",
                        ],
                    },
                },
            },
        },
        500: query_1.serverErrorResponse,
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    const row = await (0, utils_1.readSiteChromeRow)();
    return (0, utils_1.toPublicChrome)(row);
};
