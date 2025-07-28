import { createError } from '@b/utils/error'
import crypto from 'crypto'

// Paysafe API Configuration
export const PAYSAFE_CONFIG = {
  API_BASE_URL: process.env.APP_PAYSAFE_SANDBOX === 'true' 
    ? 'https://api.test.paysafe.com' 
    : 'https://api.paysafe.com',
  API_KEY: process.env.APP_PAYSAFE_API_KEY || '',
  API_SECRET: process.env.APP_PAYSAFE_API_SECRET || '',
  ACCOUNT_ID: process.env.APP_PAYSAFE_ACCOUNT_ID || '',
  SANDBOX: process.env.APP_PAYSAFE_SANDBOX === 'true',
  WEBHOOK_ENDPOINT: process.env.APP_PAYSAFE_WEBHOOK_ENDPOINT || '/api/finance/deposit/fiat/paysafe/webhook',
  RETURN_URL: process.env.APP_PAYSAFE_RETURN_URL || '/user/wallet/deposit/paysafe/verify',
  TIMEOUT: 30000, // 30 seconds
  VERSION: 'v1',
}

// Paysafe supported currencies with payment method availability
export const PAYSAFE_CURRENCY_METHODS: Record<string, string[]> = {
  // Major currencies with full payment method support
  'USD': ['creditcard', 'paypal', 'venmo', 'applepay', 'googlepay', 'ach', 'paybybank', 'vippreferred', 'playsightline'],
  'EUR': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'sepadirectdebit', 'banktransfer', 'paysafecard', 'paysafecash'],
  'GBP': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'banktransfer', 'paysafecard', 'paysafecash'],
  'CAD': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'eft', 'banktransfer', 'paysafecard'],
  
  // European currencies
  'CHF': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
  'SEK': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
  'NOK': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
  'DKK': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
  'PLN': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
  'CZK': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
  'HUF': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
  'BGN': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
  'RON': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
  'HRK': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay'],
  'ISK': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay'],
  
  // Asia-Pacific currencies
  'AUD': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
  'NZD': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
  'JPY': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
  'CNY': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay'],
  'HKD': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
  'SGD': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
  'MYR': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
  'THB': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
  'PHP': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
  'IDR': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay'],
  'VND': ['creditcard', 'skrill', 'neteller'],
  'KRW': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay'],
  'TWD': ['creditcard', 'paypal', 'skrill', 'neteller'],
  'INR': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
  
  // Middle East & Africa
  'ILS': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
  'TRY': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay'],
  'ZAR': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay'],
  
  // Latin America
  'BRL': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'pix', 'boleto'],
  'MXN': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
  'CLP': ['creditcard', 'skrill', 'neteller'],
  'COP': ['creditcard', 'skrill', 'neteller'],
  'PEN': ['creditcard', 'skrill', 'neteller', 'pagoefectivo'],
  'ARS': ['creditcard', 'skrill', 'neteller'],
  'UYU': ['creditcard', 'skrill', 'neteller'],
  'BOB': ['creditcard', 'skrill', 'neteller'],
  'PYG': ['creditcard', 'skrill', 'neteller'],
  
  // Pacific currencies
  'FJD': ['creditcard'],
  'WST': ['creditcard'],
  'TOP': ['creditcard'],
  'VUV': ['creditcard'],
  'SBD': ['creditcard'],
  'PGK': ['creditcard'],
}

// Paysafe currency decimal places
export const PAYSAFE_CURRENCY_DECIMALS: Record<string, number> = {
  'USD': 2, 'EUR': 2, 'GBP': 2, 'CAD': 2, 'AUD': 2, 'CHF': 2, 'SEK': 2, 'NOK': 2, 'DKK': 2,
  'PLN': 2, 'CZK': 2, 'HUF': 2, 'BGN': 2, 'RON': 2, 'HRK': 2, 'ISK': 2, 'NZD': 2,
  'HKD': 2, 'SGD': 2, 'MYR': 2, 'THB': 2, 'PHP': 2, 'TWD': 2, 'INR': 2, 'ILS': 2, 'TRY': 2,
  'ZAR': 2, 'BRL': 2, 'MXN': 2, 'CLP': 2, 'COP': 2, 'PEN': 2, 'ARS': 2, 'UYU': 2, 'BOB': 2,
  'PYG': 0, 'FJD': 2, 'WST': 2, 'TOP': 2, 'VUV': 0, 'SBD': 2, 'PGK': 2,
  'JPY': 0, 'KRW': 0, 'IDR': 0, 'VND': 0, 'CNY': 2
}

// Paysafe payment status mapping
export const PAYSAFE_STATUS_MAPPING: Record<string, string> = {
  'INITIATED': 'PENDING',
  'PENDING': 'PENDING',
  'PROCESSING': 'PENDING',
  'PAYABLE': 'PENDING',
  'COMPLETED': 'COMPLETED',
  'FAILED': 'FAILED',
  'CANCELLED': 'CANCELLED',
  'EXPIRED': 'EXPIRED',
  'REFUNDED': 'REFUNDED',
  'CHARGED_BACK': 'CHARGEBACK',
  'DECLINED': 'FAILED',
  'ERROR': 'FAILED',
}

