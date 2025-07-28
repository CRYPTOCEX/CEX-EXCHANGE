import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export interface icoTokenOfferingPhaseAttributes {
  id: string;
  offeringId: string;
  name: string;
  tokenPrice: number;
  allocation: number;
  remaining: number;
  duration: number;
}

export interface icoTokenOfferingPhaseCreationAttributes
  extends Partial<icoTokenOfferingPhaseAttributes> {}

export default class icoTokenOfferingPhase
  extends Model<
    icoTokenOfferingPhaseAttributes,
    icoTokenOfferingPhaseCreationAttributes
  >
  implements icoTokenOfferingPhaseAttributes
{
  id!: string;
  offeringId!: string;
  name!: string;
  tokenPrice!: number;
  allocation!: number;
  remaining!: number;
  duration!: number;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof icoTokenOfferingPhase {
    return icoTokenOfferingPhase.init(
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
            isUUID: {
              args: 4,
              msg: "offeringId: Offering ID must be a valid UUID",
            },
          },
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Phase name must not be empty" },
          },
        },
        tokenPrice: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "tokenPrice: Must be a valid number" },
            min: { args: [0], msg: "tokenPrice: Cannot be negative" },
          },
        },
        allocation: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "allocation: Must be a valid number" },
            min: { args: [0], msg: "allocation: Cannot be negative" },
          },
        },
        remaining: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "remaining: Must be a valid number" },
            min: { args: [0], msg: "remaining: Cannot be negative" },
          },
        },
        duration: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            isInt: { msg: "duration: Must be an integer" },
            min: { args: [0], msg: "duration: Cannot be negative" },
          },
        },
      },
      {
        sequelize,
        modelName: "icoTokenOfferingPhase",
        tableName: "ico_token_offering_phase",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "icoTokenOfferingPhaseOfferingIdNameKey",
            unique: true,
            fields: [{ name: "offeringId" }, { name: "name" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    icoTokenOfferingPhase.belongsTo(models.icoTokenOffering, {
      as: "offering",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
