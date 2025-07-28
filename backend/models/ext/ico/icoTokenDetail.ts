import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class icoTokenDetail
  extends Model<icoTokenDetailAttributes, icoTokenDetailCreationAttributes>
  implements icoTokenDetailAttributes
{
  id!: string;
  offeringId!: string;
  tokenType!: string;
  totalSupply!: number;
  tokensForSale!: number;
  salePercentage!: number;
  blockchain!: string;
  description!: string;
  useOfFunds!: any;
  links!: {
    whitepaper?: string;
    github?: string;
    telegram?: string;
    twitter?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof icoTokenDetail {
    return icoTokenDetail.init(
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
        tokenType: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: { msg: "tokenType: Token type must not be empty" },
          },
        },
        totalSupply: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "totalSupply: Must be a valid number" },
            min: { args: [0], msg: "totalSupply: Cannot be negative" },
          },
        },
        tokensForSale: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "tokensForSale: Must be a valid number" },
            min: { args: [0], msg: "tokensForSale: Cannot be negative" },
          },
        },
        salePercentage: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "salePercentage: Must be a valid number" },
            min: { args: [0], msg: "salePercentage: Cannot be negative" },
            max: { args: [100], msg: "salePercentage: Cannot exceed 100" },
          },
        },
        blockchain: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: { msg: "blockchain: Blockchain must not be empty" },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description must not be empty" },
          },
        },
        useOfFunds: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        links: {
          type: DataTypes.JSON,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: "icoTokenDetail",
        tableName: "ico_token_detail",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "icoTokenDetailOfferingIdKey",
            unique: true,
            fields: [{ name: "offeringId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    icoTokenDetail.belongsTo(models.icoTokenOffering, {
      as: "offering",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
