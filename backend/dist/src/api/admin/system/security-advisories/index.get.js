"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const client_1 = require("../patch-notes/client");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Security advisories that apply to this installation",
    operationId: "getSecurityAdvisories",
    tags: ["Admin", "System"],
    responses: {
        200: { description: "Advisories fetched successfully" },
    },
    requiresAuth: true,
    permission: "access.admin",
};
exports.default = async () => {
    var _a;
    const installed = await installedVersions();
    const params = new URLSearchParams();
    if (installed.core)
        params.set("version", installed.core);
    params.set("product", "core");
    try {
        const core = await (0, client_1.fetchDocsJson)((0, client_1.docsUrl)("/api/docs/security/advisories", params));
        const extras = await Promise.all(Object.entries(installed.extensions).map(async ([productId, version]) => {
            var _a;
            try {
                const q = new URLSearchParams({ product: productId });
                if (version)
                    q.set("version", version);
                const r = await (0, client_1.fetchDocsJson)((0, client_1.docsUrl)("/api/docs/security/advisories", q));
                return (_a = r === null || r === void 0 ? void 0 : r.advisories) !== null && _a !== void 0 ? _a : [];
            }
            catch (_b) {
                return [];
            }
        }));
        const advisories = [...((_a = core === null || core === void 0 ? void 0 : core.advisories) !== null && _a !== void 0 ? _a : []), ...extras.flat()];
        return {
            reachable: true,
            checkedAt: new Date().toISOString(),
            count: advisories.length,
            advisories,
        };
    }
    catch (e) {
        return {
            reachable: false,
            checkedAt: new Date().toISOString(),
            count: 0,
            advisories: [],
            message: "Could not reach the advisory service. This is NOT confirmation that " +
                "no advisories apply — check https://mashdiv.com/docs/bicrypto/security/advisories directly.",
        };
    }
};
async function installedVersions() {
    var _a, _b;
    let core = null;
    try {
        core = (_a = require("../../../../../package.json").version) !== null && _a !== void 0 ? _a : null;
    }
    catch (_c) {
        core = null;
    }
    const extensions = {};
    try {
        const rows = await db_1.models.extension.findAll({
            where: { status: true },
            attributes: ["productId", "version"],
        });
        for (const r of rows) {
            if (r.productId)
                extensions[r.productId] = (_b = r.version) !== null && _b !== void 0 ? _b : null;
        }
    }
    catch (_d) {
    }
    return { core, extensions };
}
