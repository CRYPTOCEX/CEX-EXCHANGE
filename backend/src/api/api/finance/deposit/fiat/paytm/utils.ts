import { createError } from '@b/utils/error'
import crypto from 'crypto'

// Paytm API Configuration
export const PAYTM_CONFIG = {
  API_BASE_URL: process.env.APP_PAYTM_SANDBOX === 'true' 
    ? 'https://securegw-stage.paytm.in' 
    : 'https://securegw.paytm.in',
  MID: process.env.APP_PAYTM_MID || '',
  MERCHANT_KEY: process.env.APP_PAYTM_MERCHANT_KEY || '',
  WEBSITE: process.env.APP_PAYTM_WEBSITE || 'WEBSTAGING',
  INDUSTRY_TYPE: process.env.APP_PAYTM_INDUSTRY_TYPE || 'Retail',
  SANDBOX: process.env.APP_PAYTM_SANDBOX === 'true',
  CALLBACK_URL: process.env.APP_PAYTM_CALLBACK_URL || '/user/wallet/deposit/paytm/verify',
  WEBHOOK_ENDPOINT: process.env.APP_PAYTM_WEBHOOK_ENDPOINT || '/api/finance/deposit/fiat/paytm/webhook',
  TIMEOUT: 30000, // 30 seconds
  VERSION: 'v1',
}

// Paytm supported currencies with their regions and payment methods
export const PAYTM_CURRENCY_REGIONS: Record<string, {
  region: string
  country: string
  methods: string[]
  fees: {
    upi: { percentage: number, fixed: number }
    rupay_debit: { percentage: number, fixed: number }
    debit_cards: { percentage: number, fixed: number }
    credit_cards: { percentage: number, fixed: number }
    net_banking: { percentage: number, fixed: number }
    wallet: { percentage: number, fixed: number }
    international: { percentage: number, fixed: number }
  }
}> = {
  'INR': {
    region: 'India',
    country: 'IN',
    methods: ['upi', 'card', 'netbanking', 'wallet', 'emi', 'bank_transfer'],
    fees: {
      upi: { percentage: 0.0, fixed: 0 }, // Free for UPI
      rupay_debit: { percentage: 0.0, fixed: 0 }, // Free for RuPay debit
      debit_cards: { percentage: 0.40, fixed: 0 }, // 0.40% for Visa/Mastercard debit
      credit_cards: { percentage: 1.40, fixed: 0 }, // 1.40-1.99% for credit cards
      net_banking: { percentage: 1.20, fixed: 0 }, // 1.20% for net banking
      wallet: { percentage: 0.0, fixed: 0 }, // Free for Paytm wallet
      international: { percentage: 3.50, fixed: 0 }, // 3.50% for international cards
    },
  },
  'USD': {
    region: 'International',
    country: 'US',
    methods: ['card'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      rupay_debit: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.5, fixed: 0 },
      credit_cards: { percentage: 3.5, fixed: 0 },
      net_banking: { percentage: 0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      international: { percentage: 3.5, fixed: 0 },
    },
  },
  'EUR': {
    region: 'Europe',
    country: 'EU',
    methods: ['card'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      rupay_debit: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.5, fixed: 0 },
      credit_cards: { percentage: 3.5, fixed: 0 },
      net_banking: { percentage: 0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      international: { percentage: 3.5, fixed: 0 },
    },
  },
  'GBP': {
    region: 'United Kingdom',
    country: 'GB',
    methods: ['card'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      rupay_debit: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.5, fixed: 0 },
      credit_cards: { percentage: 3.5, fixed: 0 },
      net_banking: { percentage: 0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      international: { percentage: 3.5, fixed: 0 },
    },
  },
  'AUD': {
    region: 'Australia',
    country: 'AU',
    methods: ['card'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      rupay_debit: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.5, fixed: 0 },
      credit_cards: { percentage: 3.5, fixed: 0 },
      net_banking: { percentage: 0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      international: { percentage: 3.5, fixed: 0 },
    },
  },
  'CAD': {
    region: 'Canada',
    country: 'CA',
    methods: ['card'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      rupay_debit: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.5, fixed: 0 },
      credit_cards: { percentage: 3.5, fixed: 0 },
      net_banking: { percentage: 0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      international: { percentage: 3.5, fixed: 0 },
    },
  },
  'SGD': {
    region: 'Singapore',
    country: 'SG',
    methods: ['card'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      rupay_debit: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.5, fixed: 0 },
      credit_cards: { percentage: 3.5, fixed: 0 },
      net_banking: { percentage: 0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      international: { percentage: 3.5, fixed: 0 },
    },
  },
  'AED': {
    region: 'United Arab Emirates',
    country: 'AE',
    methods: ['card'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      rupay_debit: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.5, fixed: 0 },
      credit_cards: { percentage: 3.5, fixed: 0 },
      net_banking: { percentage: 0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      international: { percentage: 3.5, fixed: 0 },
    },
  },
  'JPY': {
    region: 'Japan',
    country: 'JP',
    methods: ['card'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      rupay_debit: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.5, fixed: 0 },
      credit_cards: { percentage: 3.5, fixed: 0 },
      net_banking: { percentage: 0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      international: { percentage: 3.5, fixed: 0 },
    },
  },
  'CNY': {
    region: 'China',
    country: 'CN',
    methods: ['card'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      rupay_debit: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.5, fixed: 0 },
      credit_cards: { percentage: 3.5, fixed: 0 },
      net_banking: { percentage: 0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      international: { percentage: 3.5, fixed: 0 },
    },
  },
  'CHF': {
    region: 'Switzerland',
    country: 'CH',
    methods: ['card'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      rupay_debit: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.5, fixed: 0 },
      credit_cards: { percentage: 3.5, fixed: 0 },
      net_banking: { percentage: 0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      international: { percentage: 3.5, fixed: 0 },
    },
  },
  'QAR': {
    region: 'Qatar',
    country: 'QA',
    methods: ['card'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      rupay_debit: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.5, fixed: 0 },
      credit_cards: { percentage: 3.5, fixed: 0 },
      net_banking: { percentage: 0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      international: { percentage: 3.5, fixed: 0 },
    },
  },
}

