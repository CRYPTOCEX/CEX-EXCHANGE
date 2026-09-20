import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export interface icoLaunchPlanAttributes {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  walletType: string;
  features: {
    maxTeamMembers: number;
    maxRoadmapItems: number;
    maxOfferingPhases: number;
    maxUpdatePosts: number;
    supportLevel: "basic" | "standard" | "premium";
    marketingSupport: boolean;
    auditIncluded: boolean;
    customTokenomics: boolean;
    priorityListing: boolean;
    kycRequired: boolean;
    [key: string]: any;
  };
  recommended: boolean;
  status: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface icoLaunchPlanCreationAttributes
  extends Omit<icoLaunchPlanAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> {}

export default class icoLaunchPlan
  extends Model<icoLaunchPlanAttributes, icoLaunchPlanCreationAttributes>
  implements icoLaunchPlanAttributes
{
  id!: string;
  name!: string;
  description!: string;
  price!: number;
  currency!: string;
  walletType!: string;
  features!: {
    maxTeamMembers: number;
    maxRoadmapItems: number;
    maxOfferingPhases: number;
    maxUpdatePosts: number;
    supportLevel: "basic" | "standard" | "premium";
    marketingSupport: boolean;
    auditIncluded: boolean;
    customTokenomics: boolean;
    priorityListing: boolean;
    kycRequired: boolean;
    [key: string]: any;
  };
  recommended!: boolean;
  status!: boolean;
  sortOrder!: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof icoLaunchPlan {
    return icoLaunchPlan.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Launch plan name must not be empty" },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description must not be empty" },
          },
        },
        price: {
          type: DataTypes.DECIMAL(18, 2),
          // mysql2 returns DECIMAL as a STRING. `*` and `-` coerce, but `<`
          // and `>` between two of them compare LEXICOGRAPHICALLY, so every
          // balance/threshold check silently used string order. Hand back a
          // number so comparisons mean what they read as.
          get(this: any) {
            const value = this.getDataValue("price");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          validate: {
            isFloat: { msg: "price: Must be a valid number" },
            min: { args: [0], msg: "price: Cannot be negative" },
          },
        },
        currency: {
          type: DataTypes.STRING(10),
          allowNull: false,
          validate: {
            notEmpty: { msg: "currency: Currency must not be empty" },
          },
        },
        walletType: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "walletType: Wallet type must not be empty" },
          },
        },
        features: {
          type: DataTypes.JSON,
          allowNull: false,
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: icoLaunchPlan) {
            const value = this.getDataValue("features") as unknown;
            if (value == null) return [];
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return [];
              }
            }
            return value;
          },
        },
        recommended: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        sortOrder: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        modelName: "icoLaunchPlan",
        tableName: "ico_launch_plan",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    icoLaunchPlan.hasMany(models.icoTokenOffering, {
      foreignKey: "planId",
      as: "offerings",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
