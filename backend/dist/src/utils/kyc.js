"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEffectiveKycStatus = getEffectiveKycStatus;
function getEffectiveKycStatus(applications) {
    var _a;
    if (!applications || applications.length === 0) {
        return {
            isVerified: false,
            level: 0,
            features: [],
            effectiveApplication: null,
            allApplications: [],
        };
    }
    const approvedApps = applications.filter((app) => app.status === "APPROVED" && app.level);
    if (approvedApps.length === 0) {
        return {
            isVerified: false,
            level: 0,
            features: [],
            effectiveApplication: null,
            allApplications: applications,
        };
    }
    approvedApps.sort((a, b) => { var _a, _b; return (((_a = b.level) === null || _a === void 0 ? void 0 : _a.level) || 0) - (((_b = a.level) === null || _b === void 0 ? void 0 : _b.level) || 0); });
    const highestApproved = approvedApps[0];
    const allFeatures = new Set();
    for (const app of approvedApps) {
        const levelData = app.level;
        if (levelData === null || levelData === void 0 ? void 0 : levelData.features) {
            try {
                const features = typeof levelData.features === "string"
                    ? JSON.parse(levelData.features)
                    : levelData.features;
                if (Array.isArray(features)) {
                    features.forEach((f) => allFeatures.add(f));
                }
            }
            catch (_b) {
            }
        }
    }
    return {
        isVerified: true,
        level: ((_a = highestApproved.level) === null || _a === void 0 ? void 0 : _a.level) || 0,
        features: Array.from(allFeatures),
        effectiveApplication: highestApproved,
        allApplications: applications,
    };
}