// Paytm currency decimal places
export const PAYTM_CURRENCY_DECIMALS: Record<string, number> = {
  'INR': 2, // Indian Rupee (paise)
  'USD': 2, // US Dollar (cents)
  'EUR': 2, // Euro (cents)
  'GBP': 2, // British Pound (pence)
  'AUD': 2, // Australian Dollar (cents)
  'CAD': 2, // Canadian Dollar (cents)
  'SGD': 2, // Singapore Dollar (cents)
  'AED': 2, // UAE Dirham (fils)
  'JPY': 0, // Japanese Yen (no subdivision)
  'CNY': 2, // Chinese Yuan (fen)
  'CHF': 2, // Swiss Franc (rappen)
  'QAR': 2, // Qatari Riyal (dirhams)
}

// Paytm payment status mapping
export const PAYTM_STATUS_MAPPING: Record<string, string> = {
  'TXN_SUCCESS': 'COMPLETED',
  'TXN_FAILURE': 'FAILED',
  'PENDING': 'PENDING',
  'OPEN': 'PENDING',
  'REFUND': 'REFUNDED',
  'CANCELLED': 'CANCELLED',
}

// Paytm webhook events
export const PAYTM_WEBHOOK_EVENTS = {
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_PENDING: 'payment.pending',
  REFUND_SUCCESS: 'refund.success',
  REFUND_FAILED: 'refund.failed',
} as const

// TypeScript interfaces for Paytm API
export interface PaytmAmount {
  amount: string // Amount in string format
  currency: string
}

export interface PaytmCustomer {
  email: string
  phone?: string
  customerId?: string
}

