import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { EVM_ADDRESS_RE, RAW_AMOUNT_RE } from "@b/utils/dex/units";

/**
 * EVIDENCE that a named admin acknowledged, in writing, what seeding a pool
 * makes them.
 *
 * A ROW, NOT A SETTINGS FLAG, and the three reasons are structural. Settings are
 * TEXT, world-readable through `/api/settings`, and GLOBALLY SINGULAR — whereas
 * an acknowledgement is per-pool, per-admin, per-clause-version. A flag can
 * answer "is the gate on"; only a row can answer "who accepted what, when, and
 * which words did they read".
 *
 * `paranoid: false`. Evidence is not soft-deletable.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `clauseHash` IS THE GATE. It is the sha256 of the exact rendered prose. Change
 * ONE CHARACTER of the copy and the hash changes, every prior acknowledgement
 * reads as stale, and seeding is blocked again until somebody re-reads and
 * re-accepts. That is the intended behaviour and not an inconvenience: an
 * acknowledgement of words nobody currently shows is not an acknowledgement.
 *
 * It is also why the clause pack is the ONE piece of user-facing prose in this
 * addon that stays UNTRANSLATED. A locale file cannot be allowed to change what
 * an operator is deemed to have accepted.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `dexPoolPosition.riskAckId` is NOT NULL with onDelete RESTRICT against this
 * table, which makes the gate A SCHEMA FACT rather than a handler convention:
 * there is no code path, present or future, that can produce a position without
 * one. Same principle as UNIQUE (reversalOfId) making "one reversal per accrual"
 * a database fact rather than a comment.
 */
export default class dexPoolRiskAck
  extends Model<dexPoolRiskAckAttributes, dexPoolRiskAckCreationAttributes>
  implements dexPoolRiskAckAttributes
{
  id!: string;
  poolId!: string;
  chainId!: number;
  poolAddress!: string;
  adminUserId?: string | null;
  adminEmail!: string;
  adminName!: string;
  clauseVersion!: string;
  clauseHash!: string;
  clausesAccepted!: string;
  typedConfirmation!: string;
  feeTierBps!: number;
  initialPriceQuotePerBase!: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  acknowledgedAt!: Date;
  waivedByUserId?: string | null;
  revokedAt?: Date | null;
  revokedReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof dexPoolRiskAck {
    return dexPoolRiskAck.init(
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
          comment: "Denormalised — the evidence must outlive the pool row",
        },
        poolAddress: {
          type: DataTypes.STRING(42),
          allowNull: false,
          validate: { is: EVM_ADDRESS_RE },
          set(value: any) {
            this.setDataValue(
              "poolAddress",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
          comment: "Denormalised — the evidence must outlive the pool row",
        },
        adminUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment:
            "NO FOREIGN KEY, deliberately. Same reasoning adminAuditLog gives: an FK would let deleting an admin cascade away the evidence, and would make this INSERT take a shared lock on a `user` row the in-flight request may already hold",
        },
        adminEmail: {
          type: DataTypes.STRING(191),
          allowNull: false,
          comment: "Denormalised at sign time — must remain readable after the account is gone",
        },
        adminName: {
          type: DataTypes.STRING(191),
          allowNull: false,
          comment: "Denormalised at sign time",
        },
        clauseVersion: {
          type: DataTypes.STRING(16),
          allowNull: false,
          comment: '"1.0", or "waived" on an attributed Super-Admin waiver row',
        },
        clauseHash: {
          type: DataTypes.STRING(66),
          allowNull: false,
          comment:
            "sha256 of the exact rendered prose. Change one character of the copy and every prior acknowledgement is stale and seeding re-blocks — which is the point, not a bug",
        },
        clausesAccepted: {
          type: DataTypes.TEXT,
          allowNull: false,
          get() {
            const raw = this.getDataValue("clausesAccepted");
            if (raw === null || raw === undefined) return [];
            if (Array.isArray(raw)) return raw;
            try {
              return JSON.parse(raw as any);
            } catch {
              return [];
            }
          },
          set(value: any) {
            this.setDataValue(
              "clausesAccepted",
              typeof value === "string" ? value : (JSON.stringify(value ?? []) as any)
            );
          },
          comment:
            "JSON-in-TEXT array of the individually-ticked clause ids. Empty on a waiver row, which is itself the record",
        },
        typedConfirmation: {
          type: DataTypes.STRING(128),
          allowNull: false,
          comment:
            "EXACTLY what they typed. Stored so a dispute is answerable from the row rather than reconstructed",
        },
        feeTierBps: {
          type: DataTypes.INTEGER,
          allowNull: false,
          comment:
            "One of the two numbers the typed string encodes. Stored separately so the confirmation can be re-derived and checked",
        },
        initialPriceQuotePerBase: {
          type: DataTypes.STRING(78),
          allowNull: false,
          validate: { is: RAW_AMOUNT_RE },
          comment:
            "The other. On an empty pair the first addLiquidity SETS the price — there is no market to correct a mistyped ratio, and the first arbitrageur takes the difference in the first block",
        },
        ipAddress: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        userAgent: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        acknowledgedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        waivedByUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment:
            'Non-null only on a clauseVersion "waived" row. Turning dexPoolRiskAckRequired off removes the DIALOG, never the RECORD — riskAckId is NOT NULL at the database, so an attributed waiver row is strictly more forensically useful than a gap, and "who allowed this" stays answerable from the position itself',
        },
        revokedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "A full withdrawal revokes the acknowledgement",
        },
        revokedReason: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "dexPoolRiskAck",
        tableName: "dex_pool_risk_ack",
        timestamps: true,
        paranoid: false,
        indexes: [
          { name: "PRIMARY", unique: true, using: "BTREE", fields: [{ name: "id" }] },
          {
            /*
              One acknowledgement per pool per VERSION OF THE PROSE. Re-signing
              the same words is a no-op; signing amended words is a new row, and
              the old one survives as the record of what was accepted before.
            */
            name: "dexPoolRiskAckPoolClauseKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "poolId" }, { name: "clauseHash" }],
          },
          {
            name: "dexPoolRiskAckAdminIdx",
            using: "BTREE",
            fields: [{ name: "adminUserId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    /*
      RESTRICT: the acknowledgement is the evidence for a specific pool, so it
      can never outlive the pool it points at — and, more importantly, the pool
      cannot be hard-deleted to erase the acknowledgement.

      Note there is NO belongsTo(user): see the adminUserId comment. The
      evidence must survive the account.
    */
    dexPoolRiskAck.belongsTo(models.dexPool, {
      as: "pool",
      foreignKey: "poolId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  }
}
