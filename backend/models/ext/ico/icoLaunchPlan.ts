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
  extends Partial<icoLaunchPlanAttributes> {}

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
          type: DataTypes.DOUBLE,
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
