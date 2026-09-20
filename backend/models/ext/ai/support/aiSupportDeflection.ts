import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * A ticket that was offered an answer before it existed.
 *
 * ---------------------------------------------------------------------------
 * THE ONLY TABLE IN THIS ADDON THAT CAN PRODUCE A HONEST DEFLECTION NUMBER
 * ---------------------------------------------------------------------------
 * "Deflection" is the number every support product sells on and almost none can
 * actually measure — a ticket that was never filed leaves no row anywhere, so
 * the figure is usually "answers delivered" wearing a better name. The buyer
 * dashboard says "answers delivered" today precisely because that is the only
 * thing it could honestly claim.
 *
 * This is the one place a deflection is observable: the customer was typing a
 * subject line, an article was offered, and then either they filed anyway or
 * they did not. Both branches leave a row.
 *
 * ---------------------------------------------------------------------------
 * TWO STRENGTHS OF EVIDENCE, KEPT APART ON PURPOSE
 * ---------------------------------------------------------------------------
 * `RESOLVED` is the customer pressing "that answered it". It is a statement by a
 * person and it is the number worth quoting.
 *
 * `SHOWN` with no follow-up is an INFERENCE — they may have been called away,
 * changed their mind, or opened live chat instead. Counting it as a deflection
 * is defensible and it is not the same claim, so the two are never summed into
 * one figure by anything that reads this table.
 *
 * `FILED` is the honest negative: we offered and they filed anyway. It is the
 * most useful row of the three, because a high FILED rate against one article
 * says that article looks right and reads wrong.
 */
export default class aiSupportDeflection
  extends Model<
    aiSupportDeflectionAttributes,
    aiSupportDeflectionCreationAttributes
  >
  implements aiSupportDeflectionAttributes
{
  id!: string;
  /** Who was typing. Always set — the ticket form is behind authentication. */
  userId!: string;
  /** What they had typed when the suggestion appeared. */
  question!: string;
  /** The chunk that was offered, so a per-article hit rate is derivable. */
  chunkId?: string;
  /** The article's own question, denormalised — chunks are rebuilt nightly. */
  articleQuestion?: string;
  outcome!: "SHOWN" | "RESOLVED" | "FILED";

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiSupportDeflection {
    return aiSupportDeflection.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: { type: DataTypes.UUID, allowNull: false },
        question: { type: DataTypes.TEXT, allowNull: false },
        chunkId: { type: DataTypes.STRING(191), allowNull: true },
        articleQuestion: { type: DataTypes.TEXT, allowNull: true },
        outcome: {
          type: DataTypes.ENUM("SHOWN", "RESOLVED", "FILED"),
          allowNull: false,
          defaultValue: "SHOWN",
        },
      },
      {
        sequelize,
        modelName: "aiSupportDeflection",
        tableName: "ai_support_deflection",
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            // The dashboard reads by outcome over a window, and the suggest
            // route reads the customer's most recent row to avoid writing one
            // per keystroke.
            name: "ai_support_deflection_user_created_idx",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "createdAt" }],
          },
          {
            name: "ai_support_deflection_outcome_created_idx",
            using: "BTREE",
            fields: [{ name: "outcome" }, { name: "createdAt" }],
          },
        ],
      }
    );
  }
}
