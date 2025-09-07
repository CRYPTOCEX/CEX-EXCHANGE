import { createError } from '@b/utils/error'
import crypto from 'crypto'

// Paystack API Configuration
export const PAYSTACK_CONFIG = {
  API_BASE_URL: process.env.APP_PAYSTACK_SANDBOX === 'true' 
    ? 'https://api.paystack.co' 
    : 'https://api.paystack.co',
  SECRET_KEY: process.env.APP_PAYSTACK_SECRET_KEY || '',
  PUBLIC_KEY: process.env.APP_PAYSTACK_PUBLIC_KEY || '',
  SANDBOX: process.env.APP_PAYSTACK_SANDBOX === 'true',
  WEBHOOK_ENDPOINT: process.env.APP_PAYSTACK_WEBHOOK_ENDPOINT || '/api/finance/deposit/fiat/paystack/webhook',
  RETURN_URL: process.env.APP_PAYSTACK_RETURN_URL || '/user/wallet/deposit/paystack/verify',
  TIMEOUT: 30000, // 30 seconds
  VERSION: 'v1',
}

// Paystack supported currencies with their regions and payment methods
export const PAYSTACK_CURRENCY_REGIONS: Record<string, {
  region: string
  country: string
  methods: string[]
  fees: {
    local: { percentage: number, fixed: number, cap?: number }
    international: { percentage: number, fixed: number }
    usd?: { percentage: number, fixed: number }
  }
}> = {
  'NGN': {
    region: 'Nigeria',
    country: 'NG',
    methods: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
    fees: {
      local: { percentage: 1.5, fixed: 100, cap: 2000 }, // 1.5% + NGN 100, capped at NGN 2000
      international: { percentage: 3.9, fixed: 100 },
      usd: { percentage: 3.9, fixed: 0 },
    },
  },
  'GHS': {
    region: 'Ghana',
    country: 'GH',
    methods: ['card', 'mobile_money'],
    fees: {
      local: { percentage: 1.95, fixed: 0 },
      international: { percentage: 1.95, fixed: 0 },
    },
  },
  'ZAR': {
    region: 'South Africa',
    country: 'ZA',
    methods: ['card', 'eft'],
    fees: {
      local: { percentage: 2.9, fixed: 100 }, // 2.9% + R1.00 (VAT exclusive)
      international: { percentage: 3.1, fixed: 100 },
    },
  },
  'KES': {
    region: 'Kenya',
    country: 'KE',
    methods: ['card', 'mpesa'],
    fees: {
      local: { percentage: 2.9, fixed: 0 }, // Cards: 2.9%, M-PESA: 1.5%
      international: { percentage: 3.8, fixed: 0 },
      usd: { percentage: 3.8, fixed: 0 },
    },
  },
  'XOF': {
    region: 'Côte d\'Ivoire',
    country: 'CI',
    methods: ['card', 'mobile_money'],
    fees: {
      local: { percentage: 3.2, fixed: 0 }, // Cards: 3.2%, Mobile Money: 1.95% (VAT excl)
      international: { percentage: 3.8, fixed: 0 },
    },
  },
  'EGP': {
    region: 'Egypt',
    country: 'EG',
    methods: ['card'],
    fees: {
      local: { percentage: 2.7, fixed: 250 }, // 2.7% + EGP 2.5 (Visa/Mastercard), 2.0% + EGP 2.5 (Meeza)
      international: { percentage: 3.5, fixed: 250 },
    },
  },
  'USD': {
    region: 'International',
    country: 'US',
    methods: ['card'],
    fees: {
      local: { percentage: 3.9, fixed: 0 }, // Only available in Nigeria and Kenya
      international: { percentage: 3.9, fixed: 0 },
    },
  },
}

// Paystack currency decimal places
export const PAYSTACK_CURRENCY_DECIMALS: Record<string, number> = {
  'NGN': 2, // Nigerian Naira (kobo)
  'GHS': 2, // Ghanaian Cedi (pesewas)
  'ZAR': 2, // South African Rand (cents)
  'KES': 2, // Kenyan Shilling (cents)
  'XOF': 0, // West African CFA franc (no subdivision)
  'EGP': 2, // Egyptian Pound (piastres)
  'USD': 2, // US Dollar (cents)
}

// Paystack payment status mapping
export const PAYSTACK_STATUS_MAPPING: Record<string, string> = {
  'success': 'COMPLETED',
  'failed': 'FAILED',
  'abandoned': 'CANCELLED',
  'pending': 'PENDING',
  'processing': 'PENDING',
  'reversed': 'REFUNDED',
  'ongoing': 'PENDING',
}

