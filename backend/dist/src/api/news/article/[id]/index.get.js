"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("../../utils");
const feed_1 = require("../../feed");
const mobile_html_1 = require("@b/utils/mobile-html");
exports.metadata = {
    summary: "A single news article",
    description: "Proxies the operator's news provider for one article, keeping the API key on the server.",
    operationId: "getMarketNewsArticle",
    tags: ["News"],
    requiresAuth: false,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "A market_news UUID for a story from the operator's own feed, or the provider's numeric id for one from the vendor proxy.",
        },
    ],
    responses: {
        200: { description: "The provider payload, unchanged" },
        400: { description: "The id is neither of the two recognised shapes" },
        404: { description: "That story has been pulled or has aged out" },
        429: { description: "The provider is rate-limiting this deployment" },
        502: { description: "The provider could not be reached" },
        503: { description: "No news API key is configured on this deployment" },
    },
};
const LOCAL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
exports.default = async (data) => {
    var _a;
    var _b;
    const id = String((_b = (_a = data.params) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : "").trim();
    if (LOCAL_ID.test(id)) {
        const local = await (0, feed_1.localNewsArticle)(id);
        if (local)
            return (0, mobile_html_1.shapeHtmlForClient)(local, data);
        throw (0, error_1.createError)({ statusCode: 404, message: "That story is no longer available." });
    }
    if (!/^[0-9]{1,20}$/.test(id)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Unknown article." });
    }
    return (0, mobile_html_1.shapeHtmlForClient)(await (0, utils_1.fetchNews)(`/news/article/${id}`, {}, "object"), data);
};