// TypeScript interfaces for Paysafe API
export interface PaysafeAmount {
  value: number
  currency: string
}

export interface PaysafeBillingDetails {
  street?: string
  street2?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  phone?: string
}

export interface PaysafeCustomer {
  merchantCustomerId?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  ip?: string
  dateOfBirth?: {
    day?: number
    month?: number
    year?: number
  }
}

export interface PaysafePaymentHandleRequest {
  merchantRefNum: string
  transactionType: 'PAYMENT' | 'STANDALONE_CREDIT'
  amount: number
  currencyCode: string
  paymentType: string
  customerIp?: string
  billingDetails?: PaysafeBillingDetails
  customer?: PaysafeCustomer
  merchantDescriptor?: {
    dynamicDescriptor?: string
    phone?: string
  }
  returnLinks?: Array<{
    rel: string
    href: string
    method?: string
  }>
  webhookUrl?: string
  profile?: {
    firstName?: string
    lastName?: string
    email?: string
    dateOfBirth?: {
      day: number
      month: number
      year: number
    }
  }
}

export interface PaysafePaymentHandle {
  id: string
  paymentType: string
  paymentHandleToken: string
  merchantRefNum: string
  currencyCode: string
  amount: number
  status: string
  action: string
  executionMode: string
  usage: string
  timeToLiveSeconds: number
  links?: Array<{
    rel: string
    href: string
    method?: string
  }>
  gatewayResponse?: {
    processor: string
    id: string
    associationId?: string
  }
  billingDetails?: PaysafeBillingDetails
  customerIp?: string
  txnTime?: string
  updatedTime?: string
  statusTime?: string
}

export interface PaysafePaymentRequest {
  merchantRefNum: string
  amount: number
  currencyCode: string
  paymentHandleToken: string
  dupCheck?: boolean
  settleWithAuth?: boolean
  customerIp?: string
  description?: string
}

export interface PaysafePayment {
  id: string
  paymentType: string
  paymentHandleToken: string
  merchantRefNum: string
  currencyCode: string
  amount: number
  status: string
  gatewayReconciliationId?: string
  availableToRefund?: number
  availableToSettle?: number
  billingDetails?: PaysafeBillingDetails
  customerIp?: string
  txnTime?: string
  updatedTime?: string
  statusTime?: string
  gatewayResponse?: {
    processor: string
    id: string
    associationId?: string
  }
  settlements?: Array<{
    id: string
    amount: number
    status: string
    txnTime: string
    availableToRefund: number
    merchantRefNum: string
  }>
}

export interface PaysafeWebhookData {
  eventType: string
  eventId: string
  eventTime: string
  object: PaysafePaymentHandle | PaysafePayment
}

export interface PaysafeErrorResponse {
  error: {
    code: string
    message: string
    details?: Array<{
      field?: string
      fieldError?: string
      description?: string
    }>
  }
}

export interface PaysafeApiResponse<T> {
  data?: T
  error?: PaysafeErrorResponse
}

export class PaysafeError extends Error {
  public code: string
  public status: number
  public details?: any

  constructor(message: string, code: string = 'PAYSAFE_ERROR', status: number = 500, details?: any) {
    super(message)
    this.name = 'PaysafeError'
    this.code = code
    this.status = status
    this.details = details
  }
}

// Validation functions
export function validatePaysafeConfig(): void {
  if (!PAYSAFE_CONFIG.API_KEY) {
    throw new Error('Paysafe API key is not configured')
  }
  if (!PAYSAFE_CONFIG.API_SECRET) {
    throw new Error('Paysafe API secret is not configured')
  }
  if (!PAYSAFE_CONFIG.ACCOUNT_ID) {
    throw new Error('Paysafe Account ID is not configured')
  }
}

export function isCurrencySupported(currency: string): boolean {
  return Object.keys(PAYSAFE_CURRENCY_METHODS).includes(currency.toUpperCase())
}

export function getAvailablePaymentMethods(currency: string): string[] {
  return PAYSAFE_CURRENCY_METHODS[currency.toUpperCase()] || ['creditcard']
}

export function formatPaysafeAmount(amount: number, currency: string): number {
  const decimals = PAYSAFE_CURRENCY_DECIMALS[currency.toUpperCase()] || 2
  return Math.round(amount * Math.pow(10, decimals))
}

export function parsePaysafeAmount(amount: number, currency: string): number {
  const decimals = PAYSAFE_CURRENCY_DECIMALS[currency.toUpperCase()] || 2
  return amount / Math.pow(10, decimals)
}

export function mapPaysafeStatus(paysafeStatus: string): string {
  return PAYSAFE_STATUS_MAPPING[paysafeStatus.toUpperCase()] || 'PENDING'
}

export function generatePaysafeReference(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 8)
  return `PAYSAFE_${timestamp}_${random}`.toUpperCase()
}

