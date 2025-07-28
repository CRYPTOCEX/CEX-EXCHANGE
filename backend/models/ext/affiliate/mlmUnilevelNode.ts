import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import mlmReferral from "./mlmReferral";

export default class mlmUnilevelNode
  extends Model<mlmUnilevelNodeAttributes, mlmUnilevelNodeCreationAttributes>
  implements mlmUnilevelNodeAttributes
{
  id!: string;
  referralId!: string;
  parentId!: string | null;

  // mlmUnilevelNode belongsTo mlmReferral via referralId
  referral!: mlmReferral;
  getReferral!: Sequelize.BelongsToGetAssociationMixin<mlmReferral>;
  setReferral!: Sequelize.BelongsToSetAssociationMixin<
    mlmReferral,
    mlmReferralId
  >;
  createReferral!: Sequelize.BelongsToCreateAssociationMixin<mlmReferral>;
  // mlmUnilevelNode belongsTo mlmUnilevelNode via parentId
  parent!: mlmUnilevelNode;
  getParent!: Sequelize.BelongsToGetAssociationMixin<mlmUnilevelNode>;
  setParent!: Sequelize.BelongsToSetAssociationMixin<
    mlmUnilevelNode,
    mlmUnilevelNodeId
  >;
  createParent!: Sequelize.BelongsToCreateAssociationMixin<mlmUnilevelNode>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof mlmUnilevelNode {
    return mlmUnilevelNode.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        referralId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: {
              args: 4,
              msg: "referralId: Referral ID must be a valid UUID",
            },
          },
        },
        parentId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: {
              args: 4,
              msg: "parentId: Parent ID must be a valid UUID",
            },
          },
        },
      },
      {
        sequelize,
        modelName: "mlmUnilevelNode",
        tableName: "mlm_unilevel_node",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "mlmUnilevelNodeReferralIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "referralId" }],
          },
          {
            name: "mlmUnilevelNodeParentIdFkey",
            using: "BTREE",
            fields: [{ name: "parentId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    mlmUnilevelNode.belongsTo(models.mlmUnilevelNode, {
      as: "parent", // The parent node in the unilevel hierarchy
      foreignKey: "parentId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    mlmUnilevelNode.hasMany(models.mlmUnilevelNode, {
      as: "unilevelNodes", // The child nodes under this node
      foreignKey: "parentId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    mlmUnilevelNode.belongsTo(models.mlmReferral, {
      as: "referral", // The referral associated with this node
      foreignKey: "referralId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
