import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Cross-process leadership lease, one row per engine.
 *
 * Several engines in this backend are process-wide singletons that assume they
 * are also DEPLOYMENT-wide singletons: the ecosystem matcher, the futures
 * matcher, the forex tick/risk/execution engines. Two of any of them over the
 * same orders can fill one twice, so exactly one process may own each.
 *
 * Redis holds the fast lock, and these rows are the durable arbiter behind it.
 * The primary key is what makes the first claim atomic, and a conditional
 * UPDATE on it is what makes every later claim atomic.
 *
 * The row is no longer here to compensate for a Redis that lies — Redis used to
 * answer SET NX out of an embedded per-process Map when it was unreachable, so
 * every process got a clean "OK" and believed it led. Redis is a hard boot
 * requirement now (backend/src/utils/redis.ts). The row stays because it is what
 * arbitrates through a mid-run Redis outage, and because it can recognise a dead
 * holder (hostname/pid) where a Redis key holds only an opaque instance id.
 *
 * `id` is the engine key ("ecosystem-matching", "futures", ...) rather than a
 * surrogate, so one table serves every engine and two engines can never
 * contend for the same row.
 *
 * hostname/pid are operator-facing (they name the process holding the engine)
 * and are also what lets a restart on the same host reclaim a lease left behind
 * by a hard kill instead of waiting out its TTL, and what lets worker threads of
 * ONE process share a lease — see utils/engine-lease.ts for why that is the
 * correct granularity.
 *
 * Deliberately a separate table from `ai_market_maker_engine_lease`: that engine
 * owns its own, older implementation with a different failure direction (it
 * fails open even in a multi-process deployment, because a market maker that
 * stops quoting is worse than one that quotes twice). Merging them would have
 * meant changing that decision by accident.
 */
export default class engineLease
  extends Model<engineLeaseAttributes, engineLeaseCreationAttributes>
  implements engineLeaseAttributes
{
  id!: string;
  instanceId!: string;
  hostname?: string;
  pid?: number;
  expiresAt!: Date;
  /**
   * The fencing token (plans/done/ORDER-SCALE-10K.md section 2.2 step 5, WP-5.1).
   * Every ledger batch reads this row FOR UPDATE inside its transaction and
   * aborts unless the epoch is the one the process holds; promotion increments
   * it (Phase 6). The claim SQL in utils/engine-lease.ts never writes it, so a
   * renewal cannot reset a bump. Existing installs get the column from
   * scripts/add-engine-lease-epoch-column.mjs; see utils/engine-lease-epoch.ts.
   */
  epoch!: number;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof engineLease {
    return engineLease.init(
      {
        id: {
          type: DataTypes.STRING(64),
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
        epoch: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment:
            "Fencing token for ledger batches: read FOR UPDATE inside every tick, incremented on promotion",
        },
      },
      {
        sequelize,
        modelName: "engineLease",
        tableName: "engine_lease",
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
