import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import {
  CHAIN_ADDRESS_COLUMN_WIDTH,
  DEX_VM_VALUES,
  isAddressValidForVm,
  normalizeChainAddressValue,
  RAW_AMOUNT_RE,
  TX_HASH_RE,
} from "@b/utils/dex/units";

/**
 * The compliance artefact. This is the ONLY server-side evidence of what was
 * offered, to whom, under which jurisdiction and under which token policy —
 * the platform never holds the funds, so the quote row is the whole record.
 *
 * `complianceSnapshot` is a SNAPSHOT, never a join. Settings, the geo list and
 * the token allowlist will all have changed by the time anyone reads this row,
 * so resolving them at read time would answer a different question than the
 * one that was asked at quote time.
 *
 * paranoid: false — a soft delete on a compliance log is a bug waiting to be
 * argued about in a dispute.
 *
 * See dexChain.ts for the terse-validate and JSON-in-TEXT conventions.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EVERY ADDRESS COLUMN HERE IS VM-AWARE, AND THE ROW CARRIES ITS OWN `vm`.
 *
 * All six were `STRING(42)` with `is: EVM_ADDRESS_RE` and an unconditional
 * `.toLowerCase()` setter — three separate reasons a non-EVM quote could not be
 * persisted at all. A Solana mint is 44 base58 characters, so it overflows the
 * width, fails the regex, AND is destroyed by the case fold. The route reached
 * `dexQuote.create`, Sequelize threw, and `POST /api/dex/quote` answered 500 on
 * every chain that was not EVM — so the Jupiter, SunSwap and STON.fi adapters,
 * the address layer and the confirmation pollers were all complete and none of
 * them was reachable.
 *
 * `vm` is DENORMALISED rather than joined from `dexChain` for the same reason it
 * is on the chain row: a validator runs inside the model, where a query is not
 * available and an import of the registry is a boot-time cycle.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * The validator every address column below shares.
 *
 * A FUNCTION, not `is: RE`, because the correct regex depends on another column
 * and `is:` cannot see `this`. Built once and named per field, rather than six
 * hand-written copies — six copies is how one of them keeps the old EVM regex
 * through a refactor and nobody notices until a chain that uses it goes live.
 *
 * THE COLUMN DEFINITIONS THEMSELVES STAY OBJECT LITERALS. Returning a whole
 * column from a factory would hide `type:` and `allowNull:` from
 * generate-model-types.ts, which reads the literal with a regex — the same
 * fragility the file header's terse-validate convention exists for.
 */
