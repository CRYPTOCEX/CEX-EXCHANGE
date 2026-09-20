"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const client_1 = require("./client");
exports.metadata = {
    summary: "Fetch patch notes for a specific product",
    operationId: "getProductPatchNotes",
    tags: ["Admin", "System"],
    parameters: [
        {
            name: "productId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Product ID, patch-note type or store slug ('35599184', 'core', 'bicrypto')",
        },
        {
            name: "since",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Only return releases newer than this version",
        },
    ],
    responses: {
        200: {
            description: "Product patch notes fetched successfully",
        },
    },
    requiresAuth: true,
    permission: "access.admin",
};
exports.default = async (data) => {
    var _a;
    const { productId } = data.params;
    const since = (_a = data.query) === null || _a === void 0 ? void 0 : _a.since;
    const params = new URLSearchParams({ content: "1" });
    if (since)
        params.set("since", since);
    try {
        return await (0, client_1.fetchDocsJson)((0, client_1.docsUrl)(`/api/docs/releases/${encodeURIComponent(productId)}`, params));
    }
    catch (_b) {
        return null;
    }
};
