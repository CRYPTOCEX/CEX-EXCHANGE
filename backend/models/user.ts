import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { createUserCacheHooks } from "./init";

export default class user
  extends Model<userAttributes, userCreationAttributes>
  implements userAttributes
{
  id!: string;
  email?: string;
  password?: string;
  avatar?: string | null;
  firstName?: string;
  lastName?: string;
  emailVerified!: boolean;
  phone?: string;
  phoneVerified!: boolean;
  roleId!: number;
  profile?: string;
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
  };
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
          unique: "email",
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
              args: ["^[+0-9]+$", "i"],
              msg: "phone: Phone number must contain only digits and can start with a plus sign",
            },
          },
          comment: "User's phone number with country code",
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
          get() {
            const rawData = this.getDataValue("profile");
            // Parse the JSON string back into an object
            return rawData
              ? typeof rawData === "string"
                ? JSON.parse(rawData)
                : rawData
              : null;
          },
          set(value) {
            // Convert the JavaScript object into a JSON string before saving
            this.setDataValue("profile", JSON.stringify(value));
          },
          comment: "Additional user profile information in JSON format",
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
          get() {
            const rawData = this.getDataValue("settings");
            // Parse the JSON string back into an object
            return rawData
              ? typeof rawData === "string"
                ? JSON.parse(rawData)
                : rawData
              : null;
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
            name: "id",
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
            name: "UserRoleIdFkey",
            using: "BTREE",
            fields: [{ name: "roleId" }],
          },
        ],
        hooks: {
          ...createUserCacheHooks((instance) => instance.id),
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
    user.hasOne(models.kycApplication, {
      as: "kyc",
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
    user.hasMany(models.paymentIntent, {
      as: "paymentIntents",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    user.belongsTo(models.role, {
      as: "role",
      foreignKey: "roleId",
      onDelete: "CASCADE",
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
