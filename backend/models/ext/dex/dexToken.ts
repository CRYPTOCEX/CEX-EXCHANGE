import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import {
  CHAIN_ADDRESS_COLUMN_WIDTH,
  DEX_VM_VALUES,
  isAddressValidForVm,
  normalizeChainAddressValue,
} from "@b/utils/dex/units";

/**
 * The swap token catalog. Deliberately NOT ecosystemToken: that table is the
 * CUSTODIAL deposit catalog. A row in it makes the platform issue a deposit
 * address, and a wallet read for such a currency reaches
 * getWalletByUserIdAndCurrency (ecosystem/utils/wallet.ts), which MINTS and
 * encrypts a private key as a side effect of a READ. This addon holds no keys,
 * so it needs its own catalog; `ecosystemTokenId` is a soft link for operators
 * who list the same asset in both places.
 *
 * status / listing / riskLevel are three separate axes ON PURPOSE. Collapsing
 * them means an automated screening downgrade silently overrides an operator
 * decision, and when a token is blocked the operator has to be told WHICH of
 * the three did it.
 *
 * See dexChain.ts for the terse-validate and JSON-in-TEXT conventions.
 */
export default class dexToken
  extends Model<dexTokenAttributes, dexTokenCreationAttributes>
  implements dexTokenAttributes
{
  id!: string;
  chainId!: number;
  vm!: string;
  address!: string;
  symbol!: string;
  name!: string;
  decimals!: number;
  isNative!: boolean;
  logoUrl?: string | null;
  coingeckoId?: string | null;
  status!: boolean;
  listing!: string;
  origin!: string;
  issuerUserId?: string | null;
  mintable?: boolean | null;
  directPoolOnly!: boolean;
  riskLevel?: string | null;
  riskScore?: number | null;
  riskSource?: string | null;
  riskFlags?: string | null;
  riskCheckedAt?: Date | null;
  verifiedSource!: string;
  ecosystemTokenId?: string | null;
  sortOrder!: number;
  notes?: string | null;
  metadata?: string | null;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof dexToken {
    return dexToken.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        chainId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        /**
         * Which virtual machine, denormalised from the chain registry.
         *
         * THE SEEDER HID THIS FOR A WHILE. `address` was STRING(42) with the EVM
         * regex and an unconditional case fold, so the model could not write a
         * Solana mint, a TRON contract or a TON jetton master — but the majors
         * seeder writes through queryInterface, which does not run validators.
         * So 88 tokens across 15 chains existed in the table and every ADMIN
         * write on a non-EVM chain failed: curating, importing or re-screening a
         * token was possible on EVM only.
         */
        vm: {
          type: DataTypes.STRING(8),
          allowNull: false,
          defaultValue: "EVM",
          validate: { isIn: [[...DEX_VM_VALUES]] },
          comment:
            "Decides address encoding. Denormalised because a validator runs inside the model, where the chain registry is a boot-time import cycle",
        },
        address: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: false,
          validate: {
            addressMatchesVm(value: any) {
              if (!isAddressValidForVm((this as any).vm, String(value ?? ""))) {
                throw new Error(
                  `dexToken.address is not a valid ${(this as any).vm ?? "EVM"} address`
                );
              }
            },
          },
          set(value: any) {
            this.setDataValue("address", normalizeChainAddressValue(value));
          },
          comment:
            "Contract address. EVM: lowercase, and the native asset uses the aggregator sentinel 0xeeee...eeee so it is a real value and the chain+address unique index still holds. SVM: the MINT, base58 verbatim. TVM/TON: base58/base64 verbatim — case is data",
        },
        symbol: {
          type: DataTypes.STRING(32),
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(128),
          allowNull: false,
        },
        decimals: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: { min: 0, max: 36 },
          comment:
            "Load-bearing and silently wrong when wrong: every raw<->display conversion scales by it, so an off-by-one moves the decimal point on a real transfer. Validated against an on-chain decimals() call before a token is allowlisted",
        },
        isNative: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        logoUrl: {
          type: DataTypes.STRING(1000),
          allowNull: true,
        },
        coingeckoId: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: "Operator on/off switch — axis 1 of 3",
        },
        listing: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue: "PENDING",
          validate: { isIn: [["PENDING", "ALLOWLISTED", "DENYLISTED"]] },
          comment: "The curation decision, made by a human — axis 2 of 3",
        },
        origin: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue: "EXTERNAL",
          validate: { isIn: [["EXTERNAL", "OPERATOR_ISSUED"]] },
          comment:
            "OPERATOR_ISSUED drives the mandatory conflict disclosure. Issuer, market maker and interface operator in one entity, on a token whose supply that entity can increase, is a configuration that should be reached deliberately rather than by ticking three unrelated switches on three pages",
        },
        issuerUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "Who deployed it, when we know. SET NULL — the token outlives the account",
        },
        mintable: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          comment:
            "NULL = NOT YET PROBED, and null is a third value rather than a soft false. PROBED FROM BYTECODE, never from operator input. A PROXY records null with probeReason PROXY_UNDECIDABLE: selector-presence is positive evidence, but selector-ABSENCE is evidence of absence only for a non-proxy contract, and a confident `false` on a contract whose implementation can be swapped is worse than an honest unknown",
        },
        directPoolOnly: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment:
            "Unquotable while dexDirectPoolsEnabled is off, with its own refusal reason rather than folded into a generic one",
        },
        riskLevel: {
          type: DataTypes.STRING(16),
          allowNull: true,
          validate: { isIn: [["SAFE", "CAUTION", "BLOCKED"]] },
          comment: "The machine verdict from screening — axis 3 of 3",
        },
        riskScore: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: { min: 0, max: 100 },
        },
        riskSource: {
          type: DataTypes.STRING(32),
          allowNull: true,
          comment: "Screening provider that produced riskLevel/riskScore",
        },
        riskFlags: {
          type: DataTypes.TEXT,
          allowNull: true,
          set(value: any) {
            this.setDataValue(
              "riskFlags",
              typeof value === "string" ? value : JSON.stringify(value)
            );
          },
          get() {
            const v = this.getDataValue("riskFlags");
            return typeof v === "string" ? JSON.parse(v) : (v ?? null);
          },
          comment:
            'JSON array of slugs: "honeypot", "high_sell_tax", "proxy_upgradeable", "low_liquidity"',
        },
        riskCheckedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment:
            "Drives the staleness refusal — a token whose screening is older than the configured window is not quotable",
        },
        verifiedSource: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue: "MANUAL",
          validate: { isIn: [["MANUAL", "TOKENLIST", "AGGREGATOR"]] },
          comment: "How this row entered the catalog",
        },
        ecosystemTokenId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment:
            "Soft link to the custodial catalog for operators who list the same asset in both. Never used to resolve a wallet",
        },
        sortOrder: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          set(value: any) {
            this.setDataValue(
              "metadata",
              typeof value === "string" ? value : JSON.stringify(value)
            );
          },
          get() {
            const v = this.getDataValue("metadata");
            return typeof v === "string" ? JSON.parse(v) : (v ?? null);
          },
        },
      },
      {
        sequelize,
        modelName: "dexToken",
        tableName: "dex_token",
        timestamps: true,
        // A delisted token must stay resolvable or every historical dexSwap
        // row that references it renders as a blank asset.
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            // One ERC20 contract on one chain is one asset. Without this,
            // "is this token allowed" answers differently depending on which
            // duplicate the query ordered first — a security-relevant
            // ambiguity, because one duplicate can be DENYLISTED and the
            // other ALLOWLISTED.
            name: "dexTokenChainAddressKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "chainId" }, { name: "address" }],
          },
          {
            name: "dexTokenPickerIdx",
            using: "BTREE",
            fields: [{ name: "chainId" }, { name: "status" }, { name: "listing" }],
          },
          {
            name: "dexTokenSymbolIdx",
            using: "BTREE",
            fields: [{ name: "symbol" }],
          },
          {
            // The re-screen cron's cursor: oldest riskCheckedAt first.
            name: "dexTokenRiskCheckedAtIdx",
            using: "BTREE",
            fields: [{ name: "riskCheckedAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    dexToken.belongsTo(models.ecosystemToken, {
      as: "ecosystemToken",
      foreignKey: "ecosystemTokenId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