export interface PaytmTransactionRequest {
  orderId: string
  txnAmount: PaytmAmount
  userInfo: PaytmCustomer
  paymentMode?: string
  website?: string
  industryType?: string
  channelId?: string
  callbackUrl?: string
  enablePaymentMode?: string[]
  disablePaymentMode?: string[]
}

export interface PaytmTransaction {
  orderId: string
  txnId: string
  txnAmount: string
  txnType: string
  gatewayName: string
  bankName: string
  paymentMode: string
  refundAmt: string
  txnDate: string
  resultStatus: string
  resultCode: string
  resultMsg: string
  mid: string
  currency: string
  checksumhash: string
}

export interface PaytmInitializeResponse {
  body: {
    resultInfo: {
      resultStatus: string
      resultCode: string
      resultMsg: string
    }
    txnToken: string
    isPromoCodeValid: boolean
    authenticated: boolean
  }
}

export interface PaytmVerifyResponse {
  body: {
    resultInfo: {
      resultStatus: string
      resultCode: string
      resultMsg: string
    }
    txnId: string
    bankTxnId: string
    orderId: string
    txnAmount: string
    txnType: string
    gatewayName: string
    bankName: string
    mid: string
    paymentMode: string
    refundAmt: string
    txnDate: string
    currency: string
  }
}

export interface PaytmWebhookData {
  orderId: string
  mid: string
  txnId: string
  txnAmount: string
  paymentMode: string
  currency: string
  txnDate: string
  status: string
  respCode: string
  respMsg: string
  gatewayName: string
  bankTxnId: string
  bankName: string
  checksumhash: string
}

export interface PaytmErrorResponse {
  body: {
    resultInfo: {
      resultStatus: string
      resultCode: string
      resultMsg: string
    }
  }
}

export interface PaytmApiResponse<T> {
  body: {
    resultInfo: {
      resultStatus: string
      resultCode: string
      resultMsg: string
    }
    [key: string]: any
  }
}

export class PaytmError extends Error {
  public code: string
  public status: number
  public details?: any

  constructor(message: string, code: string = 'PAYTM_ERROR', status: number = 500, details?: any) {
    super(message)
    this.name = 'PaytmError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export function validatePaytmConfig(): void {
  if (!PAYTM_CONFIG.MID) {
    throw new PaytmError('Paytm MID is not configured', 'CONFIG_ERROR', 500)
  }
  if (!PAYTM_CONFIG.MERCHANT_KEY) {
    throw new PaytmError('Paytm Merchant Key is not configured', 'CONFIG_ERROR', 500)
  }
}

export function isCurrencySupported(currency: string): boolean {
  return Object.keys(PAYTM_CURRENCY_REGIONS).includes(currency.toUpperCase())
}

export function getCurrencyInfo(currency: string) {
  const currencyCode = currency.toUpperCase()
  return PAYTM_CURRENCY_REGIONS[currencyCode] || null
}

export function getAvailablePaymentMethods(currency: string): string[] {
  const info = getCurrencyInfo(currency)
  return info ? info.methods : []
}

export function formatPaytmAmount(amount: number, currency: string): string {
  const decimals = PAYTM_CURRENCY_DECIMALS[currency.toUpperCase()] || 2
  return amount.toFixed(decimals)
}

export function parsePaytmAmount(amount: string, currency: string): number {
  return parseFloat(amount)
}

export function mapPaytmStatus(paytmStatus: string): string {
  return PAYTM_STATUS_MAPPING[paytmStatus] || 'PENDING'
}

export function generatePaytmOrderId(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `PAYTM_${timestamp}_${random}`
}

export function generateChecksumHash(params: Record<string, any>, merchantKey: string): string {
  // Sort parameters
  const sortedParams = Object.keys(params).sort().reduce((result, key) => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      result[key] = params[key]
    }
    return result
  }, {} as Record<string, any>)

  // Create parameter string
  const paramStr = Object.keys(sortedParams)
    .map(key => `${key}=${sortedParams[key]}`)
    .join('&')

  // Generate checksum using createCipheriv instead of deprecated createCipher
  const key = crypto.createHash('md5').update(merchantKey).digest()
  const iv = Buffer.alloc(16) // Use zero IV for compatibility
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv)
  let encrypted = cipher.update(paramStr, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const hash = crypto.createHash('sha256')
  hash.update(encrypted + merchantKey)
  return hash.digest('hex')
}

