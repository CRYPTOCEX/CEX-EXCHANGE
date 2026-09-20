import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class mailwizardBlock
  extends Model<mailwizardBlockAttributes, mailwizardBlockCreationAttributes>
  implements mailwizardBlockAttributes
{
  id!: string;
  name!: string;
  category?: string | null;
  design!: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof mailwizardBlock {
    return mailwizardBlock.init(
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
        /*
         * Unlayer groups the editor's Blocks panel by this value, so it is the
         * difference between a usable panel and a flat list of forty rows.
         * Optional: a block saved straight out of the template editor has no
         * category until the operator gives it one.
         */
        category: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        design: {
          /*
           * TEXT("long"), matching mailwizardTemplate.design.
           *
           * A block is one Unlayer row, and a row carries its own inlined
           * content — a hero with a base64 image or a long HTML block passes
           * 64KB easily. Plain TEXT would TRUNCATE it (or, under strict mode,
           * throw on save), and a truncated design JSON no longer parses, so the
           * block would be silently unusable rather than merely large.
           */
          type: DataTypes.TEXT("long"),
          allowNull: false,
          validate: {
            notEmpty: { msg: "design: Design description cannot be empty" },
          },
        },
      },
      {
        sequelize,
        modelName: "mailwizardBlock",
        tableName: "mailwizard_block",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {}
}
