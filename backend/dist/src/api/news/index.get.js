"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("./utils");
const feed_1 = require("./feed");
const mobile_html_1 = require("@b/utils/mobile-html");
exports.metadata = {
    summary: "Latest market news",
    description: "Serves the operator's configured news providers (Admin -> System -> News), falling back to a server-side CryptoCompare proxy when nothing has been synced. The API key never reaches the client either way.",
    operationId: "getMarketNews",
    tags: ["News"],
    requiresAuth: false,
    parameters: [
        {
            name: "sortOrder",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["latest", "popular"] },
            description: "Ordering. Anything else is ignored.",
        },
        {
            name: "categories",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Comma-separated provider categories.",
        },
        {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100 },
            description: "Clamped to 100 — this endpoint spends a metered quota.",
        },
        {
            name: "offset",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 0 },
            description: "Page start, honoured by the operator's own feed. The vendor proxy has no paging, so it ignores this.",
        },
    ],
    responses: {
        200: {
            description: "The provider payload, unchanged",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            Data: { type: "array", items: { type: "object" } },
                        },
                    },
                },
            },
        },
        429: { description: "The provider is rate-limiting this deployment" },
        502: { description: "The provider could not be reached" },
        503: {
            description: "Nothing has been synced and no news API key is configured on this deployment",
        },
    },
};
exports.default = async (data) => {
    const { query } = data;
    const local = await (0, feed_1.localNewsEnvelope)(query !== null && query !== void 0 ? query : {});
    if (local)
        return (0, mobile_html_1.shapeHtmlForClient)(local, data);
    return (0, mobile_html_1.shapeHtmlForClient)(await (0, utils_1.fetchNews)("/news/", (0, utils_1.newsQuery)(query !== null && query !== void 0 ? query : {})), data);
};
