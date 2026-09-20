import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * ONE ROW PER PLATFORM-CONTROLLED ADDRESS PER (CURRENCY, CHAIN): THE LAST
 * ON-CHAIN FIGURE, WHEN IT WAS READ, AND WHETHER THE LAST ATTEMPT FAILED.
 *
 * He — what custody holds on a chain — is the sum of on-chain reads over
 * every address the platform controls for that (chain, token): the treasury's,
 * the master's, the custodial contracts', and one HD address per customer.
 * A deployment with ten thousand ECO wallets cannot read ten thousand
 * addresses against a public RPC every fifteen minutes, so the customer set
 * is read as a ROTATING SLICE (`poolBackingCustodyReadsPerRun`, oldest-read
 * first) and every other address contributes its CACHED figure with its age.
 * This table is that cache. The console shows "n/N addresses, oldest read"
 * beside He so nobody mistakes a cached sum for a live one.
 *
 * `balance` NULL means "never read": the address is counted in the coverage
 * denominator and the chain's He is reported `partial`, not as a number that
 * silently omits it. `error` is the last attempt's failure and is cleared by
 * the next success; a failed read NEVER writes a zero — every reader that
 * returns "0" on an outage (`getTrc20Balance`, `fetchUTXOWalletBalance`) is
 * wrapped so an outage stays an outage. A treasury or master row with an
 * error makes the chain's He `unknown` for the run. `attemptedAt` moves on
 * every attempt, success or not, and is what the rotation orders on: an
 * address that fails deterministically takes ONE turn per cycle and then
 * goes to the back, so it can never hold the whole slice and starve the rest.
 *
 * A row whose address has LEFT the inventory (a master replaced, a custodial
 * contract set inactive, a wallet soft-deleted) is deleted on the next refresh
 * of its chain, and the ecosystem-side sum only ever counts addresses the
 * inventory still names: a stale figure must not keep contributing to He.
 *
 * `source` records where the figure came from: `chain` (an RPC read of the
 * address), `utxo_pool` (Σ UNSPENT `ecosystemUtxo` rows of the wallet — the
 * platform's spendable view of a customer's UTXO address, refreshed by the
 * deposit scanner), or `mirror` (the wallet's own address-map figure, the
 * only thing available for a Monero customer whose wallet FILE nobody opens
 * on a schedule). A `mirror` figure is not an on-chain fact and the console
 * labels it so.
 */
export default class poolBackingCustodyRead
  extends Model<poolBackingCustodyReadAttributes, poolBackingCustodyReadCreationAttributes>
  implements poolBackingCustodyReadAttributes
{
  id!: string;
  currency!: string;
  chain!: string;
  address!: string;
  walletId?: string | null;
  kind!: "treasury" | "master" | "custodial" | "customer";
  balance?: number | null;
  readAt?: Date | null;
  error?: string | null;
  attemptedAt?: Date | null;
  source!: "chain" | "utxo_pool" | "mirror";
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof poolBackingCustodyRead {
    return poolBackingCustodyRead.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        currency: { type: DataTypes.STRING(191), allowNull: false },
        chain: { type: DataTypes.STRING(50), allowNull: false },
        address: {
          type: DataTypes.STRING(191),
          allowNull: false,
          comment: "The on-chain address (or, for Monero, the wallet file's primary address)",
        },
        walletId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "The ECO wallet that owns the address; NULL for the master and custodial contracts",
        },
        kind: {
          type: DataTypes.ENUM("treasury", "master", "custodial", "customer"),
          allowNull: false,
          comment: "treasury and master are read every run; custodial every run; customers in a rotating slice",
        },
        balance: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "The last successful figure in the currency's unit; NULL = never read. A failed read never writes 0",
        },
        readAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "When `balance` was read; the rotation picks the oldest (NULL first)",
        },
        error: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "The last attempt's failure, cleared by the next success",
        },
        attemptedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment:
            "When the address was last READ OR TRIED; the rotation orders on this (NULL first, then oldest), so an address that fails every run still yields its turn instead of holding the whole slice",
        },
        source: {
          type: DataTypes.ENUM("chain", "utxo_pool", "mirror"),
          allowNull: false,
          defaultValue: "chain",
          comment: "chain = RPC read; utxo_pool = Σ UNSPENT ecosystemUtxo; mirror = the wallet's own map figure (not an on-chain fact)",
        },
      },
      {
        sequelize,
        modelName: "poolBackingCustodyRead",
        tableName: "pool_backing_custody_read",
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
            name: "uq_pool_backing_custody_read_address",
            unique: true,
            using: "BTREE",
            fields: [{ name: "currency" }, { name: "chain" }, { name: "address" }],
          },
          {
            // The console's "oldest read".
            name: "idx_pool_backing_custody_read_readAt",
            using: "BTREE",
            fields: [{ name: "currency" }, { name: "chain" }, { name: "readAt" }],
          },
          {
            // The rotation's ORDER BY: last attempt, NULL first.
            name: "idx_pool_backing_custody_read_attemptedAt",
            using: "BTREE",
            fields: [{ name: "currency" }, { name: "chain" }, { name: "attemptedAt" }],
          },
        ],
      }
    );
  }

  public static associate(_models: any) {
    // None.
  }
}
