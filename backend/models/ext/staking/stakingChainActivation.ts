import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * THE LEGAL RECORD BEHIND ON-CHAIN STAKING, one per chain and network.
 *
 * The vendor ships defaults and a paper trail, not a licence. Before a chain
 * can take a customer's coins the operator declares, in this row: whether it
 * is licensed and by whom, which jurisdictions it serves, that customer coins
 * are ring-fenced from its own, that it guarantees no reward, what it did to
 * vet the validators, the commission it defaults to, its slashing policy, and
 * the disclosure text it accepted — with who accepted it, when, from which
 * address, and which version.
 *
 * Jurisdiction rules are DERIVED from the declaration by
 * `staking/utils/real/activation.ts`, never typed: Singapore retail is blocked
 * and non-removable while declared; Dubai is refused (pooling is incompatible
 * with per-client wallets); Hong Kong refuses Lido and requires `sfcAttestation`;
 * the UK enables the prescribed warning and forces affiliate rewards off; the
 * US shows the contested-state warning.
 *
 * `status` is the intake kill switch for the chain. PAUSED stops NEW stakes on
 * every pool of the chain; observation, unbonding, claims, returns and refunds
 * never stop. RETIRED is terminal.
 */
function decimalGetter(field: string) {
  return function (this: Model): number {
    const raw = this.getDataValue(field as never) as unknown;
    if (raw === null || raw === undefined) return raw as never;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : (0 as number);
  };
}

export default class stakingChainActivation
  extends Model<stakingChainActivationAttributes, stakingChainActivationCreationAttributes>
  implements stakingChainActivationAttributes
{
  id!: string;
  chain!: string;
  network!: string;
  venue!: "SOLANA_NATIVE" | "LIDO_STETH";
  status!: "DRAFT" | "ACTIVE" | "PAUSED" | "RETIRED";
  stakingWalletId!: string | null;
  validatorSetId!: string | null;
  /** Default commission on observed rewards, percent, copied onto new pools. */
  defaultCommissionPercent!: number;
  /** Notice period before a commission INCREASE takes effect, in days. */
  commissionNoticeDays!: number;
  slashingPolicy!: "PASS_THROUGH" | "REIMBURSE_CAPPED";
  slashingReimburseCap!: number | null;
  licensed!: boolean;
  regulator!: string | null;
  licenceReference!: string | null;
  /** JSON array of ISO-3166 alpha-2 codes the operator declares it serves. */
  jurisdictionsServed!: string | null;
  ringFenceAcknowledged!: boolean;
  noGuaranteeAcknowledged!: boolean;
  validatorDueDiligence!: string | null;
  /** Hong Kong: the SFC staking-services attestation. */
  sfcAttestation!: boolean;
  disclosureVersion!: string | null;
  disclosureHash!: string | null;
  /** The operator-facing disclosure accepted at activation, verbatim. */
  disclosureText!: string | null;
  acceptedBy!: string | null;
  acceptedAt!: Date | null;
  acceptedIp!: string | null;
  acceptedUserAgent!: string | null;
  activatedAt!: Date | null;
  pausedAt!: Date | null;
  pausedBy!: string | null;
  pausedReason!: string | null;
  retiredAt!: Date | null;
  createdBy!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof stakingChainActivation {
    return stakingChainActivation.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        chain: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "chain: Chain must not be empty" } },
        },
        network: {
          type: DataTypes.STRING(32),
          allowNull: false,
          validate: { notEmpty: { msg: "network: Network must not be empty" } },
        },
        venue: {
          type: DataTypes.ENUM("SOLANA_NATIVE", "LIDO_STETH"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["SOLANA_NATIVE", "LIDO_STETH"]],
              msg: "venue: Must be one of: SOLANA_NATIVE, LIDO_STETH",
            },
          },
        },
        status: {
          type: DataTypes.ENUM("DRAFT", "ACTIVE", "PAUSED", "RETIRED"),
          allowNull: false,
          defaultValue: "DRAFT",
          validate: {
            isIn: {
              args: [["DRAFT", "ACTIVE", "PAUSED", "RETIRED"]],
              msg: "status: Must be one of: DRAFT, ACTIVE, PAUSED, RETIRED",
            },
          },
        },
        stakingWalletId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        validatorSetId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        defaultCommissionPercent: {
          type: DataTypes.DECIMAL(10, 8),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("defaultCommissionPercent"),
          validate: {
            min: { args: [0], msg: "defaultCommissionPercent: Cannot be negative" },
            max: { args: [100], msg: "defaultCommissionPercent: Cannot exceed 100%" },
          },
        },
        commissionNoticeDays: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 30,
          validate: {
            isInt: { msg: "commissionNoticeDays: Must be an integer" },
            min: { args: [0], msg: "commissionNoticeDays: Cannot be negative" },
          },
        },
        slashingPolicy: {
          type: DataTypes.ENUM("PASS_THROUGH", "REIMBURSE_CAPPED"),
          allowNull: false,
          defaultValue: "PASS_THROUGH",
          validate: {
            isIn: {
              args: [["PASS_THROUGH", "REIMBURSE_CAPPED"]],
              msg: "slashingPolicy: Must be one of: PASS_THROUGH, REIMBURSE_CAPPED",
            },
          },
        },
        slashingReimburseCap: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get: decimalGetter("slashingReimburseCap"),
        },
        licensed: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        regulator: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        licenceReference: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        jurisdictionsServed: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        ringFenceAcknowledged: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        noGuaranteeAcknowledged: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        validatorDueDiligence: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        sfcAttestation: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        disclosureVersion: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        disclosureHash: {
          type: DataTypes.STRING(128),
          allowNull: true,
        },
        disclosureText: {
          type: DataTypes.TEXT("long"),
          allowNull: true,
        },
        acceptedBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        acceptedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        acceptedIp: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        acceptedUserAgent: {
          type: DataTypes.STRING(512),
          allowNull: true,
        },
        activatedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        pausedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        pausedBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        pausedReason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        retiredAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingChainActivation",
        tableName: "staking_chain_activations",
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "staking_chain_activations_chain_network_key",
            unique: true,
            fields: [{ name: "chain" }, { name: "network" }],
          },
          { name: "staking_chain_activations_status_idx", fields: [{ name: "status" }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingChainActivation.belongsTo(models.stakingChainWallet, {
      foreignKey: "stakingWalletId",
      as: "stakingWallet",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    stakingChainActivation.belongsTo(models.stakingValidatorSet, {
      foreignKey: "validatorSetId",
      as: "validatorSet",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    stakingChainActivation.hasMany(models.stakingPool, {
      foreignKey: "activationId",
      as: "pools",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    stakingChainActivation.hasMany(models.stakingConsent, {
      foreignKey: "activationId",
      as: "consents",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  }
}
