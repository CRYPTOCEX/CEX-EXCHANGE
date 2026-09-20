import fs from "fs";
import path from "path";
import { Op, Sequelize } from "sequelize";
import { RedisSingleton } from "@b/utils/redis";
import { isMissingOptionalAddon } from "@b/utils/safe-imports";

// Check if the environment is production
const isProduction = process.env.NODE_ENV === "production";

/**
 * The addon a model file belongs to ("dex", "ecosystem", …), or null for a core
 * model. `models/ext/<addon>/**` is the whole convention.
 */
function addonOfModelFile(filePath: string): string | null {
  const m = /(?:^|[\\/])models[\\/]ext[\\/]([^\\/]+)[\\/]/.exec(filePath);
  return m ? m[1] : null;
}

export function initModels(sequelize: Sequelize): Models {
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

    /*
      AN ABSENT ADDON MUST NOT BE A BOOT CRASH.

      `models/ext/**` ships with the CORE release and is walked in full here, on
      every install. `src/api/(ext)/<addon>/**` ships only to the customers who
      bought that addon. So a model file that reaches into an addon tree throws
      MODULE_NOT_FOUND on every install without it, and it throws HERE — inside
      initModels, before the server exists — which is not a degraded install, it
      is one that cannot start at all. It took `pnpm updator` down mid-update:

          Error initializing models: Cannot find module
            '/home/x/public_html/backend/dist/src/api/(ext)/dex/utils/units'

      The models themselves must not do that, and no longer do (see
      `backend/src/utils/dex/units.ts`). This is the backstop for the next one.

      THE WHOLE ADDON GOES, NOT JUST THE FILE. A half-loaded addon is worse than
      an absent one: the siblings that happened to load first would then run
      `associate()` against models that are not in the map and throw a TypeError
      from a completely different line. No CORE model associates to an ext model,
      so dropping the group is safe — `admin/finance/profit/summary.get.ts`
      already guards on `models.dexFeeAccrual` existing for exactly this reason,
      and the dex seeder already checks the table exists before inserting.

      ONLY a missing ADDON is tolerated: `isMissingOptionalAddon` inspects the
      quoted specifier, so a missing npm dependency, a syntax error or a
      top-level throw in an installed file still stops the boot loudly.
    */
    const skippedAddons = new Set<string>();
    const modelFileOwner = new Map<string, string>(); // modelName -> addon

    // Initialize each model
    for (const filePath of modelFiles) {
      const addon = addonOfModelFile(filePath);
      if (addon && skippedAddons.has(addon)) continue;

      let modelModule: any;
      try {
        modelModule = require(filePath);
      } catch (error: any) {
        if (addon && isMissingOptionalAddon(error, filePath)) {
          skippedAddons.add(addon);
          // Drop any sibling that loaded before this one. `initModel` has
          // already registered it with Sequelize, so it has to leave the model
          // manager too or `sync()` would still create the table.
          for (const [modelName, owner] of modelFileOwner) {
            if (owner !== addon) continue;
            const stale = models[modelName];
            delete models[modelName];
            modelFileOwner.delete(modelName);
            try {
              (sequelize as any).modelManager?.removeModel?.(stale);
            } catch {
              // Older Sequelize, or already gone. The map is what callers read.
            }
          }
          console.warn(
            `[MODELS] Skipping the "${addon}" models: ${error.message.split("\n")[0]}. ` +
              `That addon is not installed on this server — its tables will not be created.`
          );
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
        if (addon) modelFileOwner.set(modelName, addon);
      } else {
        console.error(
          `Model from file ${filePath} does not have an initModel method or a valid export structure.`
        );
      }
    }

    /*
      A MISSING SIBLING IS NOT A BOOT CRASH EITHER.

      The require() guard above only fires when a model file THROWS. A model file
      that is simply ABSENT throws nothing at all — an interrupted upload, a
      hot-patch that shipped half the tree, an operator who deleted an addon by
      hand. The walk never sees the file, the map never gets the key, and the
      first sibling that associates to it dies down here instead, from a line
      that names the wrong file and never mentions the addon:

          Error initializing models: fxAccount.belongsTo called with something
            that's not a subclass of Sequelize.Model
              at fxAccount.associate (dist/models/ext/forex-trading/fxAccount.js:209:19)

      initModels rethrows, index.ts never gets a server, pm2 restarts, forever.
      One absent addon file takes the whole exchange down — that is a live
      incident, not a theory.

      So while an ADDON model is associating, an association whose target is not
      a registered model is dropped with a warning instead of throwing. Only that
      one association is lost: the siblings on the same model still wire up, so
      an addon missing one file keeps working everywhere that file is not
      involved. CORE models keep the hard failure — a core model pointing at a
      model that is not there is a broken build of the product itself, and must
      stop the boot loudly rather than serve half a database.
    */
    const SequelizeModel: any = (Sequelize as any).Model;
    const associationMethods = [
      "belongsTo",
      "hasOne",
      "hasMany",
      "belongsToMany",
    ] as const;
    const originalAssociationMethods = new Map<string, Function>();
    const droppedAssociations: string[] = [];
    // Non-null only while an addon-owned model is inside associate().
    let associatingAddon: string | null = null;

    for (const method of associationMethods) {
      const original = SequelizeModel[method];
      if (typeof original !== "function") continue;
      originalAssociationMethods.set(method, original);
      SequelizeModel[method] = function (target: any, options: any = {}) {
        // Sequelize's own test, verbatim (associations/mixin.js `isModel`), so a
        // duplicated sequelize copy can never make this stricter than the call it
        // is standing in for.
        const base = this.sequelize?.Sequelize?.Model ?? SequelizeModel;
        const isModel =
          target && target.prototype && target.prototype instanceof base;
        if (!isModel && associatingAddon) {
          const alias = options && options.as ? ` as "${options.as}"` : "";
          droppedAssociations.push(`${this.name}.${method}(…${alias})`);
          return undefined;
        }
        return original.call(this, target, options);
      };
    }

    // Setup associations for all initialized models
    try {
      for (const modelName of Object.keys(models)) {
        const model = models[modelName];
        if (typeof model.associate !== "function") continue;
        const addon = modelFileOwner.get(modelName) || null;
        associatingAddon = addon;
        try {
          model.associate(models);
        } catch (error: any) {
          if (!addon) throw error;
          console.warn(
            `[MODELS] The "${addon}" model "${modelName}" could not be associated: ` +
              `${error.message.split("\n")[0]}. That addon is only partially installed — ` +
              `its endpoints will fail until backend/dist/models/ext/${addon}/ is re-uploaded.`
          );
        } finally {
          associatingAddon = null;
        }
      }
    } finally {
      for (const [method, original] of originalAssociationMethods) {
        SequelizeModel[method] = original;
      }
    }

    if (droppedAssociations.length) {
      console.warn(
        `[MODELS] ${droppedAssociations.length} association(s) point at models that are not ` +
          `registered and were skipped: ${droppedAssociations.join(", ")}. A model file is ` +
          `missing from backend/dist/models/ext/ — re-upload that tree from the release ` +
          `matching this build.`
      );
    }
  } catch (error: any) {
    console.error(`Error initializing models: ${error.message}`);
    throw error;
  }

  // Models initialized silently - count available via db.models
  return models as Models;
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
