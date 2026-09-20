"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initModels = initModels;
exports.createUserCacheHooks = createUserCacheHooks;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sequelize_1 = require("sequelize");
const redis_1 = require("@b/utils/redis");
const safe_imports_1 = require("@b/utils/safe-imports");
const isProduction = process.env.NODE_ENV === "production";
function addonOfModelFile(filePath) {
    const m = /(?:^|[\\/])models[\\/]ext[\\/]([^\\/]+)[\\/]/.exec(filePath);
    return m ? m[1] : null;
}
function initModels(sequelize) {
    var _a, _b;
    if (!sequelize || !(sequelize instanceof sequelize_1.Sequelize)) {
        throw new Error("Invalid Sequelize instance passed to initModels");
    }
    const models = {};
    const currentFileName = path_1.default.basename(__filename);
    const fileExtension = isProduction ? ".js" : ".ts";
    const modelFiles = [];
    function walkDir(dir) {
        fs_1.default.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
            const fullPath = path_1.default.join(dir, entry.name);
            if (entry.isDirectory()) {
                walkDir(fullPath);
            }
            else if (entry.isFile() &&
                path_1.default.extname(entry.name) === fileExtension &&
                entry.name !== currentFileName &&
                !entry.name.includes("index")) {
                modelFiles.push(fullPath);
            }
        });
    }
    try {
        walkDir(__dirname);
        const skippedAddons = new Set();
        const modelFileOwner = new Map();
        for (const filePath of modelFiles) {
            const addon = addonOfModelFile(filePath);
            if (addon && skippedAddons.has(addon))
                continue;
            let modelModule;
            try {
                modelModule = require(filePath);
            }
            catch (error) {
                if (addon && (0, safe_imports_1.isMissingOptionalAddon)(error, filePath)) {
                    skippedAddons.add(addon);
                    for (const [modelName, owner] of modelFileOwner) {
                        if (owner !== addon)
                            continue;
                        const stale = models[modelName];
                        delete models[modelName];
                        modelFileOwner.delete(modelName);
                        try {
                            (_b = (_a = sequelize.modelManager) === null || _a === void 0 ? void 0 : _a.removeModel) === null || _b === void 0 ? void 0 : _b.call(_a, stale);
                        }
                        catch (_c) {
                        }
                    }
                    console.warn(`[MODELS] Skipping the "${addon}" models: ${error.message.split("\n")[0]}. ` +
                        `That addon is not installed on this server — its tables will not be created.`);
                    continue;
                }
                throw error;
            }
            const model = modelModule.default || modelModule;
            if (model && typeof model.initModel === "function") {
                const initializedModel = model.initModel(sequelize);
                const modelName = initializedModel.name;
                if (!modelName) {
                    console.error(`Model from file ${filePath} has no modelName set.`);
                    continue;
                }
                models[modelName] = initializedModel;
                if (addon)
                    modelFileOwner.set(modelName, addon);
            }
            else {
                console.error(`Model from file ${filePath} does not have an initModel method or a valid export structure.`);
            }
        }
        const SequelizeModel = sequelize_1.Sequelize.Model;
        const associationMethods = [
            "belongsTo",
            "hasOne",
            "hasMany",
            "belongsToMany",
        ];
        const originalAssociationMethods = new Map();
        const droppedAssociations = [];
        let associatingAddon = null;
        for (const method of associationMethods) {
            const original = SequelizeModel[method];
            if (typeof original !== "function")
                continue;
            originalAssociationMethods.set(method, original);
            SequelizeModel[method] = function (target, options = {}) {
                var _a, _b;
                var _c;
                const base = (_c = (_b = (_a = this.sequelize) === null || _a === void 0 ? void 0 : _a.Sequelize) === null || _b === void 0 ? void 0 : _b.Model) !== null && _c !== void 0 ? _c : SequelizeModel;
                const isModel = target && target.prototype && target.prototype instanceof base;
                if (!isModel && associatingAddon) {
                    const alias = options && options.as ? ` as "${options.as}"` : "";
                    droppedAssociations.push(`${this.name}.${method}(…${alias})`);
                    return undefined;
                }
                return original.call(this, target, options);
            };
        }
        try {
            for (const modelName of Object.keys(models)) {
                const model = models[modelName];
                if (typeof model.associate !== "function")
                    continue;
                const addon = modelFileOwner.get(modelName) || null;
                associatingAddon = addon;
                try {
                    model.associate(models);
                }
                catch (error) {
                    if (!addon)
                        throw error;
                    console.warn(`[MODELS] The "${addon}" model "${modelName}" could not be associated: ` +
                        `${error.message.split("\n")[0]}. That addon is only partially installed — ` +
                        `its endpoints will fail until backend/dist/models/ext/${addon}/ is re-uploaded.`);
                }
                finally {
                    associatingAddon = null;
                }
            }
        }
        finally {
            for (const [method, original] of originalAssociationMethods) {
                SequelizeModel[method] = original;
            }
        }
        if (droppedAssociations.length) {
            console.warn(`[MODELS] ${droppedAssociations.length} association(s) point at models that are not ` +
                `registered and were skipped: ${droppedAssociations.join(", ")}. A model file is ` +
                `missing from backend/dist/models/ext/ — re-upload that tree from the release ` +
                `matching this build.`);
        }
    }
    catch (error) {
        console.error(`Error initializing models: ${error.message}`);
        throw error;
    }
    return models;
}
const redis = redis_1.RedisSingleton.getInstance();
function extractUserIdsFromWhere(where) {
    let userIds = [];
    if (where && where.userId) {
        const uid = where.userId;
        userIds = Array.isArray(uid) ? uid : [uid];
    }
    else if (where && where[sequelize_1.Op.and]) {
        const conditions = where[sequelize_1.Op.and];
        for (const condition of conditions) {
            if (condition.userId) {
                if (Array.isArray(condition.userId)) {
                    userIds.push(...condition.userId);
                }
                else {
                    userIds.push(condition.userId);
                }
            }
        }
    }
    return [...new Set(userIds)];
}
function createUserCacheHooks(getUserId = (instance) => instance.userId) {
    return {
        afterCreate: async (instance) => {
            const userId = getUserId(instance);
            await redis.del(`user:${userId}:profile`);
        },
        afterUpdate: async (instance) => {
            const userId = getUserId(instance);
            await redis.del(`user:${userId}:profile`);
        },
        afterDestroy: async (instance) => {
            const userId = getUserId(instance);
            await redis.del(`user:${userId}:profile`);
        },
        afterBulkUpdate: async function (options) {
            let userIds = extractUserIdsFromWhere(options.where);
            if (!userIds.length) {
                const instances = await this.findAll({ where: options.where });
                userIds = instances.map((inst) => getUserId(inst));
            }
            for (const uid of [...new Set(userIds)]) {
                await redis.del(`user:${uid}:profile`);
            }
        },
        afterBulkDestroy: async function (options) {
            let userIds = extractUserIdsFromWhere(options.where);
            if (!userIds.length) {
                const instances = await this.findAll({ where: options.where });
                userIds = instances.map((inst) => getUserId(inst));
            }
            for (const uid of [...new Set(userIds)]) {
                await redis.del(`user:${uid}:profile`);
            }
        },
    };
}
