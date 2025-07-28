import { Sequelize } from "sequelize";
import { Models, initModels } from "@db/init";
import { isMainThread } from "worker_threads";

export class SequelizeSingleton {
  private static instance: SequelizeSingleton;
  private sequelize: Sequelize;
  public models: Models;

  private constructor() {
    // Log database configuration for debugging
    console.log(`\x1b[36mDatabase Configuration:\x1b[0m`);
    console.log(`  DB_NAME: ${process.env.DB_NAME || '(not set)'}`);
    console.log(`  DB_USER: ${process.env.DB_USER || '(not set)'}`);
    console.log(`  DB_PASSWORD: ${process.env.DB_PASSWORD !== undefined ? (process.env.DB_PASSWORD === '' ? '(empty)' : '[HIDDEN]') : '(not set)'}`);
    console.log(`  DB_HOST: ${process.env.DB_HOST || '(not set)'}`);
    console.log(`  DB_PORT: ${process.env.DB_PORT || '(not set)'}`);
    
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
    this.models = this.initModels();

    // Only sync on the main thread
    if (isMainThread) {
      this.syncDatabase();
      console.log(
        `\x1b[36mMain Thread: Database synced successfully...\x1b[0m`
      );
    }
  }

  public static getInstance(): SequelizeSingleton {
    if (!SequelizeSingleton.instance) {
      SequelizeSingleton.instance = new SequelizeSingleton();
    }
    return SequelizeSingleton.instance;
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
      await this.sequelize.sync({ alter: true });
    } catch (error) {
      console.error("Database sync failed:", error);
      throw error;
    }
  }
}

export const db = SequelizeSingleton.getInstance();
export const sequelize = db.getSequelize();
export const models = db.models;
export default db;