export function verifyChecksumHash(params: Record<string, any>, checksumHash: string, merchantKey: string): boolean {
  const { checksumhash, ...paramsWithoutChecksum } = params
  const expectedChecksum = generateChecksumHash(paramsWithoutChecksum, merchantKey)
  return expectedChecksum === checksumHash
}

export async function makePaytmRequest<T>(
  endpoint: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
  } = {}
): Promise<T> {
  const { method = 'POST', body, headers = {} } = options

  try {
    const url = `${PAYTM_CONFIG.API_BASE_URL}${endpoint}`
    
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
      },
      // Note: timeout is not part of standard RequestInit, would need AbortController for timeout
    }

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(body)
    }

    const response = await fetch(url, requestOptions)
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new PaytmError(
        `Paytm API request failed: ${response.status} ${response.statusText}`,
        'API_ERROR',
        response.status,
        { response: errorText, url, method }
      )
    }

    const data = await response.json()
    
    // Check for Paytm API errors
    if (data.body?.resultInfo?.resultStatus === 'F') {
      throw new PaytmError(
        data.body.resultInfo.resultMsg || 'Paytm API error',
        data.body.resultInfo.resultCode || 'PAYTM_API_ERROR',
        400,
        data
      )
    }

    return data as T
  } catch (error) {
    if (error instanceof PaytmError) {
      throw error
    }
    
    throw new PaytmError(
      `Paytm API request failed: ${error.message}`,
      'NETWORK_ERROR',
      500,
      { originalError: error, endpoint, method }
    )
  }
}

export function buildCallbackUrl(): string {
  const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000'
  return `${baseUrl}${PAYTM_CONFIG.CALLBACK_URL}`
}

export function buildWebhookUrl(): string {
  const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000'
  return `${baseUrl}${PAYTM_CONFIG.WEBHOOK_ENDPOINT}`
}

export function isTestMode(): boolean {
  return PAYTM_CONFIG.SANDBOX
}

export function getPaymentMethodDisplayName(method: string): string {
  const methodNames: Record<string, string> = {
    'upi': 'UPI',
    'card': 'Credit/Debit Card',
    'netbanking': 'Net Banking',
    'wallet': 'Paytm Wallet',
    'emi': 'EMI',
    'bank_transfer': 'Bank Transfer',
  }
  return methodNames[method] || method.toUpperCase()
}

export function calculatePaytmFees(amount: number, currency: string, paymentMethod: string = 'credit_cards'): {
  fees: number
  netAmount: number
  grossAmount: number
} {
  const currencyInfo = getCurrencyInfo(currency)
  if (!currencyInfo) {
    return { fees: 0, netAmount: amount, grossAmount: amount }
  }

  const feeInfo = currencyInfo.fees[paymentMethod as keyof typeof currencyInfo.fees] || currencyInfo.fees.credit_cards
  const fees = (amount * feeInfo.percentage / 100) + feeInfo.fixed
  
  return {
    fees: Math.round(fees * 100) / 100,
    netAmount: Math.round((amount - fees) * 100) / 100,
    grossAmount: amount,
  }
}

export function getRegionFromCurrency(currency: string): string {
  const info = getCurrencyInfo(currency)
  return info ? info.region : 'Unknown'
}

export function getCountryFromCurrency(currency: string): string {
  const info = getCurrencyInfo(currency)
  return info ? info.country : 'Unknown'
}

export function getSupportedChannels(currency: string): string[] {
  const info = getCurrencyInfo(currency)
  return info ? info.methods : []
}

export type PaytmWebhookEvent = typeof PAYTM_WEBHOOK_EVENTS[keyof typeof PAYTM_WEBHOOK_EVENTS] 