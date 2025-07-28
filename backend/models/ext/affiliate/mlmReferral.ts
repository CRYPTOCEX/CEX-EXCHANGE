import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import mlmBinaryNode from "./mlmBinaryNode";
import mlmUnilevelNode from "./mlmUnilevelNode";

export default class mlmReferral
  extends Model<mlmReferralAttributes, mlmReferralCreationAttributes>
  implements mlmReferralAttributes
{
  id!: string;
  status!: "PENDING" | "ACTIVE" | "REJECTED";
  referrerId!: string;
  referredId!: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // mlmReferral hasOne mlmBinaryNode via referralId
  mlmBinaryNode!: mlmBinaryNode;
  getMlmBinaryNode!: Sequelize.HasOneGetAssociationMixin<mlmBinaryNode>;
  setMlmBinaryNode!: Sequelize.HasOneSetAssociationMixin<
    mlmBinaryNode,
    mlmBinaryNodeId
  >;
  createMlmBinaryNode!: Sequelize.HasOneCreateAssociationMixin<mlmBinaryNode>;
  // mlmReferral hasOne mlmUnilevelNode via referralId
  mlmUnilevelNode!: mlmUnilevelNode;
  getMlmUnilevelNode!: Sequelize.HasOneGetAssociationMixin<mlmUnilevelNode>;
  setMlmUnilevelNode!: Sequelize.HasOneSetAssociationMixin<
    mlmUnilevelNode,
    mlmUnilevelNodeId
  >;
  createMlmUnilevelNode!: Sequelize.HasOneCreateAssociationMixin<mlmUnilevelNode>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof mlmReferral {
    return mlmReferral.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        referrerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: {
              args: 4,
              msg: "referrerId: Referrer ID must be a valid UUID",
            },
          },
        },
        referredId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: {
              args: 4,
              msg: "referredId: Referred ID must be a valid UUID",
            },
          },
        },
        status: {
          type: DataTypes.ENUM("PENDING", "ACTIVE", "REJECTED"),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "ACTIVE", "REJECTED"]],
              msg: "status: Status must be one of PENDING, ACTIVE, REJECTED",
            },
          },
        },
      },
      {
        sequelize,
        modelName: "mlmReferral",
        tableName: "mlm_referral",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "mlmReferralReferredIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "referredId" }],
          },
          {
            name: "mlmReferralReferrerIdReferredIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "referrerId" }, { name: "referredId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    mlmReferral.belongsTo(models.user, {
      as: "referrer", // The user who referred someone
      foreignKey: "referrerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    mlmReferral.belongsTo(models.user, {
      as: "referred", // The user who was referred
      foreignKey: "referredId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    mlmReferral.hasOne(models.mlmUnilevelNode, {
      as: "unilevelNode", // The corresponding unilevel node for this referral
      foreignKey: "referralId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    mlmReferral.hasOne(models.mlmBinaryNode, {
      as: "node", // The corresponding binary node for this referral
      foreignKey: "referralId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