// Paystack webhook events
export const PAYSTACK_WEBHOOK_EVENTS = {
  CHARGE_SUCCESS: 'charge.success',
  CHARGE_DISPUTE_CREATE: 'charge.dispute.create',
  CHARGE_DISPUTE_REMIND: 'charge.dispute.remind',
  CHARGE_DISPUTE_RESOLVE: 'charge.dispute.resolve',
  INVOICE_CREATE: 'invoice.create',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  INVOICE_UPDATE: 'invoice.update',
  SUBSCRIPTION_CREATE: 'subscription.create',
  SUBSCRIPTION_DISABLE: 'subscription.disable',
  SUBSCRIPTION_EXPIRING_CARDS: 'subscription.expiring_cards',
  SUBSCRIPTION_NOT_RENEW: 'subscription.not_renew',
  TRANSFER_SUCCESS: 'transfer.success',
  TRANSFER_FAILED: 'transfer.failed',
  TRANSFER_REVERSED: 'transfer.reversed',
} as const

// TypeScript interfaces for Paystack API
export interface PaystackAmount {
  amount: number // Amount in kobo/cents
  currency: string
}

export interface PaystackCustomer {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  metadata?: Record<string, any>
}

export interface PaystackTransactionRequest {
  reference: string
  amount: number // Amount in kobo/cents
  email: string
  currency?: string
  callback_url?: string
  plan?: string
  invoice_limit?: number
  metadata?: Record<string, any>
  channels?: string[]
  split_code?: string
  subaccount?: string
  transaction_charge?: number
  bearer?: 'account' | 'subaccount'
  customer?: PaystackCustomer
}

export interface PaystackTransaction {
  id: number
  domain: string
  status: string
  reference: string
  amount: number
  message: string | null
  gateway_response: string
  paid_at: string | null
  created_at: string
  channel: string
  currency: string
  ip_address: string
  metadata: Record<string, any>
  fees: number
  fees_split: any
  customer: {
    id: number
    first_name: string | null
    last_name: string | null
    email: string
    customer_code: string
    phone: string | null
    metadata: Record<string, any>
    risk_action: string
    international_format_phone: string | null
  }
  authorization: {
    authorization_code: string
    bin: string
    last4: string
    exp_month: string
    exp_year: string
    channel: string
    card_type: string
    bank: string
    country_code: string
    brand: string
    reusable: boolean
    signature: string
    account_name: string | null
  }
  plan: any
  split: any
  order_id: any
  paidAt: string | null
  createdAt: string
  requested_amount: number
  pos_transaction_data: any
  source: any
  fees_breakdown: any
  transaction_date: string
  plan_object: any
  subaccount: any
}

export interface PaystackInitializeResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export interface PaystackVerifyResponse {
  status: boolean
  message: string
  data: PaystackTransaction
}

export interface PaystackWebhookData {
  event: string
  data: PaystackTransaction
}

export interface PaystackErrorResponse {
  status: boolean
  message: string
  errors?: Record<string, string[]>
}

export interface PaystackApiResponse<T> {
  status: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}

export class PaystackError extends Error {
  public code: string
  public status: number
  public details?: any

  constructor(message: string, code: string = 'PAYSTACK_ERROR', status: number = 500, details?: any) {
    super(message)
    this.name = 'PaystackError'
    this.code = code
    this.status = status
    this.details = details
  }
}

// Utility functions
export function validatePaystackConfig(): void {
  if (!PAYSTACK_CONFIG.SECRET_KEY) {
    throw new PaystackError('Paystack secret key is not configured', 'CONFIG_ERROR', 500)
  }
  if (!PAYSTACK_CONFIG.PUBLIC_KEY) {
    throw new PaystackError('Paystack public key is not configured', 'CONFIG_ERROR', 500)
  }
}

export function isCurrencySupported(currency: string): boolean {
  return Object.keys(PAYSTACK_CURRENCY_REGIONS).includes(currency.toUpperCase())
}

export function getCurrencyInfo(currency: string) {
  const currencyCode = currency.toUpperCase()
  return PAYSTACK_CURRENCY_REGIONS[currencyCode] || null
}

export function getAvailablePaymentMethods(currency: string): string[] {
  const currencyInfo = getCurrencyInfo(currency)
  return currencyInfo?.methods || []
}

export function formatPaystackAmount(amount: number, currency: string): number {
  const decimals = PAYSTACK_CURRENCY_DECIMALS[currency.toUpperCase()] || 2
  return Math.round(amount * Math.pow(10, decimals))
}

export function parsePaystackAmount(amount: number, currency: string): number {
  const decimals = PAYSTACK_CURRENCY_DECIMALS[currency.toUpperCase()] || 2
  return amount / Math.pow(10, decimals)
}

