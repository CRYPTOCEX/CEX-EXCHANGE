import { createError } from '@b/utils/error'

// Mollie API Configuration
export const MOLLIE_CONFIG = {
  API_BASE_URL: 'https://api.mollie.com/v2',
  API_KEY: process.env.APP_MOLLIE_API_KEY || '',
  WEBHOOK_ENDPOINT: process.env.APP_MOLLIE_WEBHOOK_ENDPOINT || '/api/finance/deposit/fiat/mollie/webhook',
  RETURN_URL: process.env.APP_MOLLIE_RETURN_URL || '/user/wallet/deposit/mollie/verify',
  TIMEOUT: 30000, // 30 seconds
}

// Mollie supported currencies with method availability
export const MOLLIE_CURRENCY_METHODS: Record<string, string[]> = {
  'EUR': ['creditcard', 'ideal', 'bancontact', 'sofort', 'paypal', 'applepay', 'googlepay', 'sepadirectdebit', 'banktransfer', 'klarna', 'przelewy24', 'eps', 'giropay', 'kbc', 'belfius'],
  'USD': ['creditcard', 'paypal', 'applepay', 'googlepay'],
  'GBP': ['creditcard', 'paypal', 'applepay', 'googlepay'],
  'CHF': ['creditcard', 'paypal', 'applepay', 'googlepay'],
  'SEK': ['creditcard', 'paypal', 'klarna', 'applepay', 'googlepay'],
  'NOK': ['creditcard', 'paypal', 'klarna', 'applepay', 'googlepay'],
  'DKK': ['creditcard', 'paypal', 'klarna', 'applepay', 'googlepay'],
  'PLN': ['creditcard', 'paypal', 'przelewy24', 'applepay', 'googlepay'],
  'CZK': ['creditcard', 'paypal', 'applepay', 'googlepay'],
  'AUD': ['creditcard', 'paypal', 'applepay', 'googlepay'],
  'CAD': ['creditcard', 'paypal', 'applepay', 'googlepay'],
  'JPY': ['creditcard', 'paypal', 'applepay', 'googlepay'],
  'HKD': ['creditcard', 'paypal', 'applepay', 'googlepay'],
  'SGD': ['creditcard', 'paypal', 'applepay', 'googlepay'],
  'NZD': ['creditcard', 'paypal', 'applepay', 'googlepay'],
  'ZAR': ['creditcard', 'applepay', 'googlepay'],
  'BGN': ['creditcard', 'applepay', 'googlepay'],
  'RON': ['creditcard', 'applepay', 'googlepay'],
  'HUF': ['creditcard', 'paypal', 'applepay', 'googlepay'],
  'ISK': ['creditcard', 'applepay', 'googlepay'],
  'ILS': ['creditcard', 'paypal', 'applepay', 'googlepay'],
  'MYR': ['paypal'],
  'PHP': ['creditcard', 'paypal', 'applepay', 'googlepay'],
  'THB': ['paypal'],
  'TWD': ['paypal'],
}

// Mollie currency decimal places
export const MOLLIE_CURRENCY_DECIMALS: Record<string, number> = {
  'EUR': 2, 'USD': 2, 'GBP': 2, 'CHF': 2, 'SEK': 2, 'NOK': 2, 'DKK': 2,
  'PLN': 2, 'CZK': 2, 'AUD': 2, 'CAD': 2, 'HKD': 2, 'SGD': 2, 'NZD': 2,
  'ZAR': 2, 'BGN': 2, 'RON': 2, 'HUF': 2, 'ILS': 2, 'MYR': 2, 'PHP': 2,
  'THB': 2, 'TWD': 2, 'JPY': 0, 'ISK': 0
}

