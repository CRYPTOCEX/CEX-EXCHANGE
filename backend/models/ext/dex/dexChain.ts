import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import {
  CHAIN_ADDRESS_COLUMN_WIDTH,
  DEX_VM_VALUES,
  isAddressValidForVm,
  normalizeChainAddressValue,
} from "@b/utils/dex/units";

/**
 * THE VM IS DENORMALISED ONTO THE ROW, and it has to be.
 *
 * The obvious home for `isAddressValidForVm` is the chain registry, which
 * already knows every chain's VM — but `chains.ts` imports `@b/db`, and
 * `initModels()` require()s this file while building it. That import is a cycle
 * resolving to `undefined` at boot. So the registry stays the source of truth
 * and the column exists so the row can validate ITSELF, against helpers in
 * `utils/units.ts` — the one module a model is allowed to import.
 *
 * What it prevents is not a formatting problem. Base58 is CASE-SENSITIVE — it
 * uses upper and lower case as distinct symbols — so the `.toLowerCase()` setter
 * every other address column in this addon carries does not normalise a Solana
 * address, it CHANGES WHICH ACCOUNT IT IS. The row saves. The fee accrues. It
 * accrues somewhere nobody holds a key for, and nothing downstream can detect
 * it, because the value is still a perfectly well-formed base58 string.
 */

/**
 * The persisted operator overlay over the code chain registry
 * (backend/src/api/(ext)/dex/utils/chains.ts). The code registry supplies the
 * defaults; a row here is what an operator changed.
 *
 * Two conventions apply to every model in this directory:
 *
 *  - `validate` blocks are written in the TERSE form (`is: RE`,
 *    `isIn: [[...]]`) rather than the `{ args, msg }` form used elsewhere in
 *    the repo. backend/scripts/generate-model-types.ts matches a column
 *    definition with a regex that tolerates exactly ONE level of nested braces,
 *    so `{ args, msg }` pushes the column past it and the generator never sees
 *    the sibling `defaultValue:` — every defaulted column then lands as
 *    REQUIRED in the generated CreationAttributes. fxInstrument.assetClass and
 *    .status are both mis-typed that way today.
 *  - JSON columns are TEXT with a set()/get() pair, never DataTypes.JSON:
 *    production MySQL pre-parses a JSON column, so a bare JSON.parse() of the
 *    data value 500s on prod only. The declared TS type is therefore the
 *    STORED type (string); the getter hands back the parsed value.
 */
