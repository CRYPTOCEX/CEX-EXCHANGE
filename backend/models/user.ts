import * as Sequelize from "sequelize";
import { DataTypes, Model, Op } from "sequelize";
import { createUserCacheHooks } from "./init";
import { createError } from "@b/utils/error";
import {
  PROTECTED_SYSTEM_ACCOUNT_FIELDS,
  isReservedEmail,
  isSystemAccountId,
  isSystemAccountEmail,
  systemAccountRefusal,
} from "@b/utils/system-accounts";

/*
 * THE PLATFORM'S OWN ACCOUNTS ARE GUARDED AT THE ROW, NOT ONLY AT THE DOORS.
 *
 * The pool-backing treasury and the AI market maker pool are user rows that
 * hold platform money and that nobody may sign into, edit, suspend or delete.
 * Every admin route that acts on a user by id now refuses them by name, and
 * every authentication door refuses them before touching a hash — but a route
 * that forgets is exactly how the first set of holes opened (the CRM editor
 * could repoint the treasury's `.invalid` address at a real inbox; a Super
 * Admin could soft-delete it and 500 every settlement). These hooks are the
 * backstop: whatever door reaches the model, a system row's credentials,
 * address, authority and lifecycle columns do not change and the row is not
 * destroyed, soft or hard. The creators (`ensureTreasuryUser`,
 * `ensurePoolAccount`) only ever INSERT, which is allowed.
 *
 * The same hooks keep a customer row from TAKING a reserved address: a row
 * registered under `pool-backing@treasury.invalid` before the treasury exists
 * holds the UNIQUE email index forever and the lazy creator 500s on every
 * settlement. The register and admin-create doors refuse that first; this is
 * the row-level belt.
 *
 * `createError` refusals carry a 4xx, which `handleSingleDelete` and the CRM
 * routes pass through as-is instead of wrapping in a 500.
 */
const RESERVED_EMAIL_MESSAGE =
  "This email address is reserved for the platform's own accounts and cannot be assigned to a user";

/** The ids a `where` clause names, for the shapes the routes actually write. */
function idsNamedBy(where: any): string[] {
  const raw = where?.id;
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw)) return raw.filter((v) => typeof v === "string");
  if (raw && typeof raw === "object") {
    const inList = raw[Op.in];
    if (Array.isArray(inList)) return inList.filter((v) => typeof v === "string");
    const eq = raw[Op.eq];
    if (typeof eq === "string") return [eq];
  }
  return [];
}

/** True when a bulk `where` can only match system rows (by id or by email). */
function bulkWhereNamesSystemAccount(where: any): { id: string } | null {
  for (const id of idsNamedBy(where)) {
    if (isSystemAccountId(id)) return { id };
  }
  const email = where?.email;
  if (typeof email === "string" && isSystemAccountEmail(email)) return { id: email };
  return null;
}

function protectedFieldsIn(fields: string[]): string[] {
  return fields.filter((field) => PROTECTED_SYSTEM_ACCOUNT_FIELDS.includes(field));
}

