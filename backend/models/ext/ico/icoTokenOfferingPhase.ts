import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export interface icoTokenOfferingPhaseAttributes {
  id: string;
  offeringId: string;
  name: string;
  tokenPrice: number;
  allocation: number;
  remaining: number;
  duration: number;
  sequence: number;
  startDate?: Date;
  endDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface icoTokenOfferingPhaseCreationAttributes
  extends Omit<icoTokenOfferingPhaseAttributes, 'id' | 'startDate' | 'endDate'> {}

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
  sequence!: number;
  startDate?: Date;
  endDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;

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
            isUUID: { args: ANY_UUID_VERSION,
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
          type: DataTypes.DECIMAL(36, 8),
          // mysql2 returns DECIMAL as a STRING. `*` and `-` coerce, but `<`
          // and `>` between two of them compare LEXICOGRAPHICALLY, so every
          // balance/threshold check silently used string order. Hand back a
          // number so comparisons mean what they read as.
          get(this: any) {
            const value = this.getDataValue("tokenPrice");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          validate: {
            isFloat: { msg: "tokenPrice: Must be a valid number" },
            min: { args: [0], msg: "tokenPrice: Cannot be negative" },
          },
        },
        allocation: {
          type: DataTypes.DECIMAL(36, 8),
          // mysql2 returns DECIMAL as a STRING. `*` and `-` coerce, but `<`
          // and `>` between two of them compare LEXICOGRAPHICALLY, so every
          // balance/threshold check silently used string order. Hand back a
          // number so comparisons mean what they read as.
          get(this: any) {
            const value = this.getDataValue("allocation");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          validate: {
            isFloat: { msg: "allocation: Must be a valid number" },
            min: { args: [0], msg: "allocation: Cannot be negative" },
          },
        },
        remaining: {
          type: DataTypes.DECIMAL(36, 8),
          // mysql2 returns DECIMAL as a STRING. `*` and `-` coerce, but `<`
          // and `>` between two of them compare LEXICOGRAPHICALLY, so every
          // balance/threshold check silently used string order. Hand back a
          // number so comparisons mean what they read as.
          get(this: any) {
            const value = this.getDataValue("remaining");
            return value === null || value === undefined ? value : Number(value);
          },
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
        sequence: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isInt: { msg: "sequence: Must be an integer" },
            min: { args: [0], msg: "sequence: Cannot be negative" },
          },
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "icoTokenOfferingPhase",
        tableName: "ico_token_offering_phase",
        timestamps: true,
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
