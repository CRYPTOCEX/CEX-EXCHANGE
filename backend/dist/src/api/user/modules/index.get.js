"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const Middleware_1 = require("@b/handler/Middleware");
const kyc_1 = require("@b/utils/kyc");
const utils_1 = require("@b/api/user/profile/utils");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
const attestation_1 = require("@b/utils/attestation");
const safe_imports_1 = require("@b/utils/safe-imports");
const utils_2 = require("./utils");
exports.metadata = {
    summary: "Modules available to the current user",
    description: "Returns every mobile module with its installed / enabled / licensed state and " +
        "whether this caller may see it, taking role and KYC into account. This is the " +
        "sole input to the native app's navigation.",
    operationId: "getUserModules",
    tags: ["User", "Modules"],
    requiresAuth: true,
    logModule: "MODULES",
    logTitle: "Module availability",
    responses: {
        200: {
            description: "Module availability for this caller",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            user: {
                                type: "object",
                                properties: {
                                    roleName: { type: "string" },
                                    isSuperAdmin: { type: "boolean" },
                                    kycLevel: { type: "number" },
                                    kycEnforced: { type: "boolean" },
                                },
                            },
                            modules: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        title: { type: "string" },
                                        extension: { type: "string", nullable: true },
                                        installed: { type: "boolean" },
                                        enabled: { type: "boolean" },
                                        licensed: { type: "boolean" },
                                        kycRequired: { type: "boolean" },
                                        kycSatisfied: { type: "boolean" },
                                        visible: { type: "boolean" },
                                        reason: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
    },
};
exports.default = async (data) => {
    var _a;
    var _b, _c;
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const rows = await db_1.models.extension.findAll({
        attributes: ["name", "productId", "title", "version", "status"],
    });
    const byName = new Map(rows.map((r) => [r.name, r]));
    const cacheManager = cache_1.CacheManager.getInstance();
    const profile = await (0, utils_1.getUserById)(user.id);
    const roleName = (_b = (_a = profile === null || profile === void 0 ? void 0 : profile.role) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "";
    const isSuperAdmin = roleName === "Super Admin";
    const kycLevel = Number((_c = profile === null || profile === void 0 ? void 0 : profile.kycLevel) !== null && _c !== void 0 ? _c : 0);
    const kycEnforced = await (0, kyc_1.isKycFeatureEnforcementEnabled)();
    const residence = await (0, attestation_1.resolveResidence)(user.id);
    const attestedModules = await (0, attestation_1.attestedModulesFor)(residence);
    let stakingMode = "SYNTHETIC";
    try {
        const stakingSettings = await (0, safe_imports_1.getStakingSettingsUtils)();
        if (stakingSettings === null || stakingSettings === void 0 ? void 0 : stakingSettings.getStakingMode) {
            stakingMode = await stakingSettings.getStakingMode();
        }
    }
    catch (_d) {
        stakingMode = "SYNTHETIC";
    }
    let openOnChainPromise = null;
    const callerHoldsOpenOnChainPosition = () => {
        if (!openOnChainPromise) {
            openOnChainPromise = (async () => {
                try {
                    const model = db_1.models === null || db_1.models === void 0 ? void 0 : db_1.models.stakingPosition;
                    if (!(model === null || model === void 0 ? void 0 : model.count))
                        return false;
                    const count = await model.count({
                        where: {
                            userId: user.id,
                            mode: "REAL",
                            status: [
                                "PENDING_DELEGATION",
                                "ACTIVE",
                                "UNSTAKE_REQUESTED",
                                "UNBONDING",
                                "WITHDRAWABLE",
                            ],
                        },
                    });
                    return Number(count) > 0;
                }
                catch (error) {
                    console_1.logger.error("MODULES", `Could not read on-chain positions for "${user.id}": ${error === null || error === void 0 ? void 0 : error.message}`);
                    return true;
                }
            })();
        }
        return openOnChainPromise;
    };
    const modules = await Promise.all(utils_2.MOBILE_MODULES.map(async (def) => {
        const row = def.extension ? byName.get(def.extension) : null;
        const installed = def.extension === null ? true : Boolean(row);
        const extensionEnabled = def.extension === null ? true : Boolean(row === null || row === void 0 ? void 0 : row.status);
        let operationallyEnabled = true;
        if (def.operationalSetting !== null) {
            operationallyEnabled = await cacheManager.getSettingBool(def.operationalSetting, true);
        }
        if (def.blockedBySetting !== null) {
            const value = await cacheManager.getSetting(def.blockedBySetting);
            if (value === true || value === "true")
                operationallyEnabled = false;
        }
        const requiresExtensions = def.id === "staking" && stakingMode === "REAL"
            ? [...def.requiresExtensions, "ecosystem", "dex"]
            : def.requiresExtensions;
        let missingCoRequisite = requiresExtensions.find((name) => !byName.has(name));
        let disabledCoRequisite = requiresExtensions.find((name) => { var _a; return byName.has(name) && !((_a = byName.get(name)) === null || _a === void 0 ? void 0 : _a.status); });
        if (def.id === "staking" &&
            stakingMode === "REAL" &&
            (missingCoRequisite !== undefined || disabledCoRequisite !== undefined) &&
            (await callerHoldsOpenOnChainPosition())) {
            missingCoRequisite = undefined;
            disabledCoRequisite = undefined;
        }
        if (disabledCoRequisite !== undefined)
            operationallyEnabled = false;
        if (def.id === "staking" && stakingMode === "REAL" && operationallyEnabled) {
            let unlicensedCoRequisite = false;
            for (const name of ["ecosystem", "dex"]) {
                if (!byName.has(name))
                    continue;
                try {
                    if (!(await (0, Middleware_1.isExtensionLicenseValid)(name))) {
                        unlicensedCoRequisite = true;
                        break;
                    }
                }
                catch (error) {
                    console_1.logger.error("MODULES", `Co-requisite licence check failed for "${name}": ${error === null || error === void 0 ? void 0 : error.message}`);
                    unlicensedCoRequisite = true;
                    break;
                }
            }
            if (unlicensedCoRequisite && !(await callerHoldsOpenOnChainPosition())) {
                operationallyEnabled = false;
            }
        }
        const enabled = extensionEnabled && operationallyEnabled;
        let licensed = true;
        if (def.extension !== null && installed) {
            try {
                licensed = await (0, Middleware_1.isExtensionLicenseValid)(def.extension);
            }
            catch (error) {
                console_1.logger.error("MODULES", `Licence check failed for "${def.extension}": ${error === null || error === void 0 ? void 0 : error.message}`);
                licensed = false;
            }
        }
        else if (def.extension !== null) {
            licensed = false;
        }
        const kycRequired = def.kycFeature !== null;
        const kycSatisfied = kycRequired
            ? await (0, kyc_1.hasKycFeature)(user.id, def.kycFeature)
            : true;
        const attested = def.requiresAttestation
            ? attestedModules.has(def.id)
            : true;
        let reason = "OK";
        if (!installed || missingCoRequisite !== undefined)
            reason = "NOT_INSTALLED";
        else if (!enabled)
            reason = "DISABLED";
        else if (!licensed)
            reason = "UNLICENSED";
        else if (!attested)
            reason = "NOT_ATTESTED";
        else if (!kycSatisfied)
            reason = "KYC_REQUIRED";
        return {
            id: def.id,
            title: def.title,
            extension: def.extension,
            installed: installed && missingCoRequisite === undefined,
            enabled,
            licensed,
            kycRequired,
            kycSatisfied,
            attestationRequired: def.requiresAttestation,
            attested,
            visible: reason === "OK",
            reason,
            ...(def.id === "staking" ? { mode: stakingMode } : {}),
        };
    }));
    return {
        user: { roleName, isSuperAdmin, kycLevel, kycEnforced, residence },
        modules,
    };
};
