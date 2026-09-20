import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Cross-process leadership lease for the AI Market Maker engine.
 *
 * The engine must tick exactly once per deployment: two engines advance the
 * price process twice, race each other rebuilding the synthetic orderbook, and
 * both write the 1-minute candle that binary options settle on.
 *
 * Redis holds the fast lock, but when Redis is unreachable RedisSingleton
 * answers SET NX out of an embedded per-process Map — every process gets a
 * clean "OK" and believes it leads, with nothing in the logs. The database is
 * the only thing that is genuinely shared in that situation, so this single row
 * is the second arbiter. It is a single row on purpose: the primary key is what
 * makes the first claim atomic, and a conditional UPDATE on it is what makes
 * every later claim atomic.
 *
 * hostname/pid are operator-facing (they name the process holding the engine)
 * and are also what lets a restart on the same host reclaim a lease left behind
 * by a hard kill instead of waiting out its TTL.
 */
export default class aiMarketMakerEngineLease
  extends Model<
    aiMarketMakerEngineLeaseAttributes,
    aiMarketMakerEngineLeaseCreationAttributes
  >
  implements aiMarketMakerEngineLeaseAttributes
{
  id!: string;
  instanceId!: string;
  hostname?: string;
  pid?: number;
  expiresAt!: Date;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiMarketMakerEngineLease {
    return aiMarketMakerEngineLease.init(
      {
        id: {
          type: DataTypes.STRING(32),
          primaryKey: true,
          allowNull: false,
        },
        instanceId: {
          type: DataTypes.STRING(64),
          allowNull: false,
          validate: {
            notEmpty: { msg: "instanceId: Instance ID must not be empty" },
          },
        },
        hostname: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        pid: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: "aiMarketMakerEngineLease",
        tableName: "ai_market_maker_engine_lease",
        timestamps: true,
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
}
