import { DataTypes, Model, Sequelize } from "sequelize";

/**
 * Registry of providers that can EXECUTE a fiat withdrawal.
 *
 * There was no outbound equivalent of `depositGateway` before this: a fiat
 * withdrawal was always a manual payout an operator settled by hand and then
 * recorded. Adding a provider therefore needs somewhere to record that it exists,
 * whether it is enabled, what it costs and which corridors it covers — the same
 * job `depositGateway` does for money coming in.
 *
 * Deliberately shaped like `depositGateway`, including the per-currency
 * fee/limit maps, so an operator meets one mental model in both directions and
 * the admin surfaces can share conventions.
 *
 * `status` defaults to false. A provider that can move money out must be switched
 * on explicitly, never by merely existing.
 */
export default class withdrawGateway
  extends Model<withdrawGatewayAttributes, withdrawGatewayCreationAttributes>
  implements withdrawGatewayAttributes
{
  id!: string;
  name!: string;
  title!: string;
  description?: string | null;
  image?: string | null;
  alias!: string;
  status!: boolean;
  version?: string;
  /** ISO codes this provider can pay OUT in. JSON; may arrive as a string. */
  currencies?: any;
  fixedFee?: any;
  percentageFee?: any;
  minAmount?: any;
  maxAmount?: any;
  type!: string;
  /**
   * When true, a withdrawal routed to this provider is dispatched automatically
   * on request. When false, an admin still has to approve it and the dispatch
   * happens then. Default false: automatic outbound money movement is opt-in.
   */
  autoDispatch!: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  /* ---- Per-currency accessors, mirroring depositGateway ---------------- */

  /**
   * Resolves a possibly-per-currency value.
   *
   * These columns hold either a scalar or a `{ "KES": 1.5, ... }` map depending
   * on how the row was seeded and on the column type. A caller that does
   * `typeof v === "number"` silently resolves every map to 0, so all reads go
   * through here.
   */
  private resolve(raw: any, currency?: string, fallback: number | null = 0): number | null {
    let value = raw;
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        const n = parseFloat(value);
        return Number.isFinite(n) ? n : fallback;
      }
    }
    if (value === null || value === undefined) return fallback;
    if (typeof value === "number") return value;
    if (typeof value === "object" && currency) {
      const v = value[currency.toUpperCase()];
      if (v === null || v === undefined) return fallback;
      const n = typeof v === "number" ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  }

  public getFixedFee(currency?: string): number {
    return this.resolve(this.getDataValue("fixedFee"), currency, 0) ?? 0;
  }
  public getPercentageFee(currency?: string): number {
    return this.resolve(this.getDataValue("percentageFee"), currency, 0) ?? 0;
  }
  public getMinAmount(currency?: string): number {
    return this.resolve(this.getDataValue("minAmount"), currency, 0) ?? 0;
  }
  /** null means "no ceiling configured" — callers MUST null-check. */
  public getMaxAmount(currency?: string): number | null {
    return this.resolve(this.getDataValue("maxAmount"), currency, null);
  }

  public static initModel(sequelize: Sequelize): typeof withdrawGateway {
    return withdrawGateway.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          unique: "withdrawGatewayNameKey",
        },
        title: { type: DataTypes.STRING(191), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        image: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            is: {
              // Same rule as depositGateway.image: local assets only.
              args: /^\/(uploads|img)\/.*$/,
              msg: "image: must be a local /uploads/... or /img/... path",
            },
          },
        },
        alias: {
          type: DataTypes.STRING(191),
          allowNull: false,
          unique: "withdrawGatewayAliasKey",
          comment: "Stable identifier used to resolve the adapter",
        },
        status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        version: { type: DataTypes.STRING(191), allowNull: true, defaultValue: "0.0.1" },
        currencies: {
          type: DataTypes.JSON,
         allowNull: true,
          get(this: any) {
            /*
             * Guarded both ways: `typeof` stops an already-parsed value (prod
             * MySQL) being parsed a second time, and the try/catch stops a
             * corrupt value throwing inside a getter during an ordinary read.
             */
            const value = this.getDataValue("currencies") as unknown;
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
        fixedFee: {
          type: DataTypes.JSON,
         allowNull: true, defaultValue: 0,
          get(this: any) {
            /*
             * Guarded both ways: `typeof` stops an already-parsed value (prod
             * MySQL) being parsed a second time, and the try/catch stops a
             * corrupt value throwing inside a getter during an ordinary read.
             */
            const value = this.getDataValue("fixedFee") as unknown;
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
        },
        percentageFee: {
          type: DataTypes.JSON,
         allowNull: true, defaultValue: 0,
          get(this: any) {
            /*
             * Guarded both ways: `typeof` stops an already-parsed value (prod
             * MySQL) being parsed a second time, and the try/catch stops a
             * corrupt value throwing inside a getter during an ordinary read.
             */
            const value = this.getDataValue("percentageFee") as unknown;
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
        },
        minAmount: {
          type: DataTypes.JSON,
         allowNull: true, defaultValue: 0,
          get(this: any) {
            /*
             * Guarded both ways: `typeof` stops an already-parsed value (prod
             * MySQL) being parsed a second time, and the try/catch stops a
             * corrupt value throwing inside a getter during an ordinary read.
             */
            const value = this.getDataValue("minAmount") as unknown;
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
        },
        maxAmount: {
          type: DataTypes.JSON,
         allowNull: true,
          get(this: any) {
            /*
             * Guarded both ways: `typeof` stops an already-parsed value (prod
             * MySQL) being parsed a second time, and the try/catch stops a
             * corrupt value throwing inside a getter during an ordinary read.
             */
            const value = this.getDataValue("maxAmount") as unknown;
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
        },
        type: {
          type: DataTypes.STRING(191),
          allowNull: false,
          defaultValue: "FIAT",
        },
        autoDispatch: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment:
            "Dispatch on request instead of waiting for admin approval. Default OFF.",
        },
      },
      {
        sequelize,
        modelName: "withdrawGateway",
        tableName: "withdraw_gateway",
        timestamps: true,
        paranoid: false,
        indexes: [
          { name: "withdrawGatewayNameKey", unique: true, fields: [{ name: "name" }] },
          { name: "withdrawGatewayAliasKey", unique: true, fields: [{ name: "alias" }] },
          { name: "withdrawGatewayStatusIdx", fields: [{ name: "status" }] },
        ],
      }
    );
  }
}
