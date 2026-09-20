import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class p2pOffer
  extends Model<p2pOfferAttributes, p2pOfferCreationAttributes>
  implements p2pOfferAttributes
{
  public id!: string;
  public userId!: string;
  public type!: "BUY" | "SELL";
  public currency!: string;
  public walletType!: "FIAT" | "SPOT" | "ECO";
  public priceCurrency?: string; // Currency used for pricing (USD, EUR, GBP, etc.)
  /**
   * Which wallet the PRICE leg lives in — the missing half of `priceCurrency`.
   *
   * `priceCurrency` was a bare label: a code with no wallet type attached, which
   * is enough to render "1.10 USDT" and to look up an FX rate, and not enough to
   * locate a balance. So when the ASSET leg was fiat (`walletType: "FIAT"`, a
   * legal value the composer offers) the only crypto on the offer was the price
   * leg, and the platform could not find it. It escrowed the fiat asset instead
   * — "Insufficient balance. Available: 0 EUR ... deposit more funds to your FIAT
   * wallet" — against a product whose written promise is that it never touches
   * the cash leg (store/content/docs/p2p/index.md:19).
   *
   * With this column the crypto leg is locatable and the escrow can invert; see
   * src/api/(ext)/p2p/utils/escrow-leg.ts for the branch table.
   *
   * NULLABLE, and NULL means "legacy offer, wallet type never derived". Every
   * such offer has a crypto ASSET leg (a fiat-asset offer could not open a trade
   * at all before this fix), so `resolveEscrowLeg` answers from the asset leg
   * without reading this column and legacy rows keep behaving exactly as they
   * do today. Nothing has to be backfilled.
   *
   * Derived at publish time by `resolvePriceCurrencyWalletType()` in
   * src/api/(ext)/p2p/utils/price-currency.ts, which already answers this exact
   * question — FIAT > SPOT > ECO by table membership, USD always FIAT — and
   * which the price-currency list is built never to disagree with. Do not derive
   * it anywhere else, or the composer's list and the stored value will drift.
   */
  public priceWalletType?: "FIAT" | "SPOT" | "ECO" | null;
  public amountConfig!: {
    total: number;
    min?: number;
    max?: number;
    availableBalance?: number;
  };
  public priceConfig!: {
    model: "FIXED" | "MARGIN";
    value: number;
    marketPrice?: number;
    finalPrice: number;
    currency?: string; // Currency for the price (USD, EUR, GBP, etc.)
    marginType?: "percentage" | "fixed";
  };
  public tradeSettings!: {
    autoCancel: number;
    kycRequired: boolean;
    visibility: "PUBLIC" | "PRIVATE";
    termsOfTrade?: string;
    additionalNotes?: string;
  };
  public locationSettings?: {
    country?: string;
    region?: string;
    city?: string;
    restrictions?: string[];
  };
  public userRequirements?: {
    minCompletedTrades?: number;
    minSuccessRate?: number;
    minAccountAge?: number;
    trustedOnly?: boolean;
    /**
     * "Verified" here is the same fact the board publishes as
     * `trader.verified` — `user.emailVerified`. It is deliberately NOT KYC:
     * `tradeSettings.kycRequired` is the KYC gate, and a taker-facing badge
     * that meant one thing on the board and another in the maker's filter
     * would make the board lie. See `offer/[id]/initiate-trade.post.ts`.
     */
    verifiedOnly?: boolean;
  };
  public status!:
    | "DRAFT"
    | "PENDING_APPROVAL"
    | "ACTIVE"
    | "PAUSED"
    | "COMPLETED"
    | "CANCELLED"
    | "REJECTED"
    | "EXPIRED";
  /**
   * Funds currently held in the seller's wallet on behalf of THIS offer.
   *
   * A SELL offer escrows its whole total at creation, but nothing recorded how
   * much, so every release had to re-derive the figure from
   * `amountConfig.total` — which shrinks as trades consume the offer. Any path
   * that released a shrunken total (or no path at all, as with an EXPIRED
   * offer) left the remainder stranded in `wallet.inOrder` with no record
   * tying it to anything. This column is the authoritative amount to release
   * and makes escrow reconcilable.
   */
  public escrowAmount!: number;
  public views!: number;
  public systemTags?: string[];
  public adminNotes?: string;
  public activityLog?: Array<{
    type: string;
    adminId?: string;
    adminName?: string;
    previousStatus?: string;
    reason?: string;
    createdAt: string;
  }>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof p2pOffer {
    return p2pOffer.init(
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
          validate: { isUUID: { args: ANY_UUID_VERSION, msg: "userId must be a valid UUID" } },
        },
        type: {
          type: DataTypes.ENUM("BUY", "SELL"),
          allowNull: false,
          validate: {
            isIn: { args: [["BUY", "SELL"]], msg: "Invalid trade type" },
          },
        },
        currency: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "currency must not be empty" } },
        },
        walletType: {
          type: DataTypes.ENUM("FIAT", "SPOT", "ECO"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["FIAT", "SPOT", "ECO"]],
              msg: "Invalid wallet type",
            },
          },
        },
        priceCurrency: {
          type: DataTypes.STRING(10),
          allowNull: true,
          comment: "Currency used for pricing (USD, EUR, GBP, etc.)",
        },
        priceWalletType: {
          type: DataTypes.ENUM("FIAT", "SPOT", "ECO"),
          // NULLABLE ON PURPOSE: NULL is "legacy offer", and every legacy offer
          // resolves its escrow from the asset leg without reading this column.
          // See the attribute declaration above.
          allowNull: true,
          comment:
            "Wallet type of priceCurrency. Locates the crypto leg when the asset leg is FIAT; NULL = legacy offer.",
          validate: {
            isIn: {
              args: [["FIAT", "SPOT", "ECO"]],
              msg: "Invalid price wallet type",
            },
          },
        },
        amountConfig: {
          type: DataTypes.JSON,
          allowNull: false,
          get() {
            const value = this.getDataValue('amountConfig');
            if (typeof value === 'string') {
              try {
                return JSON.parse(value);
              } catch (e) {
                return {};
              }
            }
            return value || {};
          },
          set(value: any) {
            // Store the PARSED value. This is a DataTypes.JSON column, so
            // Sequelize serialises it itself — handing it a pre-stringified
            // value made MySQL store a JSON *string* containing JSON. ORM
            // reads survived (the getter unwraps one level) but every
            // SQL-level JSON_EXTRACT/filter silently matched nothing.
            if (typeof value === 'string') {
              try {
                this.setDataValue('amountConfig', JSON.parse(value) as any);
              } catch (e) {
                this.setDataValue('amountConfig', {} as any);
              }
            } else if (value !== null && value !== undefined) {
              this.setDataValue('amountConfig', value as any);
            } else {
              this.setDataValue('amountConfig', {} as any);
            }
          }
        },
        priceConfig: {
          type: DataTypes.JSON,
          allowNull: false,
          get() {
            const value = this.getDataValue('priceConfig');
            if (typeof value === 'string') {
              try {
                return JSON.parse(value);
              } catch (e) {
                return {};
              }
            }
            return value || {};
          },
          set(value: any) {
            // Store the PARSED value. This is a DataTypes.JSON column, so
            // Sequelize serialises it itself — handing it a pre-stringified
            // value made MySQL store a JSON *string* containing JSON. ORM
            // reads survived (the getter unwraps one level) but every
            // SQL-level JSON_EXTRACT/filter silently matched nothing.
            if (typeof value === 'string') {
              try {
                this.setDataValue('priceConfig', JSON.parse(value) as any);
              } catch (e) {
                this.setDataValue('priceConfig', {} as any);
              }
            } else if (value !== null && value !== undefined) {
              this.setDataValue('priceConfig', value as any);
            } else {
              this.setDataValue('priceConfig', {} as any);
            }
          }
        },
        tradeSettings: {
          type: DataTypes.JSON,
          allowNull: false,
          get() {
            const value = this.getDataValue('tradeSettings');
            if (typeof value === 'string') {
              try {
                return JSON.parse(value);
              } catch (e) {
                return {};
              }
            }
            return value || {};
          },
          set(value: any) {
            // Store the PARSED value. This is a DataTypes.JSON column, so
            // Sequelize serialises it itself — handing it a pre-stringified
            // value made MySQL store a JSON *string* containing JSON. ORM
            // reads survived (the getter unwraps one level) but every
            // SQL-level JSON_EXTRACT/filter silently matched nothing.
            if (typeof value === 'string') {
              try {
                this.setDataValue('tradeSettings', JSON.parse(value) as any);
              } catch (e) {
                this.setDataValue('tradeSettings', {} as any);
              }
            } else if (value !== null && value !== undefined) {
              this.setDataValue('tradeSettings', value as any);
            } else {
              this.setDataValue('tradeSettings', {} as any);
            }
          }
        },
        locationSettings: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue('locationSettings');
            if (value === null) return null;
            if (typeof value === 'string') {
              try {
                return JSON.parse(value);
              } catch (e) {
                return null;
              }
            }
            return value;
          },
          set(value: any) {
            // Store the PARSED value — see amountConfig for why.
            if (value === null || value === undefined) {
              this.setDataValue('locationSettings', null as any);
            } else if (typeof value === 'string') {
              try {
                this.setDataValue('locationSettings', JSON.parse(value) as any);
              } catch (e) {
                this.setDataValue('locationSettings', null as any);
              }
            } else if (typeof value === 'object') {
              this.setDataValue('locationSettings', value as any);
            } else {
              this.setDataValue('locationSettings', null as any);
            }
          }
        },
        userRequirements: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue('userRequirements');
            if (value === null) return null;
            if (typeof value === 'string') {
              try {
                return JSON.parse(value);
              } catch (e) {
                return null;
              }
            }
            return value;
          },
          set(value: any) {
            // Store the PARSED value — see amountConfig for why.
            if (value === null || value === undefined) {
              this.setDataValue('userRequirements', null as any);
            } else if (typeof value === 'string') {
              try {
                this.setDataValue('userRequirements', JSON.parse(value) as any);
              } catch (e) {
                this.setDataValue('userRequirements', null as any);
              }
            } else if (typeof value === 'object') {
              this.setDataValue('userRequirements', value as any);
            } else {
              this.setDataValue('userRequirements', null as any);
            }
          }
        },
        status: {
          type: DataTypes.ENUM(
            "DRAFT",
            "PENDING_APPROVAL",
            "ACTIVE",
            "PAUSED",
            "COMPLETED",
            "CANCELLED",
            "REJECTED",
            "EXPIRED"
          ),
          allowNull: false,
          defaultValue: "DRAFT",
        },
        escrowAmount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "escrowAmount must be a valid number" },
            min: { args: [0], msg: "escrowAmount cannot be negative" },
          },
        },
        views: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        systemTags: {
          type: DataTypes.JSON,
          allowNull: true,
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: p2pOffer) {
            const value = this.getDataValue("systemTags") as unknown;
            if (value == null) return [];
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return [];
              }
            }
            return value;
          },
        },
        adminNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        activityLog: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: [],
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: p2pOffer) {
            const value = this.getDataValue("activityLog") as unknown;
            if (value == null) return [];
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return [];
              }
            }
            return value;
          },
        },
      },
      {
        sequelize,
        modelName: "p2pOffer",
        tableName: "p2p_offers",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            // Every marketplace read filters on status first, so status leads
            // all four: a single-column index on the trailing column could
            // never be combined with it.
            name: "idx_p2p_offer_status_type",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "type" }],
          },
          {
            // The board's asset/fiat pair filter — currency and priceCurrency
            // are always given together, so one composite beats two indexes.
            name: "idx_p2p_offer_status_currency",
            using: "BTREE",
            fields: [
              { name: "status" },
              { name: "currency" },
              { name: "priceCurrency" },
            ],
          },
          {
            // Serves the ORDER BY, not just the WHERE: highlight.get.ts takes
            // the newest 5 of a status, and the offer list defaults to
            // createdAt — both were pure filesorts.
            name: "idx_p2p_offer_status_createdAt",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "createdAt" }],
          },
          {
            name: "idx_p2p_offer_status_updatedAt",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "updatedAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    p2pOffer.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pOffer.belongsToMany(models.p2pPaymentMethod, {
      through: "p2p_offer_payment_method",
      as: "paymentMethods",
      foreignKey: "offerId",
      otherKey: "paymentMethodId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pOffer.hasOne(models.p2pOfferFlag, {
      as: "flag",
      foreignKey: "offerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pOffer.hasMany(models.p2pTrade, {
      as: "trades",
      foreignKey: "offerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
