import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { createHash } from "crypto";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class wallet
  extends Model<walletAttributes, walletCreationAttributes>
  implements walletAttributes
{
  id!: string;
  userId!: string;
  type!: "FIAT" | "SPOT" | "ECO" | "FUTURES" | "COPY_TRADING";
  currency!: string;
  balance!: number;
  inOrder?: number;
  address?: {
    [key: string]: { address: string; network: string; balance: number };
  };
  addressLookupKey?: string;
  status!: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof wallet {
    return wallet.init(
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
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
          },
          comment: "ID of the user who owns this wallet",
        },
        type: {
          type: DataTypes.ENUM("FIAT", "SPOT", "ECO", "FUTURES", "COPY_TRADING"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["FIAT", "SPOT", "ECO", "FUTURES", "COPY_TRADING"]],
              msg: "type: Type must be one of ['FIAT', 'SPOT', 'ECO', 'FUTURES', 'COPY_TRADING']",
            },
          },
          comment: "Type of wallet (FIAT for fiat currencies, SPOT for spot trading, ECO for ecosystem, FUTURES for futures trading)",
        },
        currency: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "currency: Currency cannot be empty" },
          },
          comment: "Currency symbol for this wallet (e.g., BTC, USD, ETH)",
        },
        balance: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "balance: Balance must be a number" },
          },
          comment: "Available balance in this wallet",
        },
        inOrder: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          defaultValue: 0,
          comment: "Amount currently locked in open orders",
        },
        address: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const rawData = this.getDataValue("address");
            if (!rawData) return null;
            if (typeof rawData === "string") {
              /*
               * DEGRADE, NEVER THROW.
               *
               * A bare `JSON.parse` here threw a SyntaxError on any value that
               * was not valid JSON, and a model getter runs on ORDINARY READS —
               * including inside authentication and every wallet listing. One
               * malformed row therefore did not affect one wallet; it 500'd
               * every request that touched it, with a JSON syntax error as the
               * only clue.
               *
               * Such a row is reachable: an import, a hand-edit, a partially
               * written migration, or a legacy value from before this column
               * held JSON at all. `null` is the honest answer — the caller sees
               * a wallet with no address, which is a state it already handles —
               * and it keeps the page up while the row is repaired.
               */
              try {
                return JSON.parse(rawData);
              } catch {
                return null;
              }
            }
            return rawData;
          },
          set(value: any) {
            // Ensure consistent storage format
            if (value === null || value === undefined) {
              this.setDataValue("address", undefined);
              this.setDataValue("addressLookupKey", null as any);
              return;
            }

            /*
             * ─────────────────────────────────────────────────────────────────
             * STORE THE VALUE, NOT ITS TEXT.
             * ─────────────────────────────────────────────────────────────────
             * This used to `JSON.stringify` an object into a column Sequelize
             * already serialises, so the row held the TEXT `"{...}"` rather than
             * the VALUE `{...}`. That is double encoding, and it was measured:
             * 32 of 33 `wallet.address` rows on this install were stored that
             * way.
             *
             * It stayed invisible only because the getter above is equally
             * tolerant — it parses the outer layer and hands back an object
             * either way. Anything reading the column WITHOUT the getter sees
             * the difference, and `raw: true` queries do exactly that.
             *
             * A previous attempt to fix this deleted the whole setter and took
             * `addressLookupKey` with it. That key is a SHA-256 of the primary
             * address backing an O(1) reverse lookup, and losing it broke
             * ecosystem transfers in the worst possible way: the sender was
             * debited, the recipient received 0.00000000 of 10, and no
             * OUTGOING_TRANSFER row was written. So the derivation below stays
             * exactly as it was; only what gets STORED changes.
             *
             * A string input is still accepted and parsed, because rows written
             * before this fix are strings and callers still pass them.
             */
            let parsed: any;
            if (typeof value === "string") {
              try {
                parsed = JSON.parse(value);
              } catch {
                parsed = null;
              }
              // Store the parsed value when it is structure; a string that is
              // not JSON is kept verbatim rather than discarded.
              this.setDataValue("address", (parsed ?? value) as any);
            } else {
              this.setDataValue("address", value as any);
              parsed = value;
            }

            // Derive a deterministic lookup key from the primary address for
            // O(1) indexed reverse lookups (ECOSYS-10). Hash keeps the index
            // fixed-width regardless of address length.
            let firstAddr: string | undefined;
            if (parsed && typeof parsed === "object") {
              const first: any = Object.values(parsed)[0];
              if (first && typeof first.address === "string") {
                firstAddr = first.address;
              }
            }
            if (firstAddr) {
              const hash = createHash("sha256").update(firstAddr).digest("hex");
              this.setDataValue("addressLookupKey", hash as any);
            } else {
              this.setDataValue("addressLookupKey", null as any);
            }
          },
          comment: "Blockchain addresses associated with this wallet",
        },
        addressLookupKey: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment:
            "SHA256 hash of primary blockchain address for O(1) lookup",
        },

        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean" },
          },
          comment: "Whether this wallet is active and usable",
        },
      },
      {
        sequelize,
        modelName: "wallet",
        tableName: "wallet",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "walletUserIdCurrencyTypeKey",
            unique: true,
            using: "BTREE",
            fields: [
              { name: "userId" },
              { name: "currency" },
              { name: "type" },
            ],
          },
          {
            /*
              NOT UNIQUE. The key is a hash of the wallet's FIRST address, and
              under the ecosystem's `per_user` address model every currency
              wallet of one user carries the same address on every EVM chain —
              so the same key on several rows is the designed state, not a
              collision. The reverse lookup this index serves answers "which
              USER owns this address", and every row sharing a key belongs to
              the same user by construction. It was UNIQUE until 6.7.6; the
              live index is relaxed by db.ts `relaxUniqueIndexes()` at the next
              schema sync (alter-sync never changes an existing index's
              uniqueness), or by scripts/relax-wallet-address-lookup.mjs.
            */
            name: "walletAddressLookupKey",
            unique: false,
            using: "BTREE",
            fields: [{ name: "addressLookupKey" }],
          },
          {
            // getFiltered orders every list by createdAt DESC. deletedAt leads
            // because paranoid makes it a constant `IS NULL` ref, which lets
            // MySQL walk createdAt in index order instead of filesorting.
            name: "idx_wallet_deletedAt_createdAt",
            using: "BTREE",
            fields: [{ name: "deletedAt" }, { name: "createdAt" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    wallet.hasMany(models.ecosystemPrivateLedger, {
      as: "ecosystemPrivateLedgers",
      foreignKey: "walletId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    wallet.hasMany(models.ecosystemUtxo, {
      as: "ecosystemUtxos",
      foreignKey: "walletId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    wallet.hasMany(models.transaction, {
      as: "transactions",
      foreignKey: "walletId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    wallet.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    wallet.hasMany(models.walletData, {
      as: "walletData",
      foreignKey: "walletId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
