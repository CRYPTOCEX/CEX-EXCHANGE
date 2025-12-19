import crypto from "crypto";
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";

// ============================================
// Decimal Precision Utilities
// ============================================

/**
 * Normalizes a numeric amount to 8 decimal places (standard for crypto)
 * This prevents floating-point precision errors in financial calculations
 */
export function normalizeAmount(amount: any): number {
  const num = parseFloat(amount);
  if (!Number.isFinite(num)) return 0;
  // Round to 8 decimal places
  return Math.round(num * 100000000) / 100000000;
}

/**
 * Safely parses and normalizes a balance value
 */
export function parseBalance(value: any): number {
  if (value === null || value === undefined) return 0;
  return normalizeAmount(value.toString());
}

/**
 * Compares two amounts with tolerance for floating-point errors
 */
export function amountsEqual(a: number, b: number, tolerance: number = 0.00000001): boolean {
  return Math.abs(normalizeAmount(a) - normalizeAmount(b)) < tolerance;
}

/**
 * Checks if amount a is greater than or equal to amount b with tolerance
 */
export function amountGte(a: number, b: number, tolerance: number = 0.00000001): boolean {
  return normalizeAmount(a) >= normalizeAmount(b) - tolerance;
}

// ============================================
// API Key Generation
// ============================================

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateRandomString(length: number): string {
  let result = "";
  const charsetLength = CHARSET.length;
  for (let i = 0; i < length; i++) {
    result += CHARSET.charAt(Math.floor(Math.random() * charsetLength));
  }
  return result;
}

export function generateApiKey(prefix: string): string {
  const randomPart = generateRandomString(48);
  return `${prefix}${randomPart}`;
}

export function generatePaymentIntentId(): string {
  return `pi_${generateRandomString(24)}`;
}

export function generateRefundId(): string {
  return `re_${generateRandomString(24)}`;
}

