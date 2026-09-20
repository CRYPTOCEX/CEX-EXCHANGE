import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

interface icoTokenVestingAttributes {
  id: string;
  transactionId: string;
  userId: string;
  offeringId: string;
  totalAmount: number;
  releasedAmount: number;
  vestingType: "LINEAR" | "CLIFF" | "MILESTONE";
  startDate: Date;
  endDate: Date;
  cliffDuration?: number;
  releaseSchedule?: any;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

interface icoTokenVestingCreationAttributes extends Omit<icoTokenVestingAttributes, 'id' | 'releasedAmount' | 'status'> {}

export default class icoTokenVesting
  extends Model<icoTokenVestingAttributes, icoTokenVestingCreationAttributes>
  implements icoTokenVestingAttributes
{
  public id!: string;
  public transactionId!: string;
  public userId!: string;
  public offeringId!: string;
  public totalAmount!: number;
  public releasedAmount!: number;
  public vestingType!: "LINEAR" | "CLIFF" | "MILESTONE";
  public startDate!: Date;
  public endDate!: Date;
  public cliffDuration?: number;
  public releaseSchedule?: any;
  public status!: "ACTIVE" | "COMPLETED" | "CANCELLED";
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof icoTokenVesting {
    return icoTokenVesting.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        transactionId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        offeringId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        totalAmount: {
          type: DataTypes.DECIMAL(36, 8),
          // mysql2 returns DECIMAL as a STRING. `*` and `-` coerce, but `<`
          // and `>` between two of them compare LEXICOGRAPHICALLY, so every
          // balance/threshold check silently used string order. Hand back a
          // number so comparisons mean what they read as.
          get(this: any) {
            const value = this.getDataValue("totalAmount");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        releasedAmount: {
          type: DataTypes.DECIMAL(36, 8),
          // mysql2 returns DECIMAL as a STRING. `*` and `-` coerce, but `<`
          // and `>` between two of them compare LEXICOGRAPHICALLY, so every
          // balance/threshold check silently used string order. Hand back a
          // number so comparisons mean what they read as.
          get(this: any) {
            const value = this.getDataValue("releasedAmount");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
        vestingType: {
          type: DataTypes.ENUM("LINEAR", "CLIFF", "MILESTONE"),
          allowNull: false,
          defaultValue: "LINEAR",
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        cliffDuration: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "Cliff duration in days",
        },
        releaseSchedule: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: "JSON array of milestone releases [{date, percentage, amount}]",
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
          get(this: icoTokenVesting) {
            const value = this.getDataValue("releaseSchedule") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "COMPLETED", "CANCELLED"),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
      },
      {
        sequelize,
        modelName: "icoTokenVesting",
        tableName: "ico_token_vesting",
        timestamps: true,
        paranoid: true,
        indexes: [
          { fields: ["transactionId"] },
          { fields: ["userId"] },
          { fields: ["offeringId"] },
          { fields: ["status"] },
          { fields: ["startDate", "endDate"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    icoTokenVesting.hasMany(models.icoTokenVestingRelease, {
      as: "releases",
      foreignKey: "vestingId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTokenVesting.belongsTo(models.icoTransaction, {
      as: "transaction",
      foreignKey: "transactionId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTokenVesting.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTokenVesting.belongsTo(models.icoTokenOffering, {
      as: "offering",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}