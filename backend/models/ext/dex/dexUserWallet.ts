import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * One user's in-house wallet, as an ENCRYPTED BLOB THIS SERVER CANNOT OPEN.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * WHAT THIS ROW IS, AND WHAT IT DELIBERATELY IS NOT.
 *
 * `vault` holds a JSON envelope produced by `frontend/lib/web3-wallet/vault.ts`:
 * AES-256-GCM ciphertext, a PBKDF2 salt, an IV, and a list of PUBLIC addresses.
 * The key is derived in the user's browser from a password that never leaves it.
 * There is no column here for a private key, and there is no code path anywhere
 * in this backend that could put one in — `scripts/dex-invariants.mjs` forbids
 * `decrypt(`, `Keypair`, `WalletContractV*` and `mnemonicToPrivateKey` across
 * this whole tree, and `dex-user-wallet-is-opaque.test.ts` asserts the wallet
 * routes never learn the vocabulary.
 *
 * So a full dump of this table is a privacy incident — it reveals which
 * addresses belong to which account — and not a loss of funds. That distinction
 * is the entire product argument for shipping a wallet at all, and it is a
 * property of where the code runs rather than of a policy anyone enforces.
 *
 * ── WHY `vault` IS TEXT AND NOT `DataTypes.JSON` ────────────────────────────
 * Because JSON columns on this platform are a documented trap: prod MySQL
 * returns them pre-parsed and local MariaDB returns a string, so an unguarded
 * getter works on the dev box and 500s in production — and a getter that
 * returns the stored container makes every read-modify-write a silent no-op
 * that cost this repo a whole chat feature. `DataTypes.TEXT` always arrives as
 * a string on both engines, and the server never needs to look inside anyway.
 * The value is opaque here by design; TEXT says so in the schema.
 *
 * ── WHY `paranoid: false` ───────────────────────────────────────────────────
 * Two reasons, and either alone would decide it:
 *
 *   1. `userId` is UNIQUE. A soft delete keeps the row and therefore keeps the
 *      value, so "remove my wallet, then create a new one" would collide with a
 *      row the user cannot see and surface as a 500. That is a known shape on
 *      this platform, not a hypothetical.
 *   2. "Remove my wallet from my account" should remove it. The user still holds
 *      the recovery phrase — that is what self-custody means — so keeping an
 *      undeletable copy of their ciphertext serves nobody but an attacker.
 * ═════════════════════════════════════════════════════════════════════════════
 */
export default class dexUserWallet
  extends Model<dexUserWalletAttributes, dexUserWalletCreationAttributes>
  implements dexUserWalletAttributes
{
  id!: string;
  userId!: string;
  vault!: string;
  vaultVersion!: number;
  label?: string | null;
  backedUpAt?: Date | null;
  lastUnlockedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof dexUserWallet {
    return dexUserWallet.init(
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
        /**
         * The encrypted envelope, verbatim.
         *
         * Validated for SHAPE and SIZE on the way in and never for CONTENT — a
         * check that could tell a well-formed ciphertext from a malformed one
         * is the first step of a decryption capability. See
         * `wallet/utils/vault-shape.ts`, which states the same rule on the
         * route side.
         */
        vault: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: true,
            len: {
              args: [1, 32768],
              msg: "dexUserWallet.vault exceeds the 32 KB envelope limit",
            },
          },
        },
        /**
         * The envelope format, mirrored out of the blob so a future migration
         * can find the rows it has to touch WITHOUT parsing 32 KB of text per
         * row across the whole table.
         */
        vaultVersion: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        label: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        /**
         * When the user proved they had written the recovery phrase down.
         *
         * NULL IS A PRODUCT STATE, NOT MISSING DATA. The wallet hub shows a
         * persistent warning until this is set, because a self-custody wallet
         * whose phrase has never left the screen is one cleared browser away
         * from being gone — and the user has no reason to expect that unless
         * they are told, repeatedly.
         */
        backedUpAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        /**
         * Last successful unlock. Feeds the security panel's "last used" line
         * and nothing else — in particular it is NOT an auth signal, since it is
         * written by a route the client calls after decrypting locally and a
         * client can therefore write it whenever it likes.
         */
        lastUnlockedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "dexUserWallet",
        tableName: "dex_user_wallet",
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
            // One wallet per user in v1. Several accounts live INSIDE one
            // vault (they share a seed), so more rows would mean more seeds —
            // a different feature, and one that needs its own recovery story.
            name: "dexUserWalletUserKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    dexUserWallet.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