export default class dexChain
  extends Model<dexChainAttributes, dexChainCreationAttributes>
  implements dexChainAttributes
{
  id!: string;
  chainId!: number;
  vm!: string;
  key?: string | null;
  slug!: string;
  name!: string;
  status!: boolean;
  rpcUrlOverride?: string | null;
  publicRpcUrl?: string | null;
  explorerUrl?: string | null;
  requiredConfirmations!: number;
  feeRecipient?: string | null;
  zeroFeeAcknowledged!: boolean;
  feeRecipientUpdatedAt?: Date | null;
  wrappedNative!: string;
  nativeSymbol!: string;
  nativeDecimals!: number;
  aggregatorSupport?: string | null;
  odosReferralCode?: number | null;
  odosReferralTxHash?: string | null;
  odosReferralVerifiedAt?: Date | null;
  metadata?: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof dexChain {
    return dexChain.init(
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
          comment:
            "Numeric chain id. EIP-155 on EVM; a fitted synthetic id on chains that have none (Solana = 1399811149) because this column is INTEGER and the registry ids in circulation overflow it",
        },
        /**
         * Which virtual machine. Denormalised from the code registry so the
         * validators above can dispatch — see the note beside `isValidForVm`.
         *
         * Defaults to EVM so every existing row is correct without a data
         * migration: every chain that existed before this column was added was
         * an EVM chain.
         *
         * THE ALLOWED LIST IS IMPORTED, NOT SPELLED OUT HERE. It was written as
         * a literal `[["EVM", "SVM"]]`, and adding TVM and TON to the code
         * registry left it behind — so the seeder built a perfectly correct TON
         * row and the row's own validator rejected the VM it had just been
         * given. Sharing the constant with `DexVm` means the next VM cannot be
         * half-added.
         */
        vm: {
          type: DataTypes.STRING(8),
          allowNull: false,
          defaultValue: "EVM",
          validate: { isIn: [[...DEX_VM_VALUES]] },
          comment:
            "Virtual machine. Decides address encoding, tx-id shape, whether confirmations count, and whether lowercasing an address destroys it",
        },
        key: {
          type: DataTypes.STRING(20),
          allowNull: true,
          comment:
            "Ecosystem ChainSymbol (ETH, BSC, POLYGON, OPTIMISM, ARBITRUM, BASE) when one exists. NULL is meaningful: it disables the boot cross-check against chainConfigs, which is correct for a chain the ecosystem has no symbol for. A placeholder symbol would make that check compare against nothing",
        },
        slug: {
          type: DataTypes.STRING(32),
          allowNull: false,
          comment: 'Aggregator/indexer path segment — "ethereum", "base"',
        },
        name: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: "New chains are off until an operator enables them",
        },
        rpcUrlOverride: {
          type: DataTypes.STRING(500),
          allowNull: true,
          comment:
            "Server-side RPC. MAY CONTAIN A KEY (Alchemy and Infura embed it in the path) — never serialise this column to a client",
        },
        publicRpcUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
          comment:
            "Browser-side RPC, keyless. A separate column on purpose: one field for both is how an operator leaks a keyed URL into a JS bundle",
        },
        explorerUrl: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        requiredConfirmations: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 3,
        },
        /**
         * THE fee recipient. Not an override of anything — the global
         * `dexFeeRecipient` setting was deleted in Phase 5, because one string
         * cannot be both a Gnosis Safe on mainnet and an EOA on Base, and
         * there is no fallback between those two that is ever the operator's
         * intent. This is per-operator deployment state, so it lives on the
         * chain row beside the RPC override.
         *
         * STORED LOWERCASE, RENDERED CHECKSUMMED — a deliberate divergence
         * from the plan's "store the EIP-55 form". Every other address in this
         * addon is lowercase (`EVM_ADDRESS_RE` is `/^0x[0-9a-f]{40}$/`, and
         * `DEX_CHAIN_STATIC` says so out loud), and the comparisons that
         * matter are byte comparisons against lowercase log topics —
         * `pad32(feeRecipient)` against a `Transfer` topic is how the accrual
         * writer identifies our own fee. One checksummed column in a lowercase
         * addon is a silent mismatch waiting for its first reorg.
         *
         * The checksum still does its job: the admin PUT runs `getAddress()`
         * and REFUSES anything that fails, and the read surfaces return the
         * checksummed form. Validation at the door, canonical storage inside.
         */
        feeRecipient: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: true,
          validate: {
            /*
              A FUNCTION, not `is: RE`, because the correct regex depends on
              another column. `is:` cannot see `this`.
            */
            addressMatchesVm(value: any) {
              if (value === null || value === undefined || value === "") return;
              if (!isAddressValidForVm((this as any).vm, String(value))) {
                throw new Error(
                  `dexChain.feeRecipient is not a valid ${(this as any).vm ?? "EVM"} address`
                );
              }
            },
          },
          set(value: any) {
            this.setDataValue(
              "feeRecipient",
              normalizeChainAddressValue(value)
            );
          },
          comment:
            "Address the integrator fee accrues to on this chain. EVM: lowercase, render with getAddress(). SVM: base58 VERBATIM — lowercasing changes which account it is",
        },
        zeroFeeAcknowledged: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment:
            "Operator has explicitly accepted running this chain at 0 bps. Without it, an enabled chain with dexFeeBps > 0 and no feeRecipient REFUSES to quote (see utils/fee.ts)",
        },
        feeRecipientUpdatedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment:
            "When feeRecipient last changed. Read by the fee console, never by the quote path",
        },
        wrappedNative: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: false,
          validate: {
            addressMatchesVm(value: any) {
              if (!isAddressValidForVm((this as any).vm, String(value ?? ""))) {
                throw new Error(
                  `dexChain.wrappedNative is not a valid ${(this as any).vm ?? "EVM"} address`
                );
              }
            },
          },
          set(value: any) {
            this.setDataValue(
              "wrappedNative",
              normalizeChainAddressValue(value)
            );
          },
          comment:
            "EVM: the WETH-equivalent a native swap routes through. SVM: wrapped SOL's real mint, which aggregators quote directly — not a translation target",
        },
        nativeSymbol: {
          type: DataTypes.STRING(16),
          allowNull: false,
        },
        nativeDecimals: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 18,
        },
        aggregatorSupport: {
          type: DataTypes.TEXT,
          allowNull: true,
          set(value: any) {
            this.setDataValue(
              "aggregatorSupport",
              typeof value === "string" ? value : JSON.stringify(value)
            );
          },
          get() {
            const v = this.getDataValue("aggregatorSupport");
            return typeof v === "string" ? JSON.parse(v) : (v ?? null);
          },
          comment:
            'Per-aggregator availability on this chain, keyed by dexProvider.name: "0x", "1inch", "kyberswap", "lifi", "odos"',
        },
        odosReferralCode: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "Odos on-chain referral code registered for this chain",
        },
        odosReferralTxHash: {
          type: DataTypes.STRING(66),
          allowNull: true,
          set(value: any) {
            this.setDataValue(
              "odosReferralTxHash",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
          comment: "Registration transaction, verified from its receipt",
        },
        odosReferralVerifiedAt: {
          type: DataTypes.DATE,
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
        modelName: "dexChain",
        tableName: "dex_chain",
        timestamps: true,
        paranoid: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            // Two rows for one chain id would let two feeRecipients and two
            // confirmation depths exist for one network, and the swap poller
            // would take whichever the query happened to order first.
            name: "dexChainChainIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "chainId" }],
          },
          {
            // One referral registration transaction belongs to one chain.
            // MySQL treats NULLs as distinct, so every unverified row coexists.
            name: "dexChainOdosReferralTxKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "odosReferralTxHash" }],
          },
          {
            name: "dexChainStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
        ],
      }
    );
  }

  public static associate(_models: any) {
    // dexChain is joined by the numeric chainId, not by its UUID: chainId is
    // what the wallet, the aggregator payloads and every other chain list in
    // the repo carry. A belongsTo/hasMany here would invent a second join key.
  }
}
