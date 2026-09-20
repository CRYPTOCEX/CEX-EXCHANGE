import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

interface icoTokenVestingReleaseAttributes {
  id: string;
  vestingId: string;
  releaseDate: Date;
  releaseAmount: number;
  percentage: number;
  status: "PENDING" | "RELEASED" | "FAILED" | "CANCELLED";
  transactionHash?: string;
  releasedAt?: Date;
  failureReason?: string;
  metadata?: any;
}

interface icoTokenVestingReleaseCreationAttributes extends Omit<icoTokenVestingReleaseAttributes, 'id' | 'status' | 'releasedAt' | 'failureReason'> {}

export default class icoTokenVestingRelease
  extends Model<icoTokenVestingReleaseAttributes, icoTokenVestingReleaseCreationAttributes>
  implements icoTokenVestingReleaseAttributes
{
  public id!: string;
  public vestingId!: string;
  public releaseDate!: Date;
  public releaseAmount!: number;
  public percentage!: number;
  public status!: "PENDING" | "RELEASED" | "FAILED" | "CANCELLED";
  public transactionHash?: string;
  public releasedAt?: Date;
  public failureReason?: string;
  public metadata?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof icoTokenVestingRelease {
    return icoTokenVestingRelease.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        vestingId: {
          type: DataTypes.UUID,
          allowNull: false,
          comment: "Reference to the parent vesting record",
        },
        releaseDate: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: "Date when tokens should be released",
        },
        releaseAmount: {
          type: DataTypes.DECIMAL(36, 8),
          // mysql2 returns DECIMAL as a STRING. `*` and `-` coerce, but `<`
          // and `>` between two of them compare LEXICOGRAPHICALLY, so every
          // balance/threshold check silently used string order. Hand back a
          // number so comparisons mean what they read as.
          get(this: any) {
            const value = this.getDataValue("releaseAmount");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          validate: {
            min: 0,
          },
          comment: "Amount of tokens to release",
        },
        percentage: {
          type: DataTypes.DECIMAL(5, 2),
          // mysql2 returns DECIMAL as a STRING. `*` and `-` coerce, but `<`
          // and `>` between two of them compare LEXICOGRAPHICALLY, so every
          // balance/threshold check silently used string order. Hand back a
          // number so comparisons mean what they read as.
          get(this: any) {
            const value = this.getDataValue("percentage");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          validate: {
            min: 0,
            max: 100,
          },
          comment: "Percentage of total vesting amount",
        },
        status: {
          type: DataTypes.ENUM("PENDING", "RELEASED", "FAILED", "CANCELLED"),
          allowNull: false,
          defaultValue: "PENDING",
          comment: "Current status of this release",
        },
        transactionHash: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment: "Blockchain transaction hash if released on-chain",
        },
        releasedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Actual date when tokens were released",
        },
        failureReason: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Reason for failure if status is FAILED",
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: "Additional metadata about the release",
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
          get(this: icoTokenVestingRelease) {
            const value = this.getDataValue("metadata") as unknown;
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
      },
      {
        sequelize,
        modelName: "icoTokenVestingRelease",
        tableName: "ico_token_vesting_release",
        timestamps: true,
        paranoid: true,
        indexes: [
          { fields: ["vestingId"] },
          { fields: ["releaseDate"] },
          { fields: ["status"] },
          { fields: ["vestingId", "status"] },
          { fields: ["releaseDate", "status"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    icoTokenVestingRelease.belongsTo(models.icoTokenVesting, {
      as: "vesting",
      foreignKey: "vestingId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
