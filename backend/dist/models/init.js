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
const isProduction = process.env.NODE_ENV === "production";
function initModels(sequelize) {
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
        for (const filePath of modelFiles) {
            const modelModule = require(filePath);
            const model = modelModule.default || modelModule;
            if (model && typeof model.initModel === "function") {
                const initializedModel = model.initModel(sequelize);
                const modelName = initializedModel.name;
                if (!modelName) {
                    console.error(`Model from file ${filePath} has no modelName set.`);
                    continue;
                }
                models[modelName] = initializedModel;
            }
            else {
                console.error(`Model from file ${filePath} does not have an initModel method or a valid export structure.`);
            }
        }
        Object.keys(models).forEach((modelName) => {
            const model = models[modelName];
            if (typeof model.associate === "function") {
                model.associate(models);
            }
        });
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
