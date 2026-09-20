import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

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
            isUUID: { args: ANY_UUID_VERSION, msg: "offeringId: Must be a valid UUID" },
          },
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: Must be a valid UUID" },
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
          get(this: icoTokenOfferingUpdate) {
            const value = this.getDataValue("attachments") as unknown;
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
        modelName: "icoTokenOfferingUpdate",
        tableName: "ico_token_offering_update",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "icoTokenOfferingUpdateOfferingIdIdx",
            fields: [{ name: "offeringId" }],
          },
          {
            name: "icoTokenOfferingUpdateUserIdIdx",
            fields: [{ name: "userId" }],
          },
        ],
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
