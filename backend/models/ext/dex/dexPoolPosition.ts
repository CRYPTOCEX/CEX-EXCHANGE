import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import {
  EVM_ADDRESS_RE,
  RAW_AMOUNT_RE,
  SIGNED_RAW_AMOUNT_RE,
  TX_HASH_RE,
} from "@b/utils/dex/units";

/**
 * A liquidity position the OPERATOR holds, in a pool the operator seeded.
 *
 * THIS IS THE FIRST TIME THIS PLATFORM MODELS A MARKET POSITION. Nothing else
 * does: `futuresPosition` models USERS' positions, and `adminProfit` is a
 * realised-fee ledger with no notion of cost basis, mark or unrealised P&L. So
 * the shape here is deliberately not "revenue" — it is CAPITAL AT RISK whose
 * value changes with price.
 *
 * `paranoid: false`. An on-chain position is a fact.
 *
 * TWO PROHIBITIONS, WRITTEN HERE BECAUSE THIS IS WHERE SOMEBODY WOULD BREAK THEM
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. NEVER SUM AN UNREALISED POSITION VALUE INTO `adminProfit`. It is not
 *    revenue until it is realised AND swept. Mixing a mark-to-market number into
 *    a realised-revenue ledger is exactly the failure where one row means "money
 *    we hold" and another means "money we might collect", and the dashboard
 *    number stops being auditable.
 *
 * 2. NEVER PRESENT IMPERMANENT LOSS AS AN OPPORTUNITY. It is a loss relative to
 *    holding, it is signed, and it is the COST of the fee income shown beside
 *    it. On the worked own-token case the IL headline reads −42.5% while the
 *    operator's real USDC has gone from $100,000 to $31,623 — a −68.4% loss of
 *    hard currency that the IL figure understates by more than a factor of two,
 *    denominated in a price the drained pool itself sets.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `ownerAddress` is THE OPERATOR'S OWN ADDRESS. The platform holds no key for
 * it, signs nothing on its behalf, and cannot move or recover the position.
 */
