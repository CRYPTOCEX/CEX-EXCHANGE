import { createError } from '@b/utils/error'
import crypto from 'crypto'

// PayFast API Configuration
export const PAYFAST_CONFIG = {
  SANDBOX_HOST: 'sandbox.payfast.co.za',
  LIVE_HOST: 'www.payfast.co.za',
  MERCHANT_ID: process.env.APP_PAYFAST_MERCHANT_ID || '',
  MERCHANT_KEY: process.env.APP_PAYFAST_MERCHANT_KEY || '',
  PASSPHRASE: process.env.APP_PAYFAST_PASSPHRASE || '',
  SANDBOX: process.env.APP_PAYFAST_SANDBOX === 'true',
  NOTIFY_URL: process.env.APP_PAYFAST_NOTIFY_URL || '/api/finance/deposit/fiat/payfast/webhook',
  RETURN_URL: process.env.APP_PAYFAST_RETURN_URL || '/user/wallet/deposit/payfast/verify',
  CANCEL_URL: process.env.APP_PAYFAST_CANCEL_URL || '/user/wallet/deposit/payfast/cancel',
  TIMEOUT: 30000, // 30 seconds
}

// PayFast supported currencies with primary ZAR
export const PAYFAST_SUPPORTED_CURRENCIES = [
  'ZAR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'SEK', 'NOK', 'DKK', 
  'PLN', 'CZK', 'HUF', 'BGN', 'RON', 'HRK', 'ISK', 'JPY', 'CNY', 'HKD', 
  'SGD', 'MYR', 'THB', 'PHP', 'IDR', 'VND', 'KRW', 'TWD', 'INR', 'ILS', 'TRY'
]

// PayFast payment methods by currency
export const PAYFAST_PAYMENT_METHODS: Record<string, string[]> = {
  'ZAR': [
    'creditcard', 'instanteft', 'capitecpay', 'applepay', 'samsungpay', 
    'snapcan', 'zapper', 'mobicred', 'moretyme', 'mukurupay', 'scode', 
    'storecards', 'debitcard', 'masterpass'
  ],
  // International currencies support credit cards and mobile wallets
  'USD': ['creditcard', 'applepay', 'samsungpay'],
  'EUR': ['creditcard', 'applepay', 'samsungpay'],
  'GBP': ['creditcard', 'applepay', 'samsungpay'],
  'AUD': ['creditcard', 'applepay', 'samsungpay'],
  'CAD': ['creditcard', 'applepay', 'samsungpay'],
  'CHF': ['creditcard', 'applepay', 'samsungpay'],
  'SEK': ['creditcard', 'applepay', 'samsungpay'],
  'NOK': ['creditcard', 'applepay', 'samsungpay'],
  'DKK': ['creditcard', 'applepay', 'samsungpay'],
  'PLN': ['creditcard', 'applepay', 'samsungpay'],
  'CZK': ['creditcard', 'applepay', 'samsungpay'],
  'HUF': ['creditcard', 'applepay', 'samsungpay'],
  'BGN': ['creditcard', 'applepay', 'samsungpay'],
  'RON': ['creditcard', 'applepay', 'samsungpay'],
  'HRK': ['creditcard', 'applepay', 'samsungpay'],
  'ISK': ['creditcard', 'applepay', 'samsungpay'],
  'JPY': ['creditcard', 'applepay', 'samsungpay'],
  'CNY': ['creditcard', 'applepay', 'samsungpay'],
  'HKD': ['creditcard', 'applepay', 'samsungpay'],
  'SGD': ['creditcard', 'applepay', 'samsungpay'],
  'MYR': ['creditcard', 'applepay', 'samsungpay'],
  'THB': ['creditcard', 'applepay', 'samsungpay'],
  'PHP': ['creditcard', 'applepay', 'samsungpay'],
  'IDR': ['creditcard', 'applepay', 'samsungpay'],
  'VND': ['creditcard', 'applepay', 'samsungpay'],
  'KRW': ['creditcard', 'applepay', 'samsungpay'],
  'TWD': ['creditcard', 'applepay', 'samsungpay'],
  'INR': ['creditcard', 'applepay', 'samsungpay'],
  'ILS': ['creditcard', 'applepay', 'samsungpay'],
  'TRY': ['creditcard', 'applepay', 'samsungpay']
}

