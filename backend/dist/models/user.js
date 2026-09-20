"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const init_1 = require("./init");
const error_1 = require("@b/utils/error");
const system_accounts_1 = require("@b/utils/system-accounts");
const RESERVED_EMAIL_MESSAGE = "This email address is reserved for the platform's own accounts and cannot be assigned to a user";
function idsNamedBy(where) {
    const raw = where === null || where === void 0 ? void 0 : where.id;
    if (typeof raw === "string")
        return [raw];
    if (Array.isArray(raw))
        return raw.filter((v) => typeof v === "string");
    if (raw && typeof raw === "object") {
        const inList = raw[sequelize_1.Op.in];
        if (Array.isArray(inList))
            return inList.filter((v) => typeof v === "string");
        const eq = raw[sequelize_1.Op.eq];
        if (typeof eq === "string")
            return [eq];
    }
    return [];
}
function bulkWhereNamesSystemAccount(where) {
    for (const id of idsNamedBy(where)) {
        if ((0, system_accounts_1.isSystemAccountId)(id))
            return { id };
    }
    const email = where === null || where === void 0 ? void 0 : where.email;
    if (typeof email === "string" && (0, system_accounts_1.isSystemAccountEmail)(email))
        return { id: email };
    return null;
}
function protectedFieldsIn(fields) {
    return fields.filter((field) => system_accounts_1.PROTECTED_SYSTEM_ACCOUNT_FIELDS.includes(field));
}
class user extends sequelize_1.Model {
    static initModel(sequelize) {
        return user.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            email: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                validate: {
                    isEmail: { msg: "email: Must be a valid email address" },
                },
                comment: "User's email address (unique identifier)",
            },
            password: {
                type: sequelize_1.DataTypes.STRING(255),
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
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
                validate: {
                    is: {
                        args: ["^/(uploads|img)/.*$", "i"],
                        msg: "avatar: Must be a valid URL",
                    },
                },
                comment: "URL path to user's profile picture",
            },
            username: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
                validate: {
                    is: {
                        args: [/^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)*$/],
                        msg: "username: Use letters, numbers and single underscores. Start with a letter.",
                    },
                    len: {
                        args: [3, 32],
                        msg: "username: Must be between 3 and 32 characters",
                    },
                },
                comment: "Public handle shown to other users in place of the real name. Unique, case-insensitive.",
            },
            firstName: {
                type: sequelize_1.DataTypes.STRING(255),
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
                type: sequelize_1.DataTypes.STRING(255),
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
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Whether the user's email address has been verified",
            },
            phone: {
                type: sequelize_1.DataTypes.STRING(255),
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
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Whether the user's phone number has been verified",
            },
            roleId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: "ID of the role assigned to this user",
            },
            profile: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("profile");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
                set(value) {
                    if (typeof value === "string") {
                        try {
                            this.setDataValue("profile", JSON.parse(value));
                        }
                        catch (_a) {
                            this.setDataValue("profile", null);
                        }
                        return;
                    }
                    this.setDataValue("profile", value !== null && value !== void 0 ? value : null);
                },
                comment: "Additional user profile information in JSON format",
            },
            walletAddress: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                comment: "User's self-custody on-chain wallet address (e.g. from WalletConnect/SIWE)",
            },
            walletProvider: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                comment: "Which wallet provider supplied walletAddress (e.g. metamask, walletconnect)",
            },
            lastLogin: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "Timestamp of the user's last successful login",
            },
            lastFailedLogin: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "Timestamp of the user's last failed login attempt",
            },
            failedLoginAttempts: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0,
                comment: "Number of consecutive failed login attempts",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "INACTIVE", "SUSPENDED", "BANNED"),
                allowNull: true,
                defaultValue: "ACTIVE",
                comment: "Current status of the user account",
            },
            settings: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: {
                    email: true,
                    sms: true,
                    push: true,
                },
                get() {
                    const value = this.getDataValue("settings");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
                comment: "User notification and preference settings",
            },
        }, {
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
                    name: "idx_user_deletedAt_createdAt",
                    using: "BTREE",
                    fields: [{ name: "deletedAt" }, { name: "createdAt" }],
                },
            ],
            hooks: {
                ...(0, init_1.createUserCacheHooks)((instance) => instance.id),
                beforeCreate: (row) => {
                    if (!(0, system_accounts_1.isSystemAccountId)(row.id) && (0, system_accounts_1.isReservedEmail)(row.email)) {
                        throw (0, error_1.createError)({ statusCode: 400, message: RESERVED_EMAIL_MESSAGE });
                    }
                },
                beforeUpdate: (row, opts) => {
                    var _a;
                    if (row.changed("walletAddress") &&
                        ((_a = opts === null || opts === void 0 ? void 0 : opts.context) === null || _a === void 0 ? void 0 : _a.source) !== "providerUserMirror") {
                        throw new Error("user.walletAddress is a mirror of providerUser and may only be changed " +
                            "by the SIWE link flow. See backend/models/access/providerUser.ts.");
                    }
                    const changed = Array.isArray(row.changed()) ? row.changed() : [];
                    if ((0, system_accounts_1.isSystemAccountId)(row.id)) {
                        const touched = protectedFieldsIn(changed);
                        if (touched.length) {
                            throw (0, system_accounts_1.systemAccountRefusal)(row.id, `edited (${touched.join(", ")} is written by nobody but its creator)`);
                        }
                    }
                    else if (changed.includes("email") && (0, system_accounts_1.isReservedEmail)(row.email)) {
                        throw (0, error_1.createError)({ statusCode: 400, message: RESERVED_EMAIL_MESSAGE });
                    }
                },
                beforeBulkUpdate: (opts) => {
                    var _a;
                    var _b;
                    const fields = (_b = opts === null || opts === void 0 ? void 0 : opts.attributes) !== null && _b !== void 0 ? _b : opts === null || opts === void 0 ? void 0 : opts.fields;
                    const touchesWallet = Array.isArray(fields)
                        ? fields.includes("walletAddress")
                        : !!fields && Object.prototype.hasOwnProperty.call(fields, "walletAddress");
                    if (touchesWallet && ((_a = opts === null || opts === void 0 ? void 0 : opts.context) === null || _a === void 0 ? void 0 : _a.source) !== "providerUserMirror") {
                        throw new Error("user.walletAddress is a mirror of providerUser and may only be changed " +
                            "by the SIWE link flow. See backend/models/access/providerUser.ts.");
                    }
                    const written = Array.isArray(fields)
                        ? fields
                        : fields && typeof fields === "object"
                            ? Object.keys(fields).filter((key) => fields[key] !== undefined)
                            : [];
                    const system = bulkWhereNamesSystemAccount(opts === null || opts === void 0 ? void 0 : opts.where);
                    if (system) {
                        const touched = protectedFieldsIn(written);
                        if (touched.length) {
                            throw (0, system_accounts_1.systemAccountRefusal)(system.id, `edited (${touched.join(", ")} is written by nobody but its creator)`);
                        }
                    }
                    else if (written.includes("email") &&
                        !Array.isArray(fields) &&
                        (0, system_accounts_1.isReservedEmail)(fields.email)) {
                        throw (0, error_1.createError)({ statusCode: 400, message: RESERVED_EMAIL_MESSAGE });
                    }
                },
                beforeDestroy: (row) => {
                    if ((0, system_accounts_1.isSystemAccountId)(row.id)) {
                        throw (0, system_accounts_1.systemAccountRefusal)(row.id, "deleted, restored or purged");
                    }
                },
                beforeBulkDestroy: (opts) => {
                    const system = bulkWhereNamesSystemAccount(opts === null || opts === void 0 ? void 0 : opts.where);
                    if (system) {
                        throw (0, system_accounts_1.systemAccountRefusal)(system.id, "deleted, restored or purged");
                    }
                },
            },
        });
    }
    static associate(models) {
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
exports.default = user;