// Mollie locale mapping
export const MOLLIE_LOCALE_MAP: Record<string, string> = {
  'en': 'en_US',
  'nl': 'nl_NL',
  'de': 'de_DE',
  'fr': 'fr_FR',
  'es': 'es_ES',
  'it': 'it_IT',
  'pt': 'pt_PT',
  'pl': 'pl_PL',
  'cs': 'cs_CZ',
  'da': 'da_DK',
  'sv': 'sv_SE',
  'no': 'nb_NO',
  'fi': 'fi_FI',
  'hu': 'hu_HU',
  'bg': 'bg_BG',
  'ro': 'ro_RO',
  'sk': 'sk_SK',
  'sl': 'sl_SI',
  'hr': 'hr_HR',
  'et': 'et_EE',
  'lv': 'lv_LV',
  'lt': 'lt_LT',
  'mt': 'mt_MT',
}

// Mollie payment status mapping
export const MOLLIE_STATUS_MAPPING: Record<string, string> = {
  'open': 'PENDING',
  'pending': 'PENDING',
  'authorized': 'PENDING',
  'paid': 'COMPLETED',
  'canceled': 'CANCELLED',
  'expired': 'EXPIRED',
  'failed': 'FAILED',
  'refunded': 'REFUNDED',
  'charged_back': 'CHARGEBACK',
}

// TypeScript interfaces for Mollie API
export interface MollieAmount {
  currency: string
  value: string
}

export interface MolliePaymentMethod {
  resource: string
  id: string
  description: string
  minimumAmount?: MollieAmount
  maximumAmount?: MollieAmount
  image: {
    size1x: string
    size2x: string
    svg?: string
  }
  status?: string
}

export interface MolliePaymentRequest {
  amount: MollieAmount
  description: string
  redirectUrl: string
  webhookUrl?: string
  metadata?: Record<string, any>
  method?: string
  locale?: string
  restrictPaymentMethodsToCountry?: string
  billingAddress?: {
    streetAndNumber?: string
    postalCode?: string
    city?: string
    region?: string
    country?: string
  }
  shippingAddress?: {
    streetAndNumber?: string
    postalCode?: string
    city?: string
    region?: string
    country?: string
  }
  consumerName?: string
  consumerAccount?: string
  consumerDateOfBirth?: string
  includeQrCode?: boolean
  testmode?: boolean
}

export interface MolliePayment {
  resource: string
  id: string
  mode: 'live' | 'test'
  createdAt: string
  amount: MollieAmount
  description: string
  method?: string
  metadata?: Record<string, any>
  status: string
  isCancelable: boolean
  expiresAt?: string
  details?: Record<string, any>
  profileId: string
  sequenceType?: string
  redirectUrl: string
  webhookUrl?: string
  settlementAmount?: MollieAmount
  settlementId?: string
  mandateId?: string
  subscriptionId?: string
  orderId?: string
  applicationFee?: MollieAmount
  countryCode?: string
  _links: {
    self: { href: string; type: string }
    checkout?: { href: string; type: string }
    refunds?: { href: string; type: string }
    chargebacks?: { href: string; type: string }
    captures?: { href: string; type: string }
    settlement?: { href: string; type: string }
    documentation: { href: string; type: string }
    mandate?: { href: string; type: string }
    subscription?: { href: string; type: string }
    customer?: { href: string; type: string }
    order?: { href: string; type: string }
    dashboard?: { href: string; type: string }
  }
}

export interface MollieRefund {
  resource: string
  id: string
  amount: MollieAmount
  status: string
  createdAt: string
  description: string
  metadata?: Record<string, any>
  paymentId: string
  settlementId?: string
  settlementAmount?: MollieAmount
  _links: {
    self: { href: string; type: string }
    payment: { href: string; type: string }
    settlement?: { href: string; type: string }
    documentation: { href: string; type: string }
  }
}

export interface MollieErrorResponse {
  status: number
  title: string
  detail: string
  type?: string
  field?: string
  _links?: {
    documentation: { href: string; type: string }
  }
}

export interface MollieApiResponse<T> {
  data?: T
  error?: MollieErrorResponse
}

// Custom error class for Mollie-specific errors
export class MollieError extends Error {
  public status: number
  public type?: string
  public field?: string

  constructor(message: string, status: number = 500, type?: string, field?: string) {
    super(message)
    this.name = 'MollieError'
    this.status = status
    this.type = type
    this.field = field
  }
}

// Utility functions
export function validateMollieConfig(): void {
  if (!MOLLIE_CONFIG.API_KEY) {
    throw createError({
      statusCode: 500,
      message: 'Mollie API key is not configured',
    })
  }
}

