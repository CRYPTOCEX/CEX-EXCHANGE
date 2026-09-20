"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const client_1 = require("./client");
exports.metadata = {
    summary: "Fetch the release-notes manifest for every product",
    operationId: "getPatchNotes",
    tags: ["Admin", "System"],
    responses: {
        200: {
            description: "Patch notes fetched successfully",
        },
    },
    requiresAuth: true,
    permission: "access.admin",
};
exports.default = async () => {
    var _a, _b, _c, _d;
    try {
        const manifest = await (0, client_1.fetchDocsJson)((0, client_1.docsUrl)("/api/docs/releases/manifest", new URLSearchParams({ tags: "1" })));
        const extensions = {};
        for (const product of (_a = manifest.products) !== null && _a !== void 0 ? _a : []) {
            extensions[product.docsKey] = {
                type: product.docsKey,
                productId: product.envatoItemId,
                name: product.name,
                latest: product.latest,
                versions: ((_b = product.releases) !== null && _b !== void 0 ? _b : []).map((r) => { var _a, _b; return ({
                    version: r.version,
                    metadata: {
                        title: `${product.name} v${r.version}`,
                        releaseDate: (_a = r.date) !== null && _a !== void 0 ? _a : "",
                        tags: (_b = r.tags) !== null && _b !== void 0 ? _b : [],
                    },
                }); }),
            };
        }
        return {
            buildTime: (_c = manifest.builtAt) !== null && _c !== void 0 ? _c : null,
            version: (_d = manifest.sha) !== null && _d !== void 0 ? _d : null,
            extensions,
        };
    }
    catch (_e) {
        return { buildTime: null, version: null, extensions: {} };
    }
};