export function generatePayoutId(): string {
  return `po_${generateRandomString(24)}`;
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function getLastFourChars(key: string): string {
  return key.slice(-4);
}

// ============================================
// Webhook Signature
// ============================================

export function signWebhookPayload(
  payload: Record<string, any>,
  secret: string
): { signature: string; timestamp: number } {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signaturePayload = `${timestamp}.${payloadString}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signaturePayload)
    .digest("hex");

  return {
    signature: `sha256=${signature}`,
    timestamp,
  };
}

export function verifyWebhookSignature(
  timestamp: string,
  payload: string,
  signature: string,
  secret: string
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const timestampNum = parseInt(timestamp, 10);

  // Check timestamp (5 minute tolerance)
  if (Math.abs(now - timestampNum) > 300) {
    return false;
  }

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ============================================
// Fee Calculation
// ============================================

export interface FeeCalculation {
  feeAmount: number;
  netAmount: number;
}

export function calculateFees(
  amount: number,
  feeType: "PERCENTAGE" | "FIXED" | "BOTH",
  feePercentage: number,
  feeFixed: number
): FeeCalculation {
  let feeAmount = 0;

  switch (feeType) {
    case "PERCENTAGE":
      feeAmount = (amount * feePercentage) / 100;
      break;
    case "FIXED":
      feeAmount = feeFixed;
      break;
    case "BOTH":
      feeAmount = (amount * feePercentage) / 100 + feeFixed;
      break;
  }

  // Round to 8 decimal places
  feeAmount = Math.round(feeAmount * 100000000) / 100000000;
  const netAmount = Math.round((amount - feeAmount) * 100000000) / 100000000;

  return { feeAmount, netAmount };
}

// ============================================
// API Authentication
// ============================================

export interface GatewayAuthContext {
  merchant: any;
  apiKey: any;
  isTestMode: boolean;
  isSecretKey: boolean;
}

export async function authenticateGatewayApi(
  apiKeyHeader: string | null,
  clientIp?: string | null
): Promise<GatewayAuthContext> {
  if (!apiKeyHeader) {
    throw createError({ statusCode: 401, message: "API key required" });
  }

  // Determine key type from prefix
  const isSecretKey =
    apiKeyHeader.startsWith("sk_live_") || apiKeyHeader.startsWith("sk_test_");
  const isPublicKey =
    apiKeyHeader.startsWith("pk_live_") || apiKeyHeader.startsWith("pk_test_");
  const isTestMode =
    apiKeyHeader.startsWith("sk_test_") || apiKeyHeader.startsWith("pk_test_");

  if (!isSecretKey && !isPublicKey) {
    throw createError({ statusCode: 401, message: "Invalid API key format" });
  }

  // Hash the key and look it up
  const keyHash = hashApiKey(apiKeyHeader);

  const apiKey = await models.gatewayApiKey.findOne({
    where: {
      keyHash,
      status: true,
    },
    include: [
      {
        model: models.gatewayMerchant,
        as: "merchant",
      },
    ],
  });

  if (!apiKey) {
    throw createError({ statusCode: 401, message: "Invalid API key" });
  }

  // Check expiration
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    throw createError({ statusCode: 401, message: "API key expired" });
  }

  // Check merchant status
  if (apiKey.merchant.status !== "ACTIVE") {
    throw createError({
      statusCode: 403,
      message: "Merchant account is not active",
    });
  }

  // SECURITY: Validate IP whitelist for secret keys (server-to-server calls)
  if (isSecretKey && apiKey.ipWhitelist && Array.isArray(apiKey.ipWhitelist) && apiKey.ipWhitelist.length > 0) {
    // Normalize client IP (handle IPv6 localhost etc)
    const normalizedIp = clientIp?.replace(/^::ffff:/, "") || "";
    const isWhitelisted = apiKey.ipWhitelist.some((ip: string) => {
      const normalizedWhitelistIp = ip.replace(/^::ffff:/, "");
      return normalizedWhitelistIp === normalizedIp ||
             normalizedWhitelistIp === "*" ||  // Wildcard
             (normalizedWhitelistIp.includes("/") && isIpInCidr(normalizedIp, normalizedWhitelistIp)); // CIDR notation
    });

    if (!isWhitelisted) {
      throw createError({
        statusCode: 403,
        message: "IP address not whitelisted for this API key",
      });
    }
  }

  // Update last used with IP
  await apiKey.update({
    lastUsedAt: new Date(),
    lastUsedIp: clientIp || null,
  });

  return {
    merchant: apiKey.merchant,
    apiKey,
    isTestMode,
    isSecretKey,
  };
}

// Helper function to check if IP is in CIDR range
function isIpInCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split("/");
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);

    const ipToInt = (ipStr: string) => {
      const parts = ipStr.split(".").map(Number);
      return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
    };

    return (ipToInt(ip) & mask) === (ipToInt(range) & mask);
  } catch {
    return false;
  }
}

export function checkApiPermission(
  apiKey: any,
  requiredPermission: string
): void {
  const permissions = apiKey.permissions || [];
  if (!permissions.includes(requiredPermission) && !permissions.includes("*")) {
    throw createError({
      statusCode: 403,
      message: `Missing required permission: ${requiredPermission}`,
    });
  }
}

// ============================================
// Merchant Balance Management
// ============================================

export async function getOrCreateMerchantBalance(
  merchantId: string,
  currency: string,
  walletType: "FIAT" | "SPOT" | "ECO",
  transaction?: any
): Promise<any> {
  const options = transaction ? { transaction } : {};

  let balance = await models.gatewayMerchantBalance.findOne({
    where: { merchantId, currency, walletType },
    ...options,
  });

  if (!balance) {
    balance = await models.gatewayMerchantBalance.create(
      {
        merchantId,
        currency,
        walletType,
        available: 0,
        pending: 0,
        reserved: 0,
        totalReceived: 0,
        totalRefunded: 0,
        totalFees: 0,
        totalPaidOut: 0,
      },
      options
    );
  }

  return balance;
}

// ============================================
// Real Wallet Transfer Functions
// ============================================

/**
 * Process a multi-wallet gateway refund by refunding to original payment wallets
 * - Debits merchant's gatewayMerchantBalance.pending (NOT wallet.inOrder)
 * - Credits user wallets proportionally in original currencies
 * - Returns fee from admin wallet to user
 */
export async function processMultiWalletRefund(params: {
  userId: string;
  merchantUserId: string;
  merchantId: string;
  paymentCurrency: string;
  allocations: Array<{
    walletId?: string;
    walletType: string;
    currency: string;
    amount: number;
    equivalentInPaymentCurrency: number;
  }>;
  refundAmount: number;
  totalPaymentAmount: number;
  feeAmount: number;
  refundId: string;
  paymentId: string;
  description?: string;
  transaction: any;
}): Promise<{ userTransaction: any }> {
  const {
    userId,
    merchantId,
    allocations,
    refundAmount,
    totalPaymentAmount,
    feeAmount,
    refundId,
    paymentId,
    description,
    transaction: t,
  } = params;

  // Calculate refund proportion (in payment currency terms)
  const refundProportion = refundAmount / totalPaymentAmount;

  // Calculate fee percentage (original fee divided by total payment amount)
  const feePercentageOfPayment = feeAmount / totalPaymentAmount;

  const userTransactions: any[] = [];

  // Process refund for each allocation in the SAME currency as original payment
  for (let i = 0; i < allocations.length; i++) {
    const allocation = allocations[i];

    // Calculate proportional refund for this allocation (in original currency)
    const allocationRefundAmount = allocation.amount * refundProportion;

    // Calculate proportional fee for this allocation
    const allocationFee = allocation.amount * feePercentageOfPayment;

    // Net amount that was credited to merchant (gross - fee)
    const netAmountFromMerchant = allocationRefundAmount - allocationFee;

    // 1. Check merchant's gateway balance for this currency
    const merchantBalance = await models.gatewayMerchantBalance.findOne({
      where: {
        merchantId,
        currency: allocation.currency,
        walletType: allocation.walletType,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!merchantBalance) {
      throw createError({
        statusCode: 400,
        message: `Merchant gateway balance not found for ${allocation.currency} (${allocation.walletType})`,
      });
    }

    const pendingBalance = parseFloat(merchantBalance.pending?.toString() || "0");
    if (pendingBalance < netAmountFromMerchant) {
      throw createError({
        statusCode: 400,
        message: `Insufficient merchant gateway balance for refund in ${allocation.currency}. Available: ${pendingBalance}, Required: ${netAmountFromMerchant}`,
      });
    }

    // 2. Debit merchant's gateway balance (pending)
    await merchantBalance.update(
      {
        pending: pendingBalance - netAmountFromMerchant,
        totalRefunded: parseFloat(merchantBalance.totalRefunded?.toString() || "0") + allocationRefundAmount,
      },
      { transaction: t }
    );

    // 3. Find or create user wallet in allocation's currency/type
    let userWallet = await models.wallet.findOne({
      where: {
        userId,
        currency: allocation.currency,
        type: allocation.walletType,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!userWallet) {
      userWallet = await models.wallet.create(
        {
          userId,
          currency: allocation.currency,
          type: allocation.walletType,
          balance: 0,
          inOrder: 0,
          status: true,
        },
        { transaction: t }
      );
    }

    // 4. Credit user wallet (full refund amount including fee return)
    const userBalance = parseFloat(userWallet.balance.toString());
    await userWallet.update(
      { balance: userBalance + allocationRefundAmount },
      { transaction: t }
    );

    // 5. Create user transaction record
    const userTx = await models.transaction.create(
      {
        userId,
        walletId: userWallet.id,
        type: "REFUND",
        status: "COMPLETED",
        amount: allocationRefundAmount,
        fee: 0,
        description: description || `Refund for payment ${paymentId}`,
        referenceId: `${refundId}_user_${allocation.currency}_${i}`,
        metadata: JSON.stringify({
          paymentId,
          refundId,
          refundAmount: allocationRefundAmount,
          feeReturned: allocationFee,
          equivalentInPaymentCurrency: allocation.equivalentInPaymentCurrency * refundProportion,
          isPartialRefund: allocations.length > 1,
          allocationIndex: i,
        }),
      },
      { transaction: t }
    );

    userTransactions.push(userTx);

    // 6. Return fee from admin wallet in same currency
    if (allocationFee > 0) {
      await returnGatewayFee({
        currency: allocation.currency,
        walletType: allocation.walletType as "FIAT" | "SPOT" | "ECO",
        feeAmount: allocationFee,
        merchantId,
        refundId,
        transaction: t,
      });
    }
  }

  return { userTransaction: userTransactions[0] };
}

/**
 * Return gateway fee from admin wallet in the SAME currency as the allocation
 * This is the correct function for multi-wallet refunds where fees were collected per allocation currency
 */
async function returnGatewayFee(params: {
  currency: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  feeAmount: number;
  merchantId: string;
  refundId: string;
  transaction: any;
}): Promise<void> {
  const {
    currency,
    walletType,
    feeAmount,
    merchantId,
    refundId,
    transaction: t,
  } = params;

  // Get super admin
  const superAdminRole = await models.role.findOne({
    where: { name: "Super Admin" },
  });

  if (!superAdminRole) return;

  const superAdmin = await models.user.findOne({
    where: { roleId: superAdminRole.id },
    order: [["createdAt", "ASC"]],
  });

  if (!superAdmin) return;

  // Admin wallet is in the SAME currency/type as the allocation (since fees were collected in that currency)
  const adminWallet = await models.wallet.findOne({
    where: { userId: superAdmin.id, currency, type: walletType },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  if (!adminWallet) return;

  const adminBalance = parseFloat(adminWallet.balance.toString());
  if (adminBalance >= feeAmount) {
    await adminWallet.update(
      { balance: adminBalance - feeAmount },
      { transaction: t }
    );

    // Create transaction record
    await models.transaction.create(
      {
        userId: superAdmin.id,
        walletId: adminWallet.id,
        type: "OUTGOING_TRANSFER",
        status: "COMPLETED",
        amount: feeAmount,
        fee: 0,
        description: `Gateway fee returned for refund`,
        referenceId: `${refundId}_fee_return_${currency}`,
        metadata: JSON.stringify({
          refundId,
          merchantId,
          type: "GATEWAY_FEE_RETURN",
          currency,
          walletType,
        }),
      },
      { transaction: t }
    );
  }
}

/**
 * Process a gateway payout by moving funds from gatewayMerchantBalance.pending to merchant's wallet.balance
 * - Debits gatewayMerchantBalance.pending (source of truth for gateway funds)
 * - Credits merchant's wallet.balance (actual funds they can use)
 */
export async function processGatewayPayout(params: {
  merchantUserId: string;
  merchantId: string;
  currency: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  amount: number;
  payoutId: string;
  transaction: any;
}): Promise<void> {
  const {
    merchantUserId,
    merchantId,
    currency,
    walletType,
    amount,
    payoutId,
    transaction: t,
  } = params;

  // 1. Find and lock merchant's gateway balance record
  const merchantBalanceRecord = await models.gatewayMerchantBalance.findOne({
    where: { merchantId, currency, walletType },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  if (!merchantBalanceRecord) {
    throw createError({
      statusCode: 400,
      message: `Merchant gateway balance not found for ${currency} (${walletType})`,
    });
  }

  const pendingBalance = parseFloat(merchantBalanceRecord.pending?.toString() || "0");
  if (pendingBalance < amount) {
    throw createError({
      statusCode: 400,
      message: `Insufficient gateway balance for payout. Available: ${pendingBalance}, Requested: ${amount}`,
    });
  }

  // 2. Debit gateway balance (pending) and update tracking
  const currentAvailable = parseFloat(merchantBalanceRecord.available?.toString() || "0");
  await merchantBalanceRecord.update(
    {
      pending: pendingBalance - amount,
      available: currentAvailable + amount,
      totalPaidOut: parseFloat(merchantBalanceRecord.totalPaidOut?.toString() || "0") + amount,
    },
    { transaction: t }
  );

  // 3. Find or create merchant wallet and credit it
  let merchantWallet = await models.wallet.findOne({
    where: { userId: merchantUserId, currency, type: walletType },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  if (!merchantWallet) {
    merchantWallet = await models.wallet.create(
      {
        userId: merchantUserId,
        currency,
        type: walletType,
        balance: 0,
        inOrder: 0,
        status: true,
      },
      { transaction: t }
    );
  }

  // Credit merchant's actual wallet balance
  const walletBalance = parseFloat(merchantWallet.balance?.toString() || "0");
  await merchantWallet.update(
    { balance: walletBalance + amount },
    { transaction: t }
  );

  // 4. Create transaction record for audit trail
  await models.transaction.create(
    {
      userId: merchantUserId,
      walletId: merchantWallet.id,
      type: "INCOMING_TRANSFER",
      status: "COMPLETED",
      amount,
      fee: 0,
      description: `Gateway payout released`,
      referenceId: payoutId,
      metadata: JSON.stringify({
        payoutId,
        merchantId,
        source: "GATEWAY_PAYOUT",
      }),
    },
    { transaction: t }
  );
}

/**
 * Collect gateway fee to super admin wallet
 */
export async function collectGatewayFee(params: {
  currency: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  feeAmount: number;
  merchantId: string;
  paymentId: string;
  transaction: any;
}): Promise<void> {
  const { currency, walletType, feeAmount, merchantId, paymentId, transaction: t } = params;

  // Get super admin role first
  const superAdminRole = await models.role.findOne({
    where: { name: "Super Admin" },
  });

  if (!superAdminRole) {
    logger.warn("GATEWAY", "No super admin role found for fee collection");
    return;
  }

  // Get super admin user
  const superAdmin = await models.user.findOne({
    where: { roleId: superAdminRole.id },
    order: [["createdAt", "ASC"]],
  });

  if (!superAdmin) {
    logger.warn("GATEWAY", "No super admin found for fee collection");
    return;
  }

  // Find or create admin wallet
  let adminWallet = await models.wallet.findOne({
    where: { userId: superAdmin.id, currency, type: walletType },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  if (!adminWallet) {
    adminWallet = await models.wallet.create(
      {
        userId: superAdmin.id,
        currency,
        type: walletType,
        balance: 0,
        inOrder: 0,
        status: true,
      },
      { transaction: t }
    );
  }

  // Credit fee to admin wallet
  const adminBalance = parseFloat(adminWallet.balance.toString());
  await adminWallet.update(
    { balance: adminBalance + feeAmount },
    { transaction: t }
  );

  // Create transaction record for admin
  const adminTransaction = await models.transaction.create(
    {
      userId: superAdmin.id,
      walletId: adminWallet.id,
      type: "INCOMING_TRANSFER",
      status: "COMPLETED",
      amount: feeAmount,
      fee: 0,
      description: `Gateway payment fee`,
      referenceId: `${paymentId}_fee`,
      metadata: JSON.stringify({
        paymentId,
        merchantId,
        type: "GATEWAY_FEE",
      }),
    },
    { transaction: t }
  );

  // Record admin profit
  await models.adminProfit.create(
    {
      transactionId: adminTransaction.id,
      type: "GATEWAY_PAYMENT",
      amount: feeAmount,
      currency,
      description: `Gateway payment fee from merchant ${merchantId}`,
    },
    { transaction: t }
  );
}

/**
 * Update merchant balance tracking (for reporting/dashboard)
 * This tracks both the balance (pending/available) and cumulative totals
 * Exported as updateMerchantBalanceForPayment for external use
 */
export async function updateMerchantBalanceForPayment(params: {
  merchantId: string;
  currency: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  amount: number;
  feeAmount: number;
  transaction: any;
}): Promise<void> {
  return updateMerchantBalanceTracking({
    ...params,
    type: "PAYMENT",
  });
}

/**
 * Internal function for updating merchant balance tracking
 */
async function updateMerchantBalanceTracking(params: {
  merchantId: string;
  currency: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  amount: number;
  feeAmount: number;
  type: "PAYMENT" | "REFUND";
  transaction: any;
}): Promise<void> {
  const { merchantId, currency, walletType, amount, feeAmount, type, transaction: t } = params;

  let balance = await models.gatewayMerchantBalance.findOne({
    where: { merchantId, currency, walletType },
    transaction: t,
  });

  if (!balance) {
    balance = await models.gatewayMerchantBalance.create(
      {
        merchantId,
        currency,
        walletType,
        available: 0,
        pending: 0,
        reserved: 0,
        totalReceived: 0,
        totalRefunded: 0,
        totalFees: 0,
        totalPaidOut: 0,
      },
      { transaction: t }
    );
  }

  const netAmount = amount - feeAmount;

  if (type === "PAYMENT") {
    // Payment: add to pending (will be moved to available on payout)
    await balance.update(
      {
        pending: parseFloat(balance.pending.toString()) + netAmount,
        totalReceived: parseFloat(balance.totalReceived.toString()) + amount,
        totalFees: parseFloat(balance.totalFees.toString()) + feeAmount,
      },
      { transaction: t }
    );
  } else if (type === "REFUND") {
    // Refund: deduct from pending (since funds weren't paid out yet)
    // We use netAmount because merchant only has net in their balance (gross - fee)
    const currentPending = parseFloat(balance.pending.toString());
    const currentAvailable = parseFloat(balance.available.toString());

    // First try to deduct from pending, then from available if needed
    // Use netAmount since pending was increased by netAmount during payment
    let pendingDeduction = Math.min(currentPending, netAmount);
    let availableDeduction = netAmount - pendingDeduction;

    await balance.update(
      {
        pending: currentPending - pendingDeduction,
        available: currentAvailable - availableDeduction,
        // totalRefunded tracks gross for reporting purposes
        totalRefunded: parseFloat(balance.totalRefunded.toString()) + amount,
      },
      { transaction: t }
    );
  }
}

// ============================================
// Webhook Sending
// ============================================

export async function sendWebhook(
  merchantId: string,
  paymentId: string | null,
  refundId: string | null,
  eventType: string,
  url: string,
  payload: Record<string, any>,
  webhookSecret: string
): Promise<void> {
  const { signature } = signWebhookPayload(payload, webhookSecret);

  // Create webhook record
  const webhook = await models.gatewayWebhook.create({
    merchantId,
    paymentId,
    refundId,
    eventType,
    url,
    payload,
    signature,
    status: "PENDING",
    attempts: 0,
    maxAttempts: 5,
  });

  // Attempt to send
  await attemptWebhookDelivery(webhook);
}

export async function attemptWebhookDelivery(webhook: any): Promise<void> {
  const startTime = Date.now();

  try {
    const { signature, timestamp } = signWebhookPayload(
      webhook.payload,
      webhook.merchant?.webhookSecret || ""
    );

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Signature": signature,
        "X-Gateway-Timestamp": timestamp.toString(),
        "X-Gateway-Event": webhook.eventType,
        "User-Agent": "PaymentGateway-Webhook/1.0",
      },
      body: JSON.stringify(webhook.payload),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseTime = Date.now() - startTime;
    const responseBody = await response.text().catch(() => "");

    await webhook.update({
      attempts: webhook.attempts + 1,
      lastAttemptAt: new Date(),
      responseStatus: response.status,
      responseBody: responseBody.substring(0, 1000),
      responseTime,
      status: response.ok ? "SENT" : "RETRYING",
      nextRetryAt: response.ok
        ? null
        : new Date(Date.now() + getRetryDelay(webhook.attempts + 1)),
    });

    if (!response.ok && webhook.attempts + 1 >= webhook.maxAttempts) {
      await webhook.update({ status: "FAILED" });
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    await webhook.update({
      attempts: webhook.attempts + 1,
      lastAttemptAt: new Date(),
      responseTime,
      errorMessage: error.message,
      status:
        webhook.attempts + 1 >= webhook.maxAttempts ? "FAILED" : "RETRYING",
      nextRetryAt:
        webhook.attempts + 1 >= webhook.maxAttempts
          ? null
          : new Date(Date.now() + getRetryDelay(webhook.attempts + 1)),
    });
  }
}

function getRetryDelay(attempt: number): number {
  // Exponential backoff: 1min, 5min, 30min, 2h, 24h
  const delays = [60000, 300000, 1800000, 7200000, 86400000];
  return delays[Math.min(attempt - 1, delays.length - 1)];
}

// ============================================
// Checkout URL Generation
// ============================================

export function generateCheckoutUrl(paymentIntentId: string): string {
  const baseUrl = process.env.APP_PUBLIC_URL || "http://localhost:3000";
  const defaultLocale = process.env.APP_DEFAULT_LOCALE || "en";
  return `${baseUrl}/${defaultLocale}/gateway/checkout/${paymentIntentId}`;
}

// ============================================
// Validation Helpers
// ============================================

export function validateAmount(amount: any): number {
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) {
    throw createError({
      statusCode: 400,
      message: "Amount must be a positive number",
    });
  }
  return parsed;
}

export function validateCurrency(
  currency: string,
  allowedCurrencies: string[]
): void {
  if (!allowedCurrencies.includes(currency.toUpperCase())) {
    throw createError({
      statusCode: 400,
      message: `Currency ${currency} is not supported by this merchant`,
    });
  }
}

export function validateWalletType(
  walletType: string,
  allowedWalletTypes: string[]
): void {
  if (!allowedWalletTypes.includes(walletType)) {
    throw createError({
      statusCode: 400,
      message: `Wallet type ${walletType} is not supported by this merchant`,
    });
  }
}

export function validateUrl(url: string, fieldName: string): void {
  try {
    new URL(url);
  } catch {
    throw createError({
      statusCode: 400,
      message: `${fieldName} must be a valid URL`,
    });
  }
}

// ============================================
// Gateway Settings
// ============================================

const GATEWAY_SETTINGS_KEYS = [
  "gatewayEnabled",
  "gatewayTestMode",
  "gatewayFeePercentage",
  "gatewayFeeFixed",
  "gatewayMinPaymentAmount",
  "gatewayMaxPaymentAmount",
  "gatewayDailyLimit",
  "gatewayMonthlyLimit",
  "gatewayMinPayoutAmount",
  "gatewayPayoutSchedule",
  "gatewayAllowedWalletTypes",
  "gatewayRequireKyc",
  "gatewayAutoApproveVerified",
  "gatewayPaymentExpirationMinutes",
  "gatewayWebhookRetryAttempts",
  "gatewayWebhookRetryDelaySeconds",
];

export interface GatewaySettings {
  gatewayEnabled: boolean;
  gatewayTestMode: boolean;
  gatewayFeePercentage: number;
  gatewayFeeFixed: number;
  gatewayMinPaymentAmount: number;
  gatewayMaxPaymentAmount: number;
  gatewayDailyLimit: number;
  gatewayMonthlyLimit: number;
  gatewayMinPayoutAmount: number;
  gatewayPayoutSchedule: string;
  gatewayAllowedWalletTypes: Record<string, { enabled: boolean; currencies: string[] }>;
  gatewayRequireKyc: boolean;
  gatewayAutoApproveVerified: boolean;
  gatewayPaymentExpirationMinutes: number;
  gatewayWebhookRetryAttempts: number;
  gatewayWebhookRetryDelaySeconds: number;
}

const defaultGatewaySettings: GatewaySettings = {
  gatewayEnabled: true,
  gatewayTestMode: false,
  gatewayFeePercentage: 2.9,
  gatewayFeeFixed: 0.3,
  gatewayMinPaymentAmount: 1,
  gatewayMaxPaymentAmount: 10000,
  gatewayDailyLimit: 50000,
  gatewayMonthlyLimit: 500000,
  gatewayMinPayoutAmount: 50,
  gatewayPayoutSchedule: "DAILY",
  gatewayAllowedWalletTypes: {},
  gatewayRequireKyc: false,
  gatewayAutoApproveVerified: false,
  gatewayPaymentExpirationMinutes: 30,
  gatewayWebhookRetryAttempts: 3,
  gatewayWebhookRetryDelaySeconds: 60,
};

export async function getGatewaySettings(): Promise<GatewaySettings> {
  const settings = await models.settings.findAll({
    where: {
      key: GATEWAY_SETTINGS_KEYS,
    },
  });

  const settingsMap: Partial<GatewaySettings> = {};

  for (const setting of settings) {
    let parsedValue: any = setting.value;

    // Try to parse JSON values
    if (setting.value) {
      try {
        parsedValue = JSON.parse(setting.value);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    // Convert string booleans
    if (parsedValue === "true") parsedValue = true;
    if (parsedValue === "false") parsedValue = false;

    // Convert numeric strings
    if (typeof parsedValue === "string" && !isNaN(Number(parsedValue))) {
      parsedValue = Number(parsedValue);
    }

    (settingsMap as any)[setting.key] = parsedValue;
  }

  return {
    ...defaultGatewaySettings,
    ...settingsMap,
  };
}

// Validate payment against system gateway settings
export async function validatePaymentAgainstSettings(
  amount: number,
  currency: string,
  walletType: string
): Promise<void> {
  const settings = await getGatewaySettings();

  // Check if gateway is enabled
  if (!settings.gatewayEnabled) {
    throw createError({
      statusCode: 400,
      message: "Payment gateway is currently disabled",
    });
  }

  // Check minimum payment amount
  if (amount < settings.gatewayMinPaymentAmount) {
    throw createError({
      statusCode: 400,
      message: `Minimum payment amount is $${settings.gatewayMinPaymentAmount} USD`,
    });
  }

  // Check maximum payment amount
  if (amount > settings.gatewayMaxPaymentAmount) {
    throw createError({
      statusCode: 400,
      message: `Maximum payment amount is $${settings.gatewayMaxPaymentAmount} USD`,
    });
  }

  // Check if wallet type is allowed
  const allowedWalletTypes = settings.gatewayAllowedWalletTypes || {};
  const walletConfig = allowedWalletTypes[walletType];

  if (!walletConfig || !walletConfig.enabled) {
    throw createError({
      statusCode: 400,
      message: `Wallet type ${walletType} is not enabled for payments`,
    });
  }

  // Check if currency is allowed for this wallet type
  if (!walletConfig.currencies || !walletConfig.currencies.includes(currency)) {
    throw createError({
      statusCode: 400,
      message: `Currency ${currency} is not enabled for ${walletType} wallet payments`,
    });
  }
}