// API request function
export async function makeApiRequest<T>(
  endpoint: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
  } = {}
): Promise<T> {
  validatePaysafeConfig()

  const { method = 'GET', body, headers = {} } = options
  
  const url = `${PAYSAFE_CONFIG.API_BASE_URL}/paymenthub/${PAYSAFE_CONFIG.VERSION}/${endpoint}`
  
  // Create basic auth header
  const auth = Buffer.from(`${PAYSAFE_CONFIG.API_KEY}:${PAYSAFE_CONFIG.API_SECRET}`).toString('base64')
  
  const requestHeaders: Record<string, string> = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...headers,
  }

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(PAYSAFE_CONFIG.TIMEOUT),
  }

  try {
    const response = await fetch(url, requestOptions)
    const responseData = await response.json()

    if (!response.ok) {
      const errorMessage = responseData?.error?.message || `HTTP ${response.status}: ${response.statusText}`
      const errorCode = responseData?.error?.code || 'API_ERROR'
      throw new PaysafeError(errorMessage, errorCode, response.status, responseData?.error?.details)
    }

    return responseData as T
  } catch (error) {
    if (error instanceof PaysafeError) {
      throw error
    }
    
    if (error.name === 'AbortError') {
      throw new PaysafeError('Request timeout', 'TIMEOUT_ERROR', 408)
    }
    
    throw new PaysafeError(
      error.message || 'Unknown error occurred',
      'NETWORK_ERROR',
      500
    )
  }
}

// URL builders
export function buildWebhookUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${baseUrl}${PAYSAFE_CONFIG.WEBHOOK_ENDPOINT}`
}

export function buildReturnUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${baseUrl}${PAYSAFE_CONFIG.RETURN_URL}`
}

export function buildCancelUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${baseUrl}/user/wallet/deposit/paysafe/cancel`
}

// Test mode check
export function isTestMode(): boolean {
  return PAYSAFE_CONFIG.SANDBOX
}

// Payment method display names
export function getPaymentMethodDisplayName(method: string): string {
  const displayNames: Record<string, string> = {
    'creditcard': 'Credit/Debit Cards',
    'paypal': 'PayPal',
    'venmo': 'Venmo',
    'skrill': 'Skrill',
    'neteller': 'NETELLER',
    'applepay': 'Apple Pay',
    'googlepay': 'Google Pay',
    'ach': 'ACH Bank Transfer',
    'eft': 'EFT Bank Transfer',
    'paybybank': 'Pay by Bank',
    'sepadirectdebit': 'SEPA Direct Debit',
    'banktransfer': 'Bank Transfer',
    'paysafecard': 'paysafecard',
    'paysafecash': 'paysafecash',
    'vippreferred': 'VIP Preferred',
    'playsightline': 'Play+ by Sightline',
    'pix': 'PIX',
    'boleto': 'Boleto Bancario',
    'pagoefectivo': 'PagoEfectivo',
  }
  return displayNames[method] || method.charAt(0).toUpperCase() + method.slice(1)
}

// Webhook signature validation
export function validateWebhookSignature(body: string, signature: string): boolean {
  if (!signature || !PAYSAFE_CONFIG.API_SECRET) {
    return false
  }
  
  try {
    const expectedSignature = crypto
      .createHmac('sha256', PAYSAFE_CONFIG.API_SECRET)
      .update(body)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    return false
  }
}

// Region detection for payment methods
export function getRegionFromCurrency(currency: string): string {
  const regionMap: Record<string, string> = {
    'USD': 'US',
    'CAD': 'CA',
    'EUR': 'EU',
    'GBP': 'UK',
    'AUD': 'AU',
    'NZD': 'NZ',
    'JPY': 'JP',
    'CNY': 'CN',
    'HKD': 'HK',
    'SGD': 'SG',
    'MYR': 'MY',
    'THB': 'TH',
    'PHP': 'PH',
    'IDR': 'ID',
    'VND': 'VN',
    'KRW': 'KR',
    'TWD': 'TW',
    'INR': 'IN',
    'BRL': 'BR',
    'MXN': 'MX',
    'ZAR': 'ZA',
  }
  return regionMap[currency.toUpperCase()] || 'GLOBAL'
}

// Payment handle types for different integrations
export const PAYSAFE_PAYMENT_TYPES = {
  CARDS: 'CARD',
  PAYPAL: 'PAYPAL',
  VENMO: 'VENMO',
  SKRILL: 'SKRILL',
  NETELLER: 'NETELLER',
  APPLE_PAY: 'APPLEPAY',
  GOOGLE_PAY: 'GOOGLEPAY',
  ACH: 'ACH',
  EFT: 'EFT',
  PAYSAFECARD: 'PAYSAFECARD',
  PAYSAFECASH: 'PAYSAFECASH',
} as const

export type PaysafePaymentType = typeof PAYSAFE_PAYMENT_TYPES[keyof typeof PAYSAFE_PAYMENT_TYPES] 