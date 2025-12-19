import { Sequelize } from "sequelize";
import { initModels } from "../models/init";
import { isMainThread } from "worker_threads";
import { logger } from "@b/utils/console";

export class SequelizeSingleton {
  private static instance: SequelizeSingleton;
  private sequelize: Sequelize;
  public models: any;

  private constructor() {
    if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_HOST) {
      throw new Error('Missing required database environment variables. Please check your .env file.');
    }

    this.sequelize = new Sequelize(
      process.env.DB_NAME as string,
      process.env.DB_USER as string,
      process.env.DB_PASSWORD || '', // Use empty string if undefined
      {
        host: process.env.DB_HOST as string,
        dialect: "mysql",
        port: Number(process.env.DB_PORT),
        logging: false,
        dialectOptions: {
          charset: "utf8mb4",
        },
        define: {
          charset: "utf8mb4",
          collate: "utf8mb4_unicode_ci",
        },
      }
    );
    
    if (!this.sequelize) {
      throw new Error("Failed to create Sequelize instance");
    }
    
    this.models = this.initModels();
  }

  public static getInstance(): SequelizeSingleton {
    if (!SequelizeSingleton.instance) {
      SequelizeSingleton.instance = new SequelizeSingleton();
    }
    return SequelizeSingleton.instance;
  }

  public async initialize(): Promise<void> {
    if (isMainThread) {
      await this.syncDatabase();
    }
  }

  public getSequelize(): Sequelize {
    return this.sequelize;
  }

  private initModels() {
    const models = initModels(this.sequelize);
    return models;
  }

  private async syncDatabase() {
    try {
      // DB_SYNC: "none" = authenticate only, "force" = DROP tables, unset/other = ALTER tables (default)
      const syncMode = process.env.DB_SYNC?.toLowerCase();

      if (syncMode === "none") {
        // Only authenticate, no schema changes
        await this.sequelize.authenticate();
      } else if (syncMode === "force") {
        // DROP and recreate tables (DANGEROUS - loses all data)
        await this.sequelize.sync({ force: true });
      } else {
        // Default: ALTER tables to match models (safe for development)
        await this.sequelize.sync({ alter: true });
      }
    } catch (error) {
      logger.error("DB", "Connection failed");
      throw error;
    }
  }
}

export const db = SequelizeSingleton.getInstance();
export const sequelize = db.getSequelize();
export const models = db.models;
export default db;