export function mapPaystackStatus(paystackStatus: string): string {
  return PAYSTACK_STATUS_MAPPING[paystackStatus.toLowerCase()] || 'PENDING'
}

export function generatePaystackReference(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `PS_${timestamp}_${random}`.toUpperCase()
}

export async function makePaystackRequest<T>(
  endpoint: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
  } = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options

  try {
    validatePaystackConfig()

    const url = `${PAYSTACK_CONFIG.API_BASE_URL}${endpoint}`
    const requestHeaders = {
      'Authorization': `Bearer ${PAYSTACK_CONFIG.SECRET_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Paystack-Integration/1.0',
      ...headers,
    }

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(PAYSTACK_CONFIG.TIMEOUT),
    }

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(body)
    }

    const response = await fetch(url, requestOptions)
    const responseData = await response.json()

    if (!response.ok) {
      const errorMessage = responseData.message || `HTTP ${response.status}: ${response.statusText}`
      throw new PaystackError(
        errorMessage,
        'API_ERROR',
        response.status,
        responseData
      )
    }

    return responseData as T
  } catch (error) {
    if (error instanceof PaystackError) {
      throw error
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new PaystackError('Request timeout', 'TIMEOUT_ERROR', 408)
      }
      throw new PaystackError(error.message, 'NETWORK_ERROR', 500)
    }

    throw new PaystackError('Unknown error occurred', 'UNKNOWN_ERROR', 500)
  }
}

export function buildWebhookUrl(): string {
  const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000'
  return `${baseUrl}${PAYSTACK_CONFIG.WEBHOOK_ENDPOINT}`
}

export function buildReturnUrl(): string {
  const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000'
  return `${baseUrl}${PAYSTACK_CONFIG.RETURN_URL}`
}

export function buildCancelUrl(): string {
  const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000'
  return `${baseUrl}/user/wallet/deposit/paystack/cancel`
}

export function isTestMode(): boolean {
  return PAYSTACK_CONFIG.SANDBOX
}

export function getPaymentMethodDisplayName(method: string): string {
  const methodNames: Record<string, string> = {
    'card': 'Credit/Debit Card',
    'bank': 'Bank Transfer',
    'ussd': 'USSD',
    'qr': 'QR Code',
    'mobile_money': 'Mobile Money',
    'bank_transfer': 'Direct Bank Transfer',
    'mpesa': 'M-PESA',
    'eft': 'Electronic Funds Transfer',
  }
  return methodNames[method] || method.toUpperCase()
}

export function validateWebhookSignature(body: string, signature: string): boolean {
  try {
    const hash = crypto
      .createHmac('sha512', PAYSTACK_CONFIG.SECRET_KEY)
      .update(body)
      .digest('hex')
    
    return hash === signature
  } catch (error) {
    return false
  }
}

export function calculatePaystackFees(amount: number, currency: string): {
  fees: number
  netAmount: number
  grossAmount: number
} {
  const currencyInfo = getCurrencyInfo(currency)
  if (!currencyInfo) {
    return { fees: 0, netAmount: amount, grossAmount: amount }
  }

  const { percentage, fixed, cap } = currencyInfo.fees.local
  let fees = (amount * percentage / 100) + fixed

  // Apply cap if exists (mainly for NGN)
  if (cap && fees > cap) {
    fees = cap
  }

  // For NGN, waive fixed fee for transactions under NGN 2,500
  if (currency === 'NGN' && amount < 2500) {
    fees = amount * percentage / 100
  }

  return {
    fees: Math.round(fees * 100) / 100,
    netAmount: Math.round((amount - fees) * 100) / 100,
    grossAmount: amount,
  }
}

export function getRegionFromCurrency(currency: string): string {
  const currencyInfo = getCurrencyInfo(currency)
  return currencyInfo?.region || 'Unknown'
}

export function getCountryFromCurrency(currency: string): string {
  const currencyInfo = getCurrencyInfo(currency)
  return currencyInfo?.country || 'XX'
}

export function getSupportedChannels(currency: string): string[] {
  const methods = getAvailablePaymentMethods(currency)
  const channelMapping: Record<string, string> = {
    'card': 'card',
    'bank': 'bank',
    'ussd': 'ussd',
    'qr': 'qr',
    'mobile_money': 'mobile_money',
    'bank_transfer': 'bank_transfer',
    'mpesa': 'mobile_money',
    'eft': 'bank',
  }
  
  return methods.map(method => channelMapping[method] || method).filter(Boolean)
}

// Export webhook event types
export type PaystackWebhookEvent = typeof PAYSTACK_WEBHOOK_EVENTS[keyof typeof PAYSTACK_WEBHOOK_EVENTS] 