export function isCurrencySupported(currency: string): boolean {
  return Object.keys(MOLLIE_CURRENCY_METHODS).includes(currency.toUpperCase())
}

export function getAvailablePaymentMethods(currency: string): string[] {
  const upperCurrency = currency.toUpperCase()
  return MOLLIE_CURRENCY_METHODS[upperCurrency] || []
}

export function formatMollieAmount(amount: number, currency: string): string {
  const decimals = MOLLIE_CURRENCY_DECIMALS[currency.toUpperCase()] || 2
  return (amount / Math.pow(10, decimals)).toFixed(decimals)
}

export function parseMollieAmount(amountString: string, currency: string): number {
  const decimals = MOLLIE_CURRENCY_DECIMALS[currency.toUpperCase()] || 2
  return Math.round(parseFloat(amountString) * Math.pow(10, decimals))
}

export function getMollieLocale(locale: string): string {
  const baseLocale = locale.split('-')[0].toLowerCase()
  return MOLLIE_LOCALE_MAP[baseLocale] || 'en_US'
}

export function mapMollieStatus(mollieStatus: string): string {
  return MOLLIE_STATUS_MAPPING[mollieStatus] || 'PENDING'
}

export function generateMollieReference(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `MOLLIE_${timestamp}_${random}`.toUpperCase()
}

export async function makeApiRequest<T>(
  endpoint: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
  } = {}
): Promise<T> {
  validateMollieConfig()

  const url = `${MOLLIE_CONFIG.API_BASE_URL}${endpoint}`
  const { method = 'GET', body, headers = {} } = options

  const requestHeaders = {
    'Authorization': `Bearer ${MOLLIE_CONFIG.API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'v5-platform/1.0.0',
    ...headers,
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(MOLLIE_CONFIG.TIMEOUT),
    })

    const responseData = await response.json()

    if (!response.ok) {
      const error = responseData as MollieErrorResponse
      throw new MollieError(
        error.detail || error.title || 'Mollie API request failed',
        error.status || response.status,
        error.type,
        error.field
      )
    }

    return responseData as T
  } catch (error) {
    if (error instanceof MollieError) {
      throw error
    }

    if (error.name === 'TimeoutError') {
      throw new MollieError('Mollie API request timed out', 408)
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new MollieError('Network error connecting to Mollie API', 503)
    }

    throw new MollieError(
      error.message || 'Unknown error occurred with Mollie API',
      500
    )
  }
}

export function buildWebhookUrl(): string {
  const baseUrl = process.env.APP_PUBLIC_URL || 'https://localhost:3000'
  return `${baseUrl}${MOLLIE_CONFIG.WEBHOOK_ENDPOINT}`
}

export function buildReturnUrl(): string {
  const baseUrl = process.env.APP_PUBLIC_URL || 'https://localhost:3000'
  return `${baseUrl}${MOLLIE_CONFIG.RETURN_URL}`
}

export function isTestMode(): boolean {
  return MOLLIE_CONFIG.API_KEY.startsWith('test_')
}

export function validateWebhookSignature(body: string, signature: string): boolean {
  // Mollie doesn't use webhook signatures, they rely on fetching payment details
  // by ID for security. Always return true and validate by fetching payment.
  return true
}

export function getPaymentMethodDisplayName(method: string): string {
  const methodNames: Record<string, string> = {
    'creditcard': 'Credit Card',
    'ideal': 'iDEAL',
    'bancontact': 'Bancontact',
    'sofort': 'SOFORT Banking',
    'paypal': 'PayPal',
    'applepay': 'Apple Pay',
    'googlepay': 'Google Pay',
    'sepadirectdebit': 'SEPA Direct Debit',
    'banktransfer': 'Bank Transfer',
    'klarna': 'Klarna',
    'przelewy24': 'Przelewy24',
    'eps': 'EPS',
    'giropay': 'Giropay',
    'kbc': 'KBC Payment Button',
    'belfius': 'Belfius Pay Button',
  }
  return methodNames[method] || method
} 