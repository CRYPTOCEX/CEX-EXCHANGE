import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Operator vocabulary overrides, injected into the cached system prefix.
 *
 * This is how an operator who renamed "Ecosystem" to "MyBrand Wallet" gets the
 * agent to say the right word — and how they stop it saying the old one.
 *
 * Capped at 50 rows by the write route: every row is in the cached prefix on
 * every request, so an unbounded glossary is an unbounded per-turn bill.
 */
export default class aiSupportGlossary
  extends Model<aiSupportGlossaryAttributes, aiSupportGlossaryCreationAttributes>
  implements aiSupportGlossaryAttributes
{
  id!: string;
  term!: string;
  canonical!: string;
  definition?: string;
  /** Words the agent must never use for this concept. */
  forbidden?: string[];
  status!: boolean;

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiSupportGlossary {
    return aiSupportGlossary.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        term: { type: DataTypes.STRING(96), allowNull: false, unique: true },
        canonical: { type: DataTypes.STRING(96), allowNull: false },
        definition: { type: DataTypes.TEXT, allowNull: true },
        forbidden: {
          type: DataTypes.JSON,
         allowNull: true,
          get(this: any) {
            /*
             * Guarded both ways: `typeof` stops an already-parsed value (prod
             * MySQL) being parsed a second time, and the try/catch stops a
             * corrupt value throwing inside a getter during an ordinary read.
             */
            const value = this.getDataValue("forbidden") as unknown;
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
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: "aiSupportGlossary",
        tableName: "ai_support_glossary",
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "ai_support_glossary_term_uq",
            unique: true,
            using: "BTREE",
            fields: [{ name: "term" }],
          },
        ],
      }
    );
  }
}
