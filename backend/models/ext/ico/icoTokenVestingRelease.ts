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
          references: {
            model: "ico_token_vesting",
            key: "id",
          },
          onDelete: "CASCADE",
          comment: "Reference to the parent vesting record",
        },
        releaseDate: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: "Date when tokens should be released",
        },
        releaseAmount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            min: 0,
          },
          comment: "Amount of tokens to release",
        },
        percentage: {
          type: DataTypes.DOUBLE,
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