// PayFast status mapping
export const PAYFAST_STATUS_MAPPING: Record<string, string> = {
  'COMPLETE': 'COMPLETED',
  'FAILED': 'FAILED',
  'CANCELLED': 'CANCELLED',
  'PENDING': 'PENDING',
}

// PayFast transaction types
export const PAYFAST_TRANSACTION_TYPES = {
  PAYMENT: 'payment',
  SUBSCRIPTION: 'subscription',
  ADHOC: 'adhoc'
}

// TypeScript interfaces for PayFast API
export interface PayFastPaymentData {
  merchant_id: string
  merchant_key: string
  return_url: string
  cancel_url: string
  notify_url: string
  name_first?: string
  name_last?: string
  email_address?: string
  cell_number?: string
  m_payment_id: string
  amount: string
  item_name: string
  item_description?: string
  custom_str1?: string
  custom_str2?: string
  custom_str3?: string
  custom_str4?: string
  custom_str5?: string
  custom_int1?: number
  custom_int2?: number
  custom_int3?: number
  custom_int4?: number
  custom_int5?: number
  passphrase?: string
  signature?: string
}

export interface PayFastITNData {
  m_payment_id: string
  pf_payment_id: string
  payment_status: string
  item_name: string
  item_description?: string
  amount_gross: string
  amount_fee: string
  amount_net: string
  custom_str1?: string
  custom_str2?: string
  custom_str3?: string
  custom_str4?: string
  custom_str5?: string
  custom_int1?: string
  custom_int2?: string
  custom_int3?: string
  custom_int4?: string
  custom_int5?: string
  name_first?: string
  name_last?: string
  email_address?: string
  merchant_id: string
  signature: string
  token?: string
  billing_date?: string
}

export interface PayFastValidationResponse {
  valid: boolean
  error?: string
}

export interface PayFastApiResponse<T> {
  data?: T
  error?: string
}

// Custom error class for PayFast
export class PayFastError extends Error {
  public status: number
  public type?: string

  constructor(message: string, status: number = 500, type?: string) {
    super(message)
    this.name = 'PayFastError'
    this.status = status
    this.type = type
  }
}

// Validation functions
export function validatePayFastConfig(): void {
  if (!PAYFAST_CONFIG.MERCHANT_ID) {
    throw createError(500, 'PayFast merchant ID is not configured')
  }
  if (!PAYFAST_CONFIG.MERCHANT_KEY) {
    throw createError(500, 'PayFast merchant key is not configured')
  }
}

export function isCurrencySupported(currency: string): boolean {
  return PAYFAST_SUPPORTED_CURRENCIES.includes(currency.toUpperCase())
}

export function getAvailablePaymentMethods(currency: string): string[] {
  return PAYFAST_PAYMENT_METHODS[currency.toUpperCase()] || []
}

export function formatPayFastAmount(amount: number): string {
  return amount.toFixed(2)
}

export function parsePayFastAmount(amountString: string): number {
  return parseFloat(amountString) || 0
}

export function mapPayFastStatus(payFastStatus: string): string {
  return PAYFAST_STATUS_MAPPING[payFastStatus.toUpperCase()] || 'PENDING'
}

export function generatePayFastReference(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `PF_${timestamp}_${random}`.toUpperCase()
}

// PayFast signature generation
export function generateSignature(data: Record<string, any>, passphrase?: string): string {
  // Remove signature if present
  const { signature, ...cleanData } = data
  
  // Create parameter string
  const paramString = Object.keys(cleanData)
    .filter(key => cleanData[key] !== '' && cleanData[key] !== null && cleanData[key] !== undefined)
    .sort()
    .map(key => `${key}=${encodeURIComponent(cleanData[key]).replace(/%20/g, '+')}`)
    .join('&')
  
  // Add passphrase if provided
  const stringToHash = passphrase ? `${paramString}&passphrase=${passphrase}` : paramString
  
  // Generate MD5 hash
  return crypto.createHash('md5').update(stringToHash).digest('hex')
}