export default class user
  extends Model<userAttributes, userCreationAttributes>
  implements userAttributes
{
  id!: string;
  email?: string;
  password?: string;
  avatar?: string | null;
  /** The public handle. See the column comment for why it exists and why it is nullable. */
  username?: string | null;
  firstName?: string;
  lastName?: string;
  emailVerified!: boolean;
  phone?: string;
  phoneVerified!: boolean;
  roleId!: number;
  /**
   * The JSON profile blob, TYPED AS WHAT IT IS.
   *
   * This said `string`, and the column below is `DataTypes.JSON` with a getter
   * that returns a parsed OBJECT (or null). The generator prefers this class
   * declaration over the column, so `types/models.ts` published `profile?:
   * string` to every consumer — and four call sites had to write
   * `as Record<string, unknown> | null` to use the value the getter actually
   * hands them, which the compiler then rejected as a conversion between
   * non-overlapping types. The cast was working around a lie in this line.
   *
   * `Record<string, any>` rather than a named shape: the blob is written by
   * several unrelated flows (KYC, phone verification, the profile form) and
   * nothing in the tree validates a fixed key set, so a narrower type here
   * would be a second lie in the other direction.
   */
  profile?: Record<string, any> | null;
  lastLogin?: Date;
  lastFailedLogin?: Date | null;
  failedLoginAttempts?: number;
  walletAddress?: string;
  walletProvider?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BANNED";
  settings?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    pushTokens?: any;
    webPushSubscriptions?: any[];
  } | null;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof user {
    return user.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            isEmail: { msg: "email: Must be a valid email address" },
          },
          comment: "User's email address (unique identifier)",
        },
        password: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            len: {
              args: [8, 255],
              msg: "password: Password must be between 8 and 255 characters long",
            },
          },
          comment: "Hashed password for authentication",
        },
        avatar: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img)/.*$", "i"],
              msg: "avatar: Must be a valid URL",
            },
          },
          comment: "URL path to user's profile picture",
        },
        /*
         * THE PUBLIC HANDLE, AND THE ONLY NAME OTHER USERS SEE.
         *
         * Everything this platform shows one user about another was
         * `${firstName} ${lastName}` — the name on the identity document they
         * uploaded for KYC. On a P2P marketplace that is a real exposure:
         * a trader's legal name sits beside their live offers, their payment
         * rails, their country and their trading volume, on a page anybody can
         * open without signing in. Every mature venue solves this the same way
         * and this platform did not.
         *
         * NULLABLE, because every existing account has none and a required
         * column would lock all of them out at the next write. `display-name.ts`
         * falls back to "First L." — a given name and an initial — for anyone
         * who has not set one, which is what the trader profile already did for
         * reviewers and is strictly better than the full name.
         *
         * UNIQUE, CASE-INSENSITIVELY. The index is what makes it a real
         * guarantee rather than a race between two people typing the same handle
         * in the same second; MySQL's default collation is case-insensitive, so
         * `GregMint` and `gregmint` collide as they must — one handle, one
         * person, or the whole point of a handle is gone.
         *
         * THE INDEX COVERS SOFT-DELETED ROWS, and that is deliberate rather
         * than tolerated. `user` is paranoid, so a deleted account keeps its
         * handle — which is correct for an identifier people trade against:
         * inheriting a scammer's handle is a worse failure than not being able
         * to reuse a free one. The availability endpoint queries with
         * `paranoid: false` for exactly this reason, so "taken" is reported by
         * the checker instead of arriving later as a duplicate-key 500 (the
         * shape this codebase has already been bitten by on `email`).
         */
        username: {
          type: DataTypes.STRING(32),
          allowNull: true,
          validate: {
            /*
              Letters, digits and single underscores; starts with a letter; ends
              with a letter or digit. Three rules, each earning its place:

              - STARTS WITH A LETTER, so a handle can never be mistaken for an
                id, an amount or an order number in the places these are printed
                beside numbers.
              - NO LEADING/TRAILING/DOUBLE UNDERSCORE, because `greg_` and
                `greg__mint` are lookalikes of `greg` and `greg_mint` and this
                is a field whose whole job is telling two people apart.
              - 3 TO 32. The floor keeps single-letter handles out of a
                namespace people have to distinguish under time pressure; the
                ceiling is the column.

              A regex and not a bare `isAlphanumeric`: the rule is enforced
              again in `utils/username.ts`, which is what the availability
              checker and the profile writer both call, and this validator is
              the backstop for anything that reaches the model another way.
            */
            is: {
              args: [/^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)*$/],
              msg: "username: Use letters, numbers and single underscores. Start with a letter.",
            },
            len: {
              args: [3, 32],
              msg: "username: Must be between 3 and 32 characters",
            },
          },
          comment:
            "Public handle shown to other users in place of the real name. Unique, case-insensitive.",
        },
        firstName: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            is: {
              args: [/^[\p{L} \-'.]+$/u],
              msg: "firstName: First name can only contain letters, spaces, hyphens, apostrophes, and periods",
            },
          },
          comment: "User's first name",
        },
        lastName: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            is: {
              args: [/^[\p{L} \-'.]+$/u],
              msg: "lastName: Last name can only contain letters, spaces, hyphens, apostrophes, and periods",
            },
          },
          comment: "User's last name",
        },

        emailVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: "Whether the user's email address has been verified",
        },
        phone: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            is: {
              args: ["^\\+[0-9]{7,15}$", ""],
              msg: "phone: Phone number must be in international E.164 format, e.g. +254711972926",
            },
          },
          comment: "User's phone number in E.164 format (e.g. +254711972926)",
        },
        phoneVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: "Whether the user's phone number has been verified",
        },
        roleId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "ID of the role assigned to this user",
        },
        profile: {
          type: DataTypes.JSON,
          allowNull: true,
          get(this: any) {
            /*
             * Guarded on BOTH sides. `typeof` keeps an already-parsed value
             * (prod MySQL) from being parsed again — `JSON.parse("[object
             * Object]")` is the prod-only 500 this class of bug is famous for —
             * and the try/catch keeps a corrupt or legacy value from throwing
             * inside a getter, which is invoked during ordinary reads including
             * authentication.
             */
            const value = this.getDataValue("profile") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
          set(value: any) {
            /*
             * NO JSON.stringify — this column is DataTypes.JSON and Sequelize
             * serialises it on write. Stringifying first stores the TEXT
             * `"{...}"` instead of the VALUE `{...}`, and the getter's single
             * parse then hands back a STRING forever after. That was live on
             * `user.profile`: 15 of 79 rows double-encoded, 11 carrying real
             * customers' data, all of it invisible to the product.
             * A string is still ACCEPTED and unwrapped, because callers exist
             * that pass one; what it must not do is wrap an object.
             */
            if (typeof value === "string") {
              try {
                this.setDataValue("profile", JSON.parse(value));
              } catch {
                this.setDataValue("profile", null as any);
              }
              return;
            }
            this.setDataValue("profile", value ?? (null as any));
          },
          comment: "Additional user profile information in JSON format",
        },
        // Self-custody on-chain address (WalletConnect / SIWE), distinct from
        // wallet.address, which is a per-chain map of CUSTODIAL deposit
        // addresses the platform controls.
        //
        // This was declared on the attributes interface but never defined as a
        // column, so the table had no such field and every NFT query selecting
        // it died with `Unknown column 'seller.walletAddress'`. The on-chain
        // flows genuinely need it: nft/auction/deploy passes it as the auction
        // contract's seller and royalty recipient, nft/auction/[id]/settle uses
        // both sides of it to transfer the NFT and funds, and nft/offer/[id]/
        // confirm matches it against the transaction sender. Those handlers
        // already guard with `if (!walletAddress) throw`, so until a wallet is
        // linked they now fail with a clear message instead of a 500.
        walletAddress: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment:
            "User's self-custody on-chain wallet address (e.g. from WalletConnect/SIWE)",
        },
        walletProvider: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: "Which wallet provider supplied walletAddress (e.g. metamask, walletconnect)",
        },
        lastLogin: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Timestamp of the user's last successful login",
        },
        lastFailedLogin: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Timestamp of the user's last failed login attempt",
        },
        failedLoginAttempts: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
          comment: "Number of consecutive failed login attempts",
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "INACTIVE", "SUSPENDED", "BANNED"),
          allowNull: true,
          defaultValue: "ACTIVE",
          comment: "Current status of the user account",
        },
        settings: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: {
            email: true,
            sms: true,
            push: true,
          },
          get(this: any) {
            /*
             * Guarded on BOTH sides. `typeof` keeps an already-parsed value
             * (prod MySQL) from being parsed again — `JSON.parse("[object
             * Object]")` is the prod-only 500 this class of bug is famous for —
             * and the try/catch keeps a corrupt or legacy value from throwing
             * inside a getter, which is invoked during ordinary reads including
             * authentication.
             */
            const value = this.getDataValue("settings") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
          comment: "User notification and preference settings",
        },
      },
      {
        sequelize,
        modelName: "user",
        tableName: "user",
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
            name: "email",
            unique: true,
            using: "BTREE",
            fields: [{ name: "email" }],
          },
          {
            /* One handle, one person — see the note on the column. Unique at
               the DATABASE, not only in the checker: two people typing the same
               handle in the same second both pass an application-level check. */
            name: "uq_user_username",
            unique: true,
            using: "BTREE",
            fields: [{ name: "username" }],
          },
          {
            name: "UserRoleIdFkey",
            using: "BTREE",
            fields: [{ name: "roleId" }],
          },
          {
            // getFiltered orders every list by createdAt DESC. deletedAt leads
            // because paranoid makes it a constant `IS NULL` ref, which lets
            // MySQL walk createdAt in index order instead of filesorting.
            name: "idx_user_deletedAt_createdAt",
            using: "BTREE",
            fields: [{ name: "deletedAt" }, { name: "createdAt" }],
          },
        ],
        hooks: {
          ...createUserCacheHooks((instance) => instance.id),
          // A customer row may not take an address reserved for the platform's
          // own accounts (see the module note). The system rows themselves are
          // inserted with those addresses — by id, which is the tell.
          beforeCreate: (row: any) => {
            if (!isSystemAccountId(row.id) && isReservedEmail(row.email)) {
              throw createError({ statusCode: 400, message: RESERVED_EMAIL_MESSAGE });
            }
          },
          // walletAddress is an authorisation-bearing field: NFT auction settle
          // and listing buy use it as a PAYOUT TARGET. Until Phase 0 it was
          // permanently NULL and therefore harmless. Now that it is populated,
          // the only legitimate writer is the providerUser mirror hook.
          beforeUpdate: (row: any, opts: any) => {
            if (
              row.changed("walletAddress") &&
              opts?.context?.source !== "providerUserMirror"
            ) {
              throw new Error(
                "user.walletAddress is a mirror of providerUser and may only be changed " +
                  "by the SIWE link flow. See backend/models/access/providerUser.ts."
              );
            }
            const changed: string[] = Array.isArray(row.changed()) ? row.changed() : [];
            if (isSystemAccountId(row.id)) {
              const touched = protectedFieldsIn(changed);
              if (touched.length) {
                throw systemAccountRefusal(
                  row.id,
                  `edited (${touched.join(", ")} is written by nobody but its creator)`
                );
              }
            } else if (changed.includes("email") && isReservedEmail(row.email)) {
              throw createError({ statusCode: 400, message: RESERVED_EMAIL_MESSAGE });
            }
          },
          // beforeUpdate only fires for instance saves. `user.update({...},
          // {where})` is a BULK update and skips it entirely, so the guard would
          // be trivially bypassable by the exact call shape the mirror itself
          // uses. The mirror passes hooks:false, so it never reaches here.
          beforeBulkUpdate: (opts: any) => {
            const fields = opts?.attributes ?? opts?.fields;
            const touchesWallet = Array.isArray(fields)
              ? fields.includes("walletAddress")
              : !!fields && Object.prototype.hasOwnProperty.call(fields, "walletAddress");
            if (touchesWallet && opts?.context?.source !== "providerUserMirror") {
              throw new Error(
                "user.walletAddress is a mirror of providerUser and may only be changed " +
                  "by the SIWE link flow. See backend/models/access/providerUser.ts."
              );
            }
            // `Model.update(values, {where})` hands the hook `attributes = values`;
            // only the keys whose value is actually being written count, so an
            // editor that spreads `email: undefined` is not refused for it.
            const written: string[] = Array.isArray(fields)
              ? fields
              : fields && typeof fields === "object"
                ? Object.keys(fields).filter((key) => fields[key] !== undefined)
                : [];
            const system = bulkWhereNamesSystemAccount(opts?.where);
            if (system) {
              const touched = protectedFieldsIn(written);
              if (touched.length) {
                throw systemAccountRefusal(
                  system.id,
                  `edited (${touched.join(", ")} is written by nobody but its creator)`
                );
              }
            } else if (
              written.includes("email") &&
              !Array.isArray(fields) &&
              isReservedEmail(fields.email)
            ) {
              throw createError({ statusCode: 400, message: RESERVED_EMAIL_MESSAGE });
            }
          },
          // Neither a soft nor a hard delete: soft hides the row from the lazy
          // creator (findByPk is paranoid) and 500s every settlement; hard would
          // cascade the wallets and their private keys wherever the FK allows.
          beforeDestroy: (row: any) => {
            if (isSystemAccountId(row.id)) {
              throw systemAccountRefusal(row.id, "deleted, restored or purged");
            }
          },
          beforeBulkDestroy: (opts: any) => {
            const system = bulkWhereNamesSystemAccount(opts?.where);
            if (system) {
              throw systemAccountRefusal(system.id, "deleted, restored or purged");
            }
          },
        },
      }
    );
  }
  public static associate(models: any) {
    user.hasMany(models.aiInvestment, {
      as: "aiInvestments",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasOne(models.author, {
      as: "author",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.binaryOrder, {
      as: "binaryOrder",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.comment, {
      as: "comments",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.ecommerceOrder, {
      as: "ecommerceOrders",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.ecommerceReview, {
      as: "ecommerceReviews",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasOne(models.ecommerceShippingAddress, {
      as: "ecommerceShippingAddress",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.ecommerceUserDiscount, {
      as: "ecommerceUserDiscounts",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.ecommerceWishlist, {
      as: "ecommerceWishlists",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.exchangeOrder, {
      as: "exchangeOrder",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.exchangeWatchlist, {
      as: "exchangeWatchlists",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.forexAccount, {
      as: "forexAccounts",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.forexInvestment, {
      as: "forexInvestments",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.investment, {
      as: "investments",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.kycApplication, {
      as: "kycApplications",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.mlmReferral, {
      as: "referredReferrals",
      foreignKey: "referredId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.mlmReferral, {
      as: "referrerReferrals",
      foreignKey: "referrerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.mlmReferralReward, {
      as: "referralRewards",
      foreignKey: "referrerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.notification, {
      as: "notifications",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.providerUser, {
      as: "providers",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.belongsTo(models.role, {
      as: "role",
      foreignKey: "roleId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.supportTicket, {
      as: "supportTickets",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.supportTicket, {
      as: "agentSupportTickets",
      foreignKey: "agentId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.transaction, {
      as: "transactions",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasOne(models.twoFactor, {
      as: "twoFactor",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasOne(models.transferPin, {
      as: "transferPin",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.wallet, {
      as: "wallets",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.walletPnl, {
      as: "walletPnls",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // ico
    user.hasMany(models.icoTransaction, {
      as: "icoTransactions",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.icoAdminActivity, {
      as: "icoAdminActivities",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    //p2p
    user.hasMany(models.p2pTrade, {
      as: "p2pTrades",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.p2pOffer, {
      as: "p2pOffers",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.hasMany(models.p2pReview, {
      as: "p2pReviews",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // NFT associations
    user.hasOne(models.nftCreator, {
      as: "nftCreator",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    user.hasMany(models.userBlock, {
      as: "blocks",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      constraints: false,
    });

    user.hasMany(models.userBlock, {
      as: "adminBlocks",
      foreignKey: "adminId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      constraints: false,
    });


  }
}