function vmAddressValidator(field: string, optional: boolean) {
  return function (this: any, value: any) {
    if (optional && (value === null || value === undefined || value === "")) return;
    if (!isAddressValidForVm(this?.vm, String(value ?? ""))) {
      throw new Error(`dexQuote.${field} is not a valid ${this?.vm ?? "EVM"} address`);
    }
  };
}
export default class dexQuote
  extends Model<dexQuoteAttributes, dexQuoteCreationAttributes>
  implements dexQuoteAttributes
{
  id!: string;
  userId!: string;
  chainId!: number;
  vm!: string;
  pairId?: string | null;
  sellTokenId!: string;
  buyTokenId!: string;
  sellTokenAddress!: string;
  buyTokenAddress!: string;
  sellAmountRaw!: string;
  buyAmountRaw!: string;
  minBuyAmountRaw!: string;
  sellAmountDisplay!: number;
  buyAmountDisplay!: number;
  sellUsd?: number | null;
  buyUsd?: number | null;
  takerAddress!: string;
  takerVerified!: boolean;
  aggregator!: string;
  venueKind!: string;
  venueName?: string | null;
  poolId?: string | null;
  router?: string | null;
  allowanceTarget?: string | null;
  value!: string;
  calldata?: string | null;
  calldataHash?: string | null;
  quoteKey!: string;
  feeBps!: number;
  feeRecipient?: string | null;
  feeSide?: string | null;
  estimatedFeeAmountRaw?: string | null;
  slippageBps!: number;
  priceImpactBps?: number | null;
  estimatedGas?: string | null;
  latencyMs?: number | null;
  outcome!: string;
  routeSummary?: string | null;
  complianceSnapshot!: string;
  status!: string;
  expiresAt!: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof dexQuote {
    return dexQuote.init(
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
        },
        chainId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        pairId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "NULL for an ad-hoc token combination that is not a curated market",
        },
        sellTokenId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        buyTokenId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        /**
         * Which virtual machine this quote was built for.
         *
         * Denormalised from the chain registry at create time, and it is what
         * every address validator on this row dispatches on. Defaults to EVM so
         * every row written before the column existed is correct without a data
         * migration — the addon was EVM-only until Solana.
         */
        vm: {
          type: DataTypes.STRING(8),
          allowNull: false,
          defaultValue: "EVM",
          validate: { isIn: [[...DEX_VM_VALUES]] },
          comment:
            "Decides address encoding and whether lowercasing an address destroys it. Denormalised because a validator runs inside the model, where the chain registry is a boot-time import cycle",
        },
        sellTokenAddress: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: false,
          validate: { addressMatchesVm: vmAddressValidator("sellTokenAddress", false) },
          set(value: any) {
            this.setDataValue("sellTokenAddress", normalizeChainAddressValue(value));
          },
          comment:
            "Denormalised so the row still reads correctly if the token row is removed. EVM: lowercase. SVM/TVM/TON: VERBATIM — case is data",
        },
        buyTokenAddress: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: false,
          validate: { addressMatchesVm: vmAddressValidator("buyTokenAddress", false) },
          set(value: any) {
            this.setDataValue("buyTokenAddress", normalizeChainAddressValue(value));
          },
          comment: "Denormalised so the row still reads correctly if the token row is removed",
        },
        sellAmountRaw: {
          type: DataTypes.STRING(78),
          allowNull: false,
          validate: { is: RAW_AMOUNT_RE },
          comment: "Base units as a decimal string — uint256 needs 78 digits, DECIMAL caps at 65",
        },
        buyAmountRaw: {
          type: DataTypes.STRING(78),
          allowNull: false,
          validate: { is: RAW_AMOUNT_RE },
        },
        minBuyAmountRaw: {
          type: DataTypes.STRING(78),
          allowNull: false,
          validate: { is: RAW_AMOUNT_RE },
          comment: "What the router itself will enforce — the slippage floor encoded in the calldata",
        },
        sellAmountDisplay: {
          type: DataTypes.DECIMAL(38, 18),
          allowNull: false,
          get() {
            const v = this.getDataValue("sellAmountDisplay");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "display/aggregation only — LOSSY, never authoritative",
        },
        buyAmountDisplay: {
          type: DataTypes.DECIMAL(38, 18),
          allowNull: false,
          get() {
            const v = this.getDataValue("buyAmountDisplay");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "display/aggregation only — LOSSY, never authoritative",
        },
        sellUsd: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          get() {
            const v = this.getDataValue("sellUsd");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "USD snapshot at quote time — display/aggregation only, LOSSY",
        },
        buyUsd: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          get() {
            const v = this.getDataValue("buyUsd");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "USD snapshot at quote time — display/aggregation only, LOSSY",
        },
        takerAddress: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: false,
          validate: { addressMatchesVm: vmAddressValidator("takerAddress", false) },
          set(value: any) {
            this.setDataValue("takerAddress", normalizeChainAddressValue(value));
          },
        },
        takerVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment:
            "Whether takerAddress was a PROVED wallet link at quote time - a providerUser row with provider WALLET, which is what the SIWE and non-EVM link proofs write. Stored rather than joined because a later verification must not retroactively make an unverified quote look verified. It said dexWalletLink until that table turned out to have no writer anywhere in the product",
        },
        aggregator: {
          type: DataTypes.STRING(32),
          allowNull: false,
          comment:
            'dexProvider.name that produced this route. A DIRECT_POOL route writes "direct" here so Phase 4\'s analytics grouping does not break — but EVERY NEW CONSUMER READS venueKind',
        },
        venueKind: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue: "AGGREGATOR",
          validate: { isIn: [["AGGREGATOR", "DIRECT_POOL"]] },
          comment:
            "NOT NULL with a default, so every existing row stays valid with no compensating script — there is no migration system here and no `down`",
        },
        venueName: {
          type: DataTypes.STRING(32),
          allowNull: true,
          comment:
            "The AMM deployment key on a direct route, distinct from the `aggregator` column above",
        },
        poolId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "Which pool the calldata targets. SET NULL — the quote outlives a pool archive",
        },
        /**
         * NULLABLE, because `dexQuoteOnly` is a kill switch that must still
         * render prices.
         *
         * The three columns that describe a transaction — this, `calldata` and
         * `calldataHash` — were NOT NULL with format validators, and the route
         * wrote `""` into all three when the adapter was called `priceOnly`.
         * An empty string is not null: the validators ran on it and refused it,
         * so turning the kill switch ON made every quote answer 500 instead of
         * rendering a price. The switch's entire purpose is to keep the page
         * alive while refusing execution.
         *
         * NULL is the honest spelling of "there is no transaction". An empty
         * string as a sentinel is the same trap as a zero that means unknown —
         * it is a value comparisons accept.
         */
        router: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: true,
          validate: { addressMatchesVm: vmAddressValidator("router", true) },
          set(value: any) {
            this.setDataValue("router", normalizeChainAddressValue(value));
          },
          comment:
            "The transaction `to` the user will sign against. On SVM this is the aggregator's PROGRAM id, on TON the router contract — the same role, a different encoding",
        },
        allowanceTarget: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: true,
          validate: { addressMatchesVm: vmAddressValidator("allowanceTarget", true) },
          set(value: any) {
            this.setDataValue("allowanceTarget", normalizeChainAddressValue(value));
          },
          comment:
            "Spender for the ERC20/TRC20 approval — often NOT the router. Always NULL on SVM and TON: neither has an allowance model, so a value here would be a nonsense the client would then ask the user to sign",
        },
        value: {
          type: DataTypes.STRING(78),
          allowNull: false,
          defaultValue: "0",
          validate: { is: RAW_AMOUNT_RE },
          comment: "Native value in wei attached to the transaction — non-zero only when selling the native asset",
        },
        calldata: {
          type: DataTypes.TEXT("long"),
          // NULL under dexQuoteOnly — see the note on `router`.
          allowNull: true,
          comment:
            "The exact payload the user signs, and it is NOT hex on every VM: EVM hex calldata, SVM a base64 v0 transaction, TVM the JSON `triggersmartcontract` object, TON a base64 message BOC. LONGTEXT because multi-hop routes exceed 64 KB",
        },
        calldataHash: {
          type: DataTypes.STRING(66),
          /*
            NULL under dexQuoteOnly — see the note on `router`. A NULL here is
            load-bearing at the record route: a quote with no binding key was
            never executable, so a transaction claiming to be it is refused
            rather than compared against nothing.
          */
          allowNull: true,
          validate: { is: TX_HASH_RE },
          set(value: any) {
            this.setDataValue(
              "calldataHash",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
          /*
            STILL `0x` + 64 HEX ON EVERY VM, and deliberately so — this column is
            an internal binding key, not a chain artefact, so there is no reason
            for its shape to vary. `hashQuoteCalldata` in utils/receipt.ts is
            what keeps that true: keccak256 over EVM calldata bytes, sha256 over
            the exact stored string everywhere else.
          */
          comment:
            "Hash of `calldata` — the binding key the execute path verifies against. keccak256 on EVM, sha256 of the stored payload on every other VM; always rendered 0x + 64 hex",
        },
        quoteKey: {
          type: DataTypes.STRING(64),
          allowNull: false,
          comment: "sha256 of the normalised request — the dedup key for the quote-spam guard",
        },
        feeBps: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        feeRecipient: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: true,
          validate: { addressMatchesVm: vmAddressValidator("feeRecipient", true) },
          set(value: any) {
            this.setDataValue("feeRecipient", normalizeChainAddressValue(value));
          },
          comment:
            "Where the integrator fee accrues. On SVM this is a TOKEN ACCOUNT for the fee mint, not a wallet — SPL fees can only arrive in an account that already exists for that mint",
        },
        feeSide: {
          type: DataTypes.STRING(8),
          allowNull: true,
          validate: { isIn: [["SELL", "BUY"]] },
        },
        estimatedFeeAmountRaw: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
        },
        slippageBps: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        priceImpactBps: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        estimatedGas: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
        },
        latencyMs: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "Provider round-trip, fed to the quote-log analytics",
        },
        outcome: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "OK",
          validate: { isIn: [["OK", "NO_ROUTE", "PROVIDER_ERROR", "RATE_LIMITED", "TIMEOUT"]] },
          comment:
            "Why there is or is not a route. Failed attempts are persisted too — a user complaining they could never get a quote is unanswerable otherwise",
        },
        routeSummary: {
          type: DataTypes.TEXT,
          allowNull: true,
          set(value: any) {
            this.setDataValue(
              "routeSummary",
              typeof value === "string" ? value : JSON.stringify(value)
            );
          },
          get() {
            const v = this.getDataValue("routeSummary");
            return typeof v === "string" ? JSON.parse(v) : (v ?? null);
          },
          comment: "Normalised hop list, with the untouched vendor payload preserved under .raw",
        },
        complianceSnapshot: {
          type: DataTypes.TEXT,
          allowNull: false,
          set(value: any) {
            this.setDataValue(
              "complianceSnapshot",
              typeof value === "string" ? value : JSON.stringify(value)
            );
          },
          get() {
            const v = this.getDataValue("complianceSnapshot");
            return typeof v === "string" ? JSON.parse(v) : (v ?? null);
          },
          comment:
            "Resolved country and the signal that produced it, KYC feature state, geo list version, token risk levels at quote time, settings version. A SNAPSHOT, never a join",
        },
        status: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue: "OPEN",
          validate: { isIn: [["OPEN", "USED", "EXPIRED", "CANCELLED"]] },
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        ipAddress: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: "Sized for IPv6 — the geo decision recorded in complianceSnapshot derives from it",
        },
        userAgent: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "dexQuote",
        tableName: "dex_quote",
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
            // The execute path identifies a quote by the hash of the calldata
            // it was handed. Two rows sharing one hash on one chain make
            // "which quote does this transaction belong to" ambiguous, and the
            // loser attaches its compliance snapshot to the wrong trade.
            // Scoped by chainId because identical calldata is legitimate on
            // two chains.
            name: "dexQuoteCalldataHashKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "chainId" }, { name: "calldataHash" }],
          },
          {
            name: "dexQuoteUserCreatedIdx",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "createdAt" }],
          },
          {
            name: "dexQuoteDedupIdx",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "quoteKey" }, { name: "createdAt" }],
          },
          {
            name: "dexQuoteExpiryIdx",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "expiresAt" }],
          },
          {
            name: "dexQuoteChainCreatedIdx",
            using: "BTREE",
            fields: [{ name: "chainId" }, { name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    dexQuote.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    dexQuote.belongsTo(models.dexPair, {
      as: "pair",
      foreignKey: "pairId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    // RESTRICT: the compliance record has to keep naming a real token row.
    // The denormalised *TokenAddress columns cover the case where an operator
    // forces a delete anyway.
    dexQuote.belongsTo(models.dexToken, {
      as: "sellToken",
      foreignKey: "sellTokenId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    dexQuote.belongsTo(models.dexToken, {
      as: "buyToken",
      foreignKey: "buyTokenId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  }
}
