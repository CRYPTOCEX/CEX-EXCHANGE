import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import mlmReferralReward from "./mlmReferralReward";

export default class mlmReferralCondition
  extends Model<
    mlmReferralConditionAttributes,
    mlmReferralConditionCreationAttributes
  >
  implements mlmReferralConditionAttributes
{
  id!: string;
  name!: string;
  title!: string;
  description!: string;
  type!:
    | "DEPOSIT"
    | "TRADE"
    | "INVESTENT"
    | "BINARY_WIN"
    | "INVESTMENT"
    | "AI_INVESTMENT"
    | "FOREX_INVESTMENT"
    | "ICO_CONTRIBUTION"
    | "STAKING"
    | "ECOMMERCE_PURCHASE"
    | "P2P_TRADE";
  reward!: number;
  rewardType!: "PERCENTAGE" | "FIXED";
  rewardWalletType!: "FIAT" | "SPOT" | "ECO";
  rewardCurrency!: string;
  rewardChain?: string;
  image?: string;
  status!: boolean;

  // mlmReferralCondition hasMany mlmReferralReward via conditionId
  mlmReferralRewards!: mlmReferralReward[];
  getMlmReferralRewards!: Sequelize.HasManyGetAssociationsMixin<mlmReferralReward>;
  setMlmReferralRewards!: Sequelize.HasManySetAssociationsMixin<
    mlmReferralReward,
    mlmReferralRewardId
  >;
  addMlmReferralReward!: Sequelize.HasManyAddAssociationMixin<
    mlmReferralReward,
    mlmReferralRewardId
  >;
  addMlmReferralRewards!: Sequelize.HasManyAddAssociationsMixin<
    mlmReferralReward,
    mlmReferralRewardId
  >;
  createMlmReferralReward!: Sequelize.HasManyCreateAssociationMixin<mlmReferralReward>;
  removeMlmReferralReward!: Sequelize.HasManyRemoveAssociationMixin<
    mlmReferralReward,
    mlmReferralRewardId
  >;
  removeMlmReferralRewards!: Sequelize.HasManyRemoveAssociationsMixin<
    mlmReferralReward,
    mlmReferralRewardId
  >;
  hasMlmReferralReward!: Sequelize.HasManyHasAssociationMixin<
    mlmReferralReward,
    mlmReferralRewardId
  >;
  hasMlmReferralRewards!: Sequelize.HasManyHasAssociationsMixin<
    mlmReferralReward,
    mlmReferralRewardId
  >;
  countMlmReferralRewards!: Sequelize.HasManyCountAssociationsMixin;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof mlmReferralCondition {
    return mlmReferralCondition.init(
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
            notEmpty: { msg: "name: Name cannot be empty" },
          },
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title cannot be empty" },
          },
        },
        description: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description cannot be empty" },
          },
        },
        type: {
          type: DataTypes.ENUM(
            "DEPOSIT",
            "TRADE",
            "INVESTMENT",
            "BINARY_WIN",
            "AI_INVESTMENT",
            "FOREX_INVESTMENT",
            "ICO_CONTRIBUTION",
            "STAKING",
            "ECOMMERCE_PURCHASE",
            "P2P_TRADE"
          ),
          allowNull: false,
          validate: {
            isIn: {
              args: [
                [
                  "DEPOSIT",
                  "TRADE",
                  "INVESTMENT",
                  "BINARY_WIN",
                  "AI_INVESTMENT",
                  "FOREX_INVESTMENT",
                  "ICO_CONTRIBUTION",
                  "STAKING",
                  "ECOMMERCE_PURCHASE",
                  "P2P_TRADE",
                ],
              ],
              msg: "type: Type must be one of DEPOSIT, TRADE, INVESTMENT, BINARY_WIN, AI_INVESTMENT, FOREX_INVESTMENT, ICO_CONTRIBUTION, STAKING, ECOMMERCE_PURCHASE, P2P_TRADE",
            },
          },
        },
        reward: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "reward: Reward must be a valid number" },
          },
        },
        rewardType: {
          type: DataTypes.ENUM("PERCENTAGE", "FIXED"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["PERCENTAGE", "FIXED"]],
              msg: "rewardType: Reward type must be either PERCENTAGE or FIXED",
            },
          },
        },
        rewardWalletType: {
          type: DataTypes.ENUM("FIAT", "SPOT", "ECO"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["FIAT", "SPOT", "ECO"]],
              msg: "rewardWalletType: Wallet type must be one of FIAT, SPOT, ECO",
            },
          },
        },
        rewardCurrency: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: "rewardCurrency: Reward currency cannot be empty",
            },
          },
        },
        rewardChain: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        image: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
        },
      },
      {
        sequelize,
        modelName: "mlmReferralCondition",
        tableName: "mlm_referral_condition",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "mlmReferralConditionNameKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "name" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    mlmReferralCondition.hasMany(models.mlmReferralReward, {
      as: "referralRewards", // Rewards tied to a specific condition
      foreignKey: "conditionId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
