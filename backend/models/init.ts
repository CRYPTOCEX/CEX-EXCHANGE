import fs from "fs";
import path from "path";
import { Op, Sequelize } from "sequelize";
import { RedisSingleton } from "@b/utils/redis";

// Check if the environment is production
const isProduction = process.env.NODE_ENV === "production";

export function initModels(sequelize: Sequelize) {
  if (!sequelize || !(sequelize instanceof Sequelize)) {
    throw new Error("Invalid Sequelize instance passed to initModels");
  }
  const models: Record<string, any> = {};

  // Get the current file name to exclude it from model imports
  const currentFileName = path.basename(__filename);

  // Get the correct file extension based on the environment
  const fileExtension = isProduction ? ".js" : ".ts";

  // Collect all model file paths (including nested directories)
  const modelFiles: string[] = [];
  function walkDir(dir: string) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (
        entry.isFile() &&
        path.extname(entry.name) === fileExtension &&
        entry.name !== currentFileName &&
        !entry.name.includes("index")
      ) {
        modelFiles.push(fullPath);
      }
    });
  }

  try {
    // Recursively find model files under this directory (including /ext/**/**)
    walkDir(__dirname);

    // Initialize each model
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
      } else {
        console.error(
          `Model from file ${filePath} does not have an initModel method or a valid export structure.`
        );
      }
    }

    // Setup associations for all initialized models
    Object.keys(models).forEach((modelName) => {
      const model = models[modelName];
      if (typeof model.associate === "function") {
        model.associate(models);
      }
    });
  } catch (error: any) {
    console.error(`Error initializing models: ${error.message}`);
    throw error;
  }

  console.info(
    `\x1b[36mMain Thread: ${modelFiles.length} Models initialized successfully...\x1b[0m`
  );

  return models;
}

const redis = RedisSingleton.getInstance();

// Helper to extract userIds from a where clause
function extractUserIdsFromWhere(where: any): string[] {
  let userIds: string[] = [];
  if (where && where.userId) {
    const uid = where.userId;
    userIds = Array.isArray(uid) ? uid : [uid];
  } else if (where && where[Op.and]) {
    const conditions = where[Op.and];
    for (const condition of conditions) {
      if (condition.userId) {
        if (Array.isArray(condition.userId)) {
          userIds.push(...condition.userId);
        } else {
          userIds.push(condition.userId);
        }
      }
    }
  }
  return [...new Set(userIds)];
}

/**
 * Returns hooks for cache invalidation that clear the Redis key:
 *   user:${userId}:profile
 *
 * @param getUserId - A function to extract the user id from an instance (default: instance.userId)
 */
export function createUserCacheHooks(
  getUserId: (instance: any) => string = (instance) => instance.userId
) {
  return {
    // Single record hooks
    afterCreate: async (instance: any) => {
      const userId = getUserId(instance);
      await redis.del(`user:${userId}:profile`);
    },
    afterUpdate: async (instance: any) => {
      const userId = getUserId(instance);
      await redis.del(`user:${userId}:profile`);
    },
    afterDestroy: async (instance: any) => {
      const userId = getUserId(instance);
      await redis.del(`user:${userId}:profile`);
    },

    // Bulk hooks (use non-arrow functions so "this" refers to the model)
    afterBulkUpdate: async function (options: any) {
      let userIds = extractUserIdsFromWhere(options.where);
      if (!userIds.length) {
        const instances = await this.findAll({ where: options.where });
        userIds = instances.map((inst: any) => getUserId(inst));
      }
      for (const uid of [...new Set(userIds)]) {
        await redis.del(`user:${uid}:profile`);
      }
    },

    afterBulkDestroy: async function (options: any) {
      let userIds = extractUserIdsFromWhere(options.where);
      if (!userIds.length) {
        const instances = await this.findAll({ where: options.where });
        userIds = instances.map((inst: any) => getUserId(inst));
      }
      for (const uid of [...new Set(userIds)]) {
        await redis.del(`user:${uid}:profile`);
      }
    },
  };
}

export type Models = ReturnType<typeof initModels>;
