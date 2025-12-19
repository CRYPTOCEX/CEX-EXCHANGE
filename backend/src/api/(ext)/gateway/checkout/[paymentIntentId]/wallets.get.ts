import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { getGatewaySettings } from "@b/utils/gateway";
import { getFiatPriceInUSD,
  getSpotPriceInUSD,
  getEcoPriceInUSD,
} from "@b/api/finance/currency/utils";

export const metadata: OperationObject = { summary: "Get available wallets for checkout",
  description:
    "Retrieves all user wallets that can be used for payment based on gateway settings. Returns wallet balances and exchange rates.",
  operationId: "getCheckoutWallets",
  tags: ["Gateway", "Checkout"],
  parameters: [
    { name: "paymentIntentId",
      in: "path",
      required: true,
      description: "Payment intent ID",
      schema: { type: "string" },
    },
  ],
  responses: { 200: { description: "Available wallets with balances and exchange rates",
    },
    401: { description: "Authentication required",
    },
    404: { description: "Payment not found",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Get Checkout Wallets",
};

interface WalletOption { id: string;
  type: string;
  currency: string;
  balance: number;
  priceInUSD: number;
  exchangeRate: number; // 1 unit of this currency = X units of payment currency
  equivalentAmount: number; // How much of payment amount this wallet can cover
  canCoverFull: boolean;
  icon?: string;
}

async function getPriceInUSD(currency: string, type: string): Promise<number> { try { if (type === "FIAT") { return await getFiatPriceInUSD(currency);
    } else if (type === "SPOT") { return await getSpotPriceInUSD(currency);
    } else if (type === "ECO") { return await getEcoPriceInUSD(currency);
    }
    return 0;
  } catch { return 0;
  }
}

export default async (data: Handler) => { const { params, user, ctx } = data;
  const { paymentIntentId } = params;

  if (!user?.id) { throw createError({ statusCode: 401,
      message: "Authentication required",
    });
  }

  // Find payment
  const payment = await models.gatewayPayment.findOne({ where: { paymentIntentId,
    },
    include: [
      { model: models.gatewayMerchant,
        as: "merchant",
        attributes: ["id", "name", "status"],
      },
    ],
  });

  if (!payment) { throw createError({ statusCode: 404,
      message: "Payment not found",
    });
  }

  // Check if payment is still valid
  if (payment.status !== "PENDING" && payment.status !== "PROCESSING") { throw createError({ statusCode: 400,
      message: `Payment is ${payment.status.toLowerCase()}`,
    });
  }

  // Check if expired
  if (new Date(payment.expiresAt) < new Date()) { throw createError({ statusCode: 400,
      message: "Payment session has expired",
    });
  }

  // Get gateway settings to know which wallet types and currencies are allowed
  const gatewaySettings = await getGatewaySettings();
  const allowedWalletTypes = gatewaySettings.gatewayAllowedWalletTypes || {};

  // Get payment currency price in USD for exchange rate calculations
  const paymentPriceInUSD = await getPriceInUSD(payment.currency, payment.walletType);

  if (!paymentPriceInUSD || paymentPriceInUSD <= 0) { throw createError({ statusCode: 400,
      message: `Could not determine price for payment currency ${payment.currency}`,
    });
  }

  // Build list of allowed wallet type/currency combinations
  const allowedCombinations: Array<{ type: string; currency: string }> = [];
  for (const [walletType, config] of Object.entries(allowedWalletTypes)) { if (config && config.enabled && config.currencies) { for (const currency of config.currencies) { allowedCombinations.push({ type: walletType, currency });
      }
    }
  }

  if (allowedCombinations.length === 0) { // Fallback: if no settings, allow the payment's own wallet type/currency
    allowedCombinations.push({ type: payment.walletType,
      currency: payment.currency,
    });
  }

  // Get user's wallets that match allowed combinations
  const wallets = await models.wallet.findAll({ where: { userId: user.id,
    },
    attributes: ["id", "type", "currency", "balance"],
  });

  // Filter wallets to only those in allowed combinations and with positive balance
  const availableWallets: WalletOption[] = [];

  for (const wallet of wallets) { const isAllowed = allowedCombinations.some(
      (combo) => combo.type === wallet.type && combo.currency === wallet.currency
    );

    if (!isAllowed) continue;

    const balance = parseFloat(wallet.balance);
    if (balance <= 0) continue;

    // Get price of this wallet's currency in USD
    const walletPriceInUSD = await getPriceInUSD(wallet.currency, wallet.type);

    if (!walletPriceInUSD || walletPriceInUSD <= 0) continue;

    // Calculate exchange rate: 1 unit of wallet currency = X units of payment currency
    // Example: 1 EUR ($1.05) = 1.05 / 1.0 = 1.05 USD (if payment is in USD)
    // Example: 1 BTC ($50000) = 50000 / 1.0 = 50000 USD
    const exchangeRate = walletPriceInUSD / paymentPriceInUSD;

    // Calculate equivalent amount in payment currency
    const equivalentAmount = balance * exchangeRate;

    availableWallets.push({ id: wallet.id,
      type: wallet.type,
      currency: wallet.currency,
      balance,
      priceInUSD: walletPriceInUSD,
      exchangeRate,
      equivalentAmount,
      canCoverFull: equivalentAmount >= payment.amount,
    });
  }

  // Sort wallets: same currency/type as payment first, then by equivalent amount descending
  availableWallets.sort((a, b) => { // Prioritize exact match
    const aExact = a.type === payment.walletType && a.currency === payment.currency;
    const bExact = b.type === payment.walletType && b.currency === payment.currency;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    // Then by can cover full
    if (a.canCoverFull && !b.canCoverFull) return -1;
    if (!a.canCoverFull && b.canCoverFull) return 1;

    // Then by equivalent amount descending
    return b.equivalentAmount - a.equivalentAmount;
  });

  // Calculate total equivalent amount across all wallets
  const totalEquivalent = availableWallets.reduce((sum, w) => sum + w.equivalentAmount, 0);
  ctx?.success("Request completed successfully");

  return { payment: { id: payment.paymentIntentId,
      amount: payment.amount,
      currency: payment.currency,
      walletType: payment.walletType,
      priceInUSD: paymentPriceInUSD,
    },
    wallets: availableWallets,
    canPayFull: totalEquivalent >= payment.amount,
    totalEquivalent,
    shortfall: Math.max(0, payment.amount - totalEquivalent),
  };
};
