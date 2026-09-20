import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * ONE TRADER'S STANDING OPINION OF ANOTHER.
 *
 * Two relations, one table, because they are the same shape: a directed edge
 * from the viewer to a counterparty, carrying no payload beyond its own
 * existence. Splitting them into `p2p_follows` and `p2p_blocks` would duplicate
 * the model, the endpoints, the uniqueness rule and the lookup that every
 * board read has to do.
 *
 *   FOLLOW  "show me more of this person" — a bookmark. Advisory, and it
 *           changes nothing about what either party may do.
 *   BLOCK   "I do not want to deal with this person" — ENFORCED. Their offers
 *           leave the blocker's board, the blocker's offers leave theirs, and
 *           `offer/[id]/initiate-trade.post.ts` refuses a trade in either
 *           direction. A block that only hides a row is theatre: the trader is
 *           still one shared link away from the counterparty they blocked.
 *
 * THE BLOCK IS SYMMETRIC IN EFFECT, ASYMMETRIC IN KNOWLEDGE. The blocked
 * trader is never told, and the row is never exposed to them — being told you
 * were blocked is an invitation to make a second account. What they see is the
 * offer simply not being there, which is also what they see when it sells out.
 *
 * NOT PARANOID, DELIBERATELY. Unfollowing has to actually remove the row: with
 * `paranoid: true` the soft-deleted row keeps its slot under the unique index
 * and re-following the same person is a duplicate-key 500 forever after. There
 * is nothing here worth recovering — the whole record is "A currently feels
 * this way about B", and its history is not evidence of anything.
 */
export default class p2pTraderRelation
  extends Model<p2pTraderRelationAttributes, p2pTraderRelationCreationAttributes>
  implements p2pTraderRelationAttributes
{
  id!: string;
  /** The trader who holds the opinion. */
  userId!: string;
  /** The trader it is about. */
  traderId!: string;
  type!: "FOLLOW" | "BLOCK";
  /** Only meaningful on a BLOCK, and only ever read by the blocker. */
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof p2pTraderRelation {
    return p2pTraderRelation.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "userId must be a valid UUID" },
          },
        },
        traderId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "traderId cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "traderId must be a valid UUID" },
          },
        },
        type: {
          type: DataTypes.ENUM("FOLLOW", "BLOCK"),
          allowNull: false,
          validate: {
            isIn: { args: [["FOLLOW", "BLOCK"]], msg: "type must be FOLLOW or BLOCK" },
          },
        },
        note: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "p2pTraderRelation",
        tableName: "p2p_trader_relations",
        timestamps: true,
        paranoid: false,
        indexes: [
          {
            /* THE UNIQUENESS RULE. One row per (viewer, trader, kind): pressing
               Follow twice is the same fact stated twice, and without this the
               follower count is whatever the network happened to deliver. */
            name: "uq_p2p_relation_user_trader_type",
            unique: true,
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "traderId" }, { name: "type" }],
          },
          {
            /* "Who does this viewer block / follow" — the board runs this on
               every read to filter the offer list. */
            name: "idx_p2p_relation_user_type",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "type" }],
          },
          {
            /* The reverse: "who blocks this trader", which is what makes the
               block bite in both directions, and "how many follow them". */
            name: "idx_p2p_relation_trader_type",
            using: "BTREE",
            fields: [{ name: "traderId" }, { name: "type" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    p2pTraderRelation.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pTraderRelation.belongsTo(models.user, {
      as: "trader",
      foreignKey: "traderId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
