import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class icoTokenOfferingUpdate
  extends Model<
    icoTokenOfferingUpdateAttributes,
    icoTokenOfferingUpdateCreationAttributes
  >
  implements icoTokenOfferingUpdateAttributes
{
  id!: string;
  offeringId!: string;
  userId!: string;
  title!: string;
  content!: string;
  attachments?: any;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof icoTokenOfferingUpdate {
    return icoTokenOfferingUpdate.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        offeringId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "offeringId: Offering ID cannot be null" },
            isUUID: { args: 4, msg: "offeringId: Must be a valid UUID" },
          },
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
          },
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title must not be empty" },
          },
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "content: Content must not be empty" },
          },
        },
        attachments: {
          type: DataTypes.JSON,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "icoTokenOfferingUpdate",
        tableName: "ico_token_offering_update",
        timestamps: true,
        paranoid: true,
      }
    );
  }

  public static associate(models: any) {
    // Associate update to its offering and creator (user)
    icoTokenOfferingUpdate.belongsTo(models.icoTokenOffering, {
      foreignKey: "offeringId",
      as: "offering",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTokenOfferingUpdate.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