// Validate PayFast signature
export function validateSignature(data: Record<string, any>, passphrase?: string): boolean {
  const providedSignature = data.signature
  if (!providedSignature) return false
  
  const calculatedSignature = generateSignature(data, passphrase)
  return providedSignature.toLowerCase() === calculatedSignature.toLowerCase()
}

// Build PayFast URLs
export function getPayFastHost(): string {
  return PAYFAST_CONFIG.SANDBOX ? PAYFAST_CONFIG.SANDBOX_HOST : PAYFAST_CONFIG.LIVE_HOST
}

export function buildPaymentUrl(): string {
  return `https://${getPayFastHost()}/eng/process`
}

export function buildNotifyUrl(): string {
  const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000'
  return `${baseUrl}${PAYFAST_CONFIG.NOTIFY_URL}`
}

export function buildReturnUrl(): string {
  const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000'
  return `${baseUrl}${PAYFAST_CONFIG.RETURN_URL}`
}

export function buildCancelUrl(): string {
  const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000'
  return `${baseUrl}${PAYFAST_CONFIG.CANCEL_URL}`
}

export function isTestMode(): boolean {
  return PAYFAST_CONFIG.SANDBOX
}

// PayFast ITN validation via HTTP
export async function validateITN(data: PayFastITNData): Promise<PayFastValidationResponse> {
  try {
    // Build parameter string for validation
    const { signature, ...cleanData } = data
    const paramString = Object.keys(cleanData)
      .filter(key => cleanData[key] !== '' && cleanData[key] !== null && cleanData[key] !== undefined)
      .sort()
      .map(key => `${key}=${encodeURIComponent(cleanData[key]).replace(/%20/g, '+')}`)
      .join('&')
    
    // Validate with PayFast
    const response = await fetch(`https://${getPayFastHost()}/eng/query/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: paramString
    })
    
    const result = await response.text()
    
    if (result === 'VALID') {
      return { valid: true }
    } else {
      return { valid: false, error: 'PayFast ITN validation failed' }
    }
  } catch (error) {
    return { valid: false, error: `ITN validation error: ${error.message}` }
  }
}

// Get payment method display name
export function getPaymentMethodDisplayName(method: string): string {
  const methodNames: Record<string, string> = {
    'creditcard': 'Credit Card',
    'instanteft': 'Instant EFT',
    'capitecpay': 'Capitec Pay',
    'applepay': 'Apple Pay',
    'samsungpay': 'Samsung Pay',
    'snapcan': 'SnapScan',
    'zapper': 'Zapper',
    'mobicred': 'Mobicred',
    'moretyme': 'MoreTyme',
    'mukurupay': 'MukuruPay',
    'scode': 'SCode',
    'storecards': 'Store Cards',
    'debitcard': 'Debit Card',
    'masterpass': 'Masterpass'
  }
  
  return methodNames[method] || method
}

// Utility to check if amount is within PayFast limits
export function validateAmount(amount: number, currency: string): boolean {
  // PayFast minimum is R1.00 for ZAR, equivalent for other currencies
  const minAmount = currency === 'ZAR' ? 1.00 : 0.50
  const maxAmount = 100000.00 // PayFast typical maximum
  
  return amount >= minAmount && amount <= maxAmount
}

// Generate PayFast payment form HTML
export function generatePaymentForm(paymentData: PayFastPaymentData): string {
  const host = getPayFastHost()
  const formFields = Object.entries(paymentData)
    .map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`)
    .join('\n    ')
  
  return `
<form id="payfast-form" action="https://${host}/eng/process" method="post">
    ${formFields}
    <input type="submit" value="Pay with PayFast">
</form>
<script>
    document.getElementById('payfast-form').submit();
</script>
  `.trim()
} 