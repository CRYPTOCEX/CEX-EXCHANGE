"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeExtensionInFlight = describeExtensionInFlight;
const safe_imports_1 = require("@b/utils/safe-imports");
const console_1 = require("@b/utils/console");
const PROBES = {
    staking: "@b/api/(ext)/staking/utils/inflight",
    ecosystem: "@b/api/(ext)/ecosystem/utils/inflight",
    p2p: "@b/api/(ext)/p2p/utils/inflight",
    forex_trading: "@b/api/(ext)/forex-trading/utils/inflight",
};
const PROBE_TIMEOUT_MS = 3000;
async function describeExtensionInFlight(extensionName) {
    var _a;
    const modulePath = PROBES[extensionName];
    if (!modulePath)
        return null;
    try {
        const mod = (0, safe_imports_1.requireOptionalModule)(modulePath);
        if (typeof (mod === null || mod === void 0 ? void 0 : mod.describeInFlight) !== "function")
            return null;
        const report = await Promise.race([
            mod.describeInFlight(),
            new Promise((resolve) => setTimeout(() => resolve(null), PROBE_TIMEOUT_MS)),
        ]);
        if (!report || !Number.isFinite(report.count) || report.count <= 0)
            return null;
        return report;
    }
    catch (error) {
        console_1.logger.error("EXTENSION", `In-flight probe for "${extensionName}" failed, allowing the change: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        return null;
    }
}
