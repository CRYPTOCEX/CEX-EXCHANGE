import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import user from "../user";
import { createUserCacheHooks } from "../init";
import { RedisSingleton } from "@b/utils/redis";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

const cacheHooks = createUserCacheHooks();

// The mirror writes below run with hooks:false on the user model, which is what
// lets them past the walletAddress guard — but that also disables the user
// model's own cache hooks, so a stale `user:<id>:profile` would keep serving the
// old address. Redis is best-effort here: a failed DEL must not roll back a
// verified wallet link.
async function invalidateUserProfileCache(userId: string) {
  try {
    await RedisSingleton.getInstance().del(`user:${userId}:profile`);
  } catch {
    /* cache invalidation is best-effort; the DB write already succeeded */
  }
}

export default class providerUser
  extends Model<providerUserAttributes, providerUserCreationAttributes>
  implements providerUserAttributes
{
  id!: string;
  provider!: "GOOGLE" | "WALLET";
  providerUserId!: string;
  userId!: string;
  isPrimary?: boolean | null;
  chainId?: number | null;
  verifiedAt?: Date | null;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // providerUser belongsTo user via userId
  user!: user;
  getUser!: Sequelize.BelongsToGetAssociationMixin<user>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<user, string>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<user>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof providerUser {
    return providerUser.init(
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
        },
        providerUserId: {
          type: DataTypes.STRING(255),
          allowNull: false,
          // Normalise on write, here and nowhere else. Callers hand us the SIWE
          // message's EIP-55 checksummed form, so the same address arrives with
          // different casing depending on which wallet produced the message;
          // storing it verbatim makes the UNIQUE index and every lookup depend
          // on the table's collation being case-insensitive. Doing it in the
          // column setter means every writer is covered without each one having
          // to remember, and readers can lowercase their needle unconditionally.
          //
          // Only 0x-addresses are touched. A GOOGLE `sub` is an opaque
          // provider-issued identifier and must survive byte-for-byte.
          set(value: string) {
            this.setDataValue(
              "providerUserId",
              typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value)
                ? value.toLowerCase()
                : value
            );
          },
          validate: {
            notNull: {
              msg: "providerUserId: Provider user ID cannot be null",
            },
            len: {
              args: [1, 255],
              msg: "providerUserId: Provider user ID must be between 1 and 255 characters",
            },
          },
        },
        provider: {
          type: DataTypes.ENUM("GOOGLE", "WALLET"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["GOOGLE", "WALLET"]],
              msg: "provider: Provider must be 'GOOGLE' or 'WALLET'",
            },
          },
        },
        // NULL or TRUE, never FALSE. MySQL permits unlimited NULLs in a UNIQUE
        // index, so UNIQUE(userId, provider, isPrimary) enforces "at most one
        // primary link per (user, provider)" at the database rather than in
        // application code. Storing FALSE would make every non-primary row
        // collide.
        isPrimary: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: null,
          comment:
            "TRUE for the one link mirrored into user.walletAddress; NULL otherwise. Never FALSE.",
        },
        chainId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "EIP-155 chain id the SIWE signature was proven on",
        },
        verifiedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "When the SIWE signature for this link was verified",
        },
      },
      {
        sequelize,
        modelName: "providerUser",
        tableName: "provider_user",
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
            name: "providerUserId",
            unique: true,
            using: "BTREE",
            fields: [{ name: "providerUserId" }],
          },
          {
            name: "ProviderUserUserIdFkey",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "providerUserPrimaryPerProvider",
            unique: true,
            using: "BTREE",
            fields: [
              { name: "userId" },
              { name: "provider" },
              { name: "isPrimary" },
            ],
          },
        ],
        hooks: {
          ...cacheHooks,
          // user.walletAddress is a DENORMALISED MIRROR of the primary WALLET
          // link, kept because ~11 NFT handlers select it directly and
          // rewriting them into joins is a large diff with no user-visible
          // benefit. The mirror is written here and nowhere else; the guard in
          // backend/models/user.ts enforces that.
          afterSave: async (row: any, opts: any) => {
            if (row.provider !== "WALLET" || row.isPrimary !== true) return;
            await sequelize.models.user.update(
              {
                walletAddress: row.providerUserId,
                walletProvider: "WALLETCONNECT",
              },
              {
                where: { id: row.userId },
                transaction: opts?.transaction,
                // hooks:false skips the guard in user.ts — this hook IS the
                // sanctioned writer — but it also skips that model's cache
                // hooks, so the profile cache is cleared explicitly below.
                hooks: false,
                context: { source: "providerUserMirror" },
              } as any
            );
            await invalidateUserProfileCache(row.userId);
          },
          afterDestroy: async (row: any, opts: any) => {
            // createUserCacheHooks() already defines afterDestroy; spreading it
            // above and then declaring our own would silently replace it, so
            // the profile cache would stop being invalidated on unlink. Call it
            // rather than shadow it.
            await cacheHooks.afterDestroy(row);
            if (row.provider !== "WALLET") return;
            const next = await sequelize.models.providerUser.findOne({
              where: { userId: row.userId, provider: "WALLET" },
              order: [["createdAt", "ASC"]],
              transaction: opts?.transaction,
            });
            if (next) {
              // Promoting the next link re-enters afterSave, which rewrites the
              // mirror to that address.
              await next.update(
                { isPrimary: true },
                { transaction: opts?.transaction }
              );
              return;
            }
            await sequelize.models.user.update(
              { walletAddress: null, walletProvider: null },
              {
                where: { id: row.userId },
                transaction: opts?.transaction,
                hooks: false,
                context: { source: "providerUserMirror" },
              } as any
            );
            await invalidateUserProfileCache(row.userId);
          },
        },
      }
    );
  }
  public static associate(models: any) {
    providerUser.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