export default class dexPoolPosition
  extends Model<dexPoolPositionAttributes, dexPoolPositionCreationAttributes>
  implements dexPoolPositionAttributes
{
  id!: string;
  poolId!: string;
  chainId!: number;
  ownerAddress!: string;
  riskAckId!: string;
  openedAt!: Date;
  openTxHash!: string;
  seeded0Raw!: string;
  seeded1Raw!: string;
  seeded0Usd?: number | null;
  seeded1Usd?: number | null;
  usdRateSource?: string | null;
  lpBalanceRaw?: string | null;
  nftTokenId?: string | null;
  tickLower?: number | null;
  tickUpper?: number | null;
  state!: string;
  closedAt?: Date | null;
  realized0Raw?: string | null;
  realized1Raw?: string | null;
  realizedUsd?: number | null;
  metadata?: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof dexPoolPosition {
    return dexPoolPosition.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        poolId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        chainId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        ownerAddress: {
          type: DataTypes.STRING(42),
          allowNull: false,
          validate: { is: EVM_ADDRESS_RE },
          set(value: any) {
            this.setDataValue(
              "ownerAddress",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
          comment:
            "THE OPERATOR'S OWN ADDRESS. The platform never holds this key and cannot move or recover this position",
        },
        riskAckId: {
          type: DataTypes.UUID,
          allowNull: false,
          comment:
            "NOT NULL + RESTRICT makes the acknowledgement gate A SCHEMA FACT rather than a handler convention. There is no code path that can produce a position without one",
        },
        openedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        openTxHash: {
          type: DataTypes.STRING(66),
          allowNull: false,
          validate: { is: TX_HASH_RE },
          set(value: any) {
            this.setDataValue(
              "openTxHash",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
        },
        seeded0Raw: {
          type: DataTypes.STRING(79),
          allowNull: false,
          validate: { is: SIGNED_RAW_AMOUNT_RE },
          comment:
            "COST BASIS in base units. Signed so a top-up appends rather than overwriting — 79 not 78 for the sign, same discipline as dexFeeAccrual.amountRaw",
        },
        seeded1Raw: {
          type: DataTypes.STRING(79),
          allowNull: false,
          validate: { is: SIGNED_RAW_AMOUNT_RE },
          comment: "COST BASIS in base units. Signed",
        },
        seeded0Usd: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          get() {
            const v = this.getDataValue("seeded0Usd");
            return v === null || v === undefined ? null : Number(v);
          },
          comment:
            "STAMPED AT SEED TIME AND NEVER RE-PRICED — the same rule priceDexTokenUsd follows. display/aggregation only, LOSSY. NULL means unpriceable, never 0",
        },
        seeded1Usd: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          get() {
            const v = this.getDataValue("seeded1Usd");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "Stamped at seed time and never re-priced. LOSSY. NULL means unpriceable, never 0",
        },
        usdRateSource: {
          type: DataTypes.STRING(24),
          allowNull: true,
          comment:
            "Which price source stamped the cost basis. A position priced only by its OWN pool is a self-referential mark and must never be headlined",
        },
        lpBalanceRaw: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
          comment: "V2 LP token balance",
        },
        nftTokenId: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
          comment: "V3. A uint256, therefore a STRING — Number() would lose it above 2^53",
        },
        tickLower: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment:
            "V3. v1 is FULL RANGE ONLY: a concentrated range the price leaves becomes 100% one-sided, the pool stops quoting entirely, and the market reads as an outage with no error anywhere",
        },
        tickUpper: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        state: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue: "OPEN",
          validate: { isIn: [["OPEN", "PARTIAL", "CLOSED", "ORPHANED"]] },
          comment:
            "ORPHANED is a real state: a position whose opening receipt disappeared in a reorg is neither open nor closed, and saying so beats guessing",
        },
        closedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        realized0Raw: {
          type: DataTypes.STRING(79),
          allowNull: true,
          validate: { is: SIGNED_RAW_AMOUNT_RE },
          comment: "Signed: a withdrawal is negative against the seeded basis",
        },
        realized1Raw: {
          type: DataTypes.STRING(79),
          allowNull: true,
          validate: { is: SIGNED_RAW_AMOUNT_RE },
        },
        realizedUsd: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          get() {
            const v = this.getDataValue("realizedUsd");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "display/aggregation only — LOSSY, never authoritative",
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          get() {
            const raw = this.getDataValue("metadata");
            if (raw === null || raw === undefined) return null;
            if (typeof raw === "object") return raw;
            try {
              return JSON.parse(raw as any);
            } catch {
              return null;
            }
          },
          set(value: any) {
            this.setDataValue(
              "metadata",
              value === null || value === undefined
                ? null
                : typeof value === "string"
                  ? value
                  : (JSON.stringify(value) as any)
            );
          },
          comment: "JSON-in-TEXT: prod MySQL pre-parses a real JSON column",
        },
      },
      {
        sequelize,
        modelName: "dexPoolPosition",
        tableName: "dex_pool_position",
        timestamps: true,
        paranoid: false,
        indexes: [
          { name: "PRIMARY", unique: true, using: "BTREE", fields: [{ name: "id" }] },
          {
            /*
              The open is ONE SPECIFIC RECEIPT, so a re-run of the seed verifier
              cannot double-open. The index is the serialisation point: two
              writers racing both pass a pre-flight check.
            */
            name: "dexPoolPositionOpenTxKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "poolId" }, { name: "openTxHash" }],
          },
          {
            name: "dexPoolPositionStateIdx",
            using: "BTREE",
            fields: [{ name: "state" }, { name: "chainId" }],
          },
          {
            name: "dexPoolPositionAckIdx",
            using: "BTREE",
            fields: [{ name: "riskAckId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    dexPoolPosition.belongsTo(models.dexPool, {
      as: "pool",
      foreignKey: "poolId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    /*
      RESTRICT, and it is the load-bearing half of the acknowledgement gate: with
      riskAckId NOT NULL, a position CANNOT EXIST in the database without an
      acknowledgement row, and that acknowledgement cannot be deleted while the
      position stands.
    */
    dexPoolPosition.belongsTo(models.dexPoolRiskAck, {
      as: "riskAck",
      foreignKey: "riskAckId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    dexPoolPosition.hasMany(models.dexPoolEvent, {
      as: "events",
      foreignKey: "positionId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
