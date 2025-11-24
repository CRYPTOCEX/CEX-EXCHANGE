import { createError } from '@b/utils/error'
import * as crypto from 'crypto'

// PayU API Configuration
export const PAYU_CONFIG = {
  API_BASE_URL: process.env.APP_PAYU_SANDBOX === 'true' 
    ? 'https://test.payu.in' 
    : 'https://secure.payu.in',
  MERCHANT_KEY: process.env.APP_PAYU_MERCHANT_KEY || '',
  MERCHANT_SALT: process.env.APP_PAYU_MERCHANT_SALT || '',
  MERCHANT_ID: process.env.APP_PAYU_MERCHANT_ID || '',
  SANDBOX: process.env.APP_PAYU_SANDBOX === 'true',
  CALLBACK_URL: process.env.APP_PAYU_CALLBACK_URL || '/user/wallet/deposit/payu/verify',
  WEBHOOK_ENDPOINT: process.env.APP_PAYU_WEBHOOK_ENDPOINT || '/api/finance/deposit/fiat/payu/webhook',
  SUCCESS_URL: process.env.APP_PAYU_SUCCESS_URL || '/user/wallet/deposit/payu/success',
  FAILURE_URL: process.env.APP_PAYU_FAILURE_URL || '/user/wallet/deposit/payu/failure',
  CANCEL_URL: process.env.APP_PAYU_CANCEL_URL || '/user/wallet/deposit/payu/cancel',
  VERSION: '1.0',
}

// PayU supported currencies with regional information and payment methods
export const PAYU_SUPPORTED_CURRENCIES = {
  'INR': {
    region: 'India',
    country: 'IN',
    methods: ['card', 'upi', 'netbanking', 'wallet', 'emi', 'cash'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 0.9, fixed: 0 },
      credit_cards: { percentage: 1.9, fixed: 0 },
      net_banking: { percentage: 1.2, fixed: 0 },
      wallet: { percentage: 1.5, fixed: 0 },
      emi: { percentage: 2.5, fixed: 0 },
      international: { percentage: 3.5, fixed: 0 },
    },
  },
  'USD': {
    region: 'United States',
    country: 'US',
    methods: ['card'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.5, fixed: 0 },
      credit_cards: { percentage: 3.5, fixed: 0 },
      net_banking: { percentage: 0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 3.5, fixed: 0 },
    },
  },
  'EUR': {
    region: 'Europe',
    country: 'EU',
    methods: ['card'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 2.8, fixed: 0 },
      credit_cards: { percentage: 2.8, fixed: 0 },
      net_banking: { percentage: 0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 2.8, fixed: 0 },
    },
  },
  'GBP': {
    region: 'United Kingdom',
    country: 'GB',
    methods: ['card'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 2.9, fixed: 0 },
      credit_cards: { percentage: 2.9, fixed: 0 },
      net_banking: { percentage: 0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 2.9, fixed: 0 },
    },
  },
  'PLN': {
    region: 'Poland',
    country: 'PL',
    methods: ['card', 'bank_transfer'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 2.5, fixed: 0 },
      credit_cards: { percentage: 2.5, fixed: 0 },
      net_banking: { percentage: 2.0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 2.5, fixed: 0 },
    },
  },
  'CZK': {
    region: 'Czech Republic',
    country: 'CZ',
    methods: ['card', 'bank_transfer'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 2.7, fixed: 0 },
      credit_cards: { percentage: 2.7, fixed: 0 },
      net_banking: { percentage: 2.2, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 2.7, fixed: 0 },
    },
  },
  'RON': {
    region: 'Romania',
    country: 'RO',
    methods: ['card', 'bank_transfer'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 2.6, fixed: 0 },
      credit_cards: { percentage: 2.6, fixed: 0 },
      net_banking: { percentage: 2.1, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 2.6, fixed: 0 },
    },
  },
  'HUF': {
    region: 'Hungary',
    country: 'HU',
    methods: ['card', 'bank_transfer'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 2.8, fixed: 0 },
      credit_cards: { percentage: 2.8, fixed: 0 },
      net_banking: { percentage: 2.3, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 2.8, fixed: 0 },
    },
  },
  'UAH': {
    region: 'Ukraine',
    country: 'UA',
    methods: ['card', 'bank_transfer'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.2, fixed: 0 },
      credit_cards: { percentage: 3.2, fixed: 0 },
      net_banking: { percentage: 2.7, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 3.2, fixed: 0 },
    },
  },
  'TRY': {
    region: 'Turkey',
    country: 'TR',
    methods: ['card', 'bank_transfer'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.0, fixed: 0 },
      credit_cards: { percentage: 3.0, fixed: 0 },
      net_banking: { percentage: 2.5, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 3.0, fixed: 0 },
    },
  },
  'BRL': {
    region: 'Brazil',
    country: 'BR',
    methods: ['card', 'boleto', 'pix'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.8, fixed: 0 },
      credit_cards: { percentage: 3.8, fixed: 0 },
      net_banking: { percentage: 3.3, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 3.8, fixed: 0 },
    },
  },
  'COP': {
    region: 'Colombia',
    country: 'CO',
    methods: ['card', 'bank_transfer', 'cash'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.5, fixed: 0 },
      credit_cards: { percentage: 3.5, fixed: 0 },
      net_banking: { percentage: 3.0, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 3.5, fixed: 0 },
    },
  },
  'PEN': {
    region: 'Peru',
    country: 'PE',
    methods: ['card', 'bank_transfer', 'cash'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.3, fixed: 0 },
      credit_cards: { percentage: 3.3, fixed: 0 },
      net_banking: { percentage: 2.8, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 3.3, fixed: 0 },
    },
  },
  'ARS': {
    region: 'Argentina',
    country: 'AR',
    methods: ['card', 'bank_transfer', 'cash'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 4.2, fixed: 0 },
      credit_cards: { percentage: 4.2, fixed: 0 },
      net_banking: { percentage: 3.7, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 4.2, fixed: 0 },
    },
  },
  'CLP': {
    region: 'Chile',
    country: 'CL',
    methods: ['card', 'bank_transfer'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.7, fixed: 0 },
      credit_cards: { percentage: 3.7, fixed: 0 },
      net_banking: { percentage: 3.2, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 3.7, fixed: 0 },
    },
  },
  'MXN': {
    region: 'Mexico',
    country: 'MX',
    methods: ['card', 'bank_transfer', 'cash'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 3.4, fixed: 0 },
      credit_cards: { percentage: 3.4, fixed: 0 },
      net_banking: { percentage: 2.9, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 3.4, fixed: 0 },
    },
  },
  'ZAR': {
    region: 'South Africa',
    country: 'ZA',
    methods: ['card', 'bank_transfer'],
    fees: {
      upi: { percentage: 0, fixed: 0 },
      debit_cards: { percentage: 2.9, fixed: 0 },
      credit_cards: { percentage: 2.9, fixed: 0 },
      net_banking: { percentage: 2.4, fixed: 0 },
      wallet: { percentage: 0, fixed: 0 },
      emi: { percentage: 0, fixed: 0 },
      international: { percentage: 2.9, fixed: 0 },
    },
  },
}

// PayU payment status mapping
export const PAYU_STATUS_MAPPING: Record<string, string> = {
  'success': 'COMPLETED',
  'failure': 'FAILED',
  'pending': 'PENDING',
  'cancel': 'CANCELLED',
  'in_progress': 'PENDING',
  'dropped': 'FAILED',
  'bounced': 'FAILED',
  'timeout': 'FAILED',
  'initiated': 'PENDING',
  'awaited': 'PENDING',
  'auth': 'PENDING',
  'captured': 'COMPLETED',
  'void': 'CANCELLED',
  'refunded': 'REFUNDED',
}

// PayU webhook events
export const PAYU_WEBHOOK_EVENTS = {
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_PENDING: 'payment_pending',
  REFUND_SUCCESS: 'refund_success',
  REFUND_FAILED: 'refund_failed',
} as const

// PayU API interfaces
export interface PayUTransactionRequest {
  key: string
  txnid: string
  amount: string
  productinfo: string
  firstname: string
  email: string
  phone: string
  surl: string
  furl: string
  hash: string
  udf1?: string
  udf2?: string
  udf3?: string
  udf4?: string
  udf5?: string
  pg?: string
  bankcode?: string
  ccnum?: string
  ccname?: string
  ccvv?: string
  ccexpmon?: string
  ccexpyr?: string
  enforce_paymethod?: string
}

export interface PayUInitializeResponse {
  status: number
  message: string
  result: {
    key: string
    txnid: string
    amount: string
    productinfo: string
    firstname: string
    email: string
    phone: string
    surl: string
    furl: string
    hash: string
    payment_url: string
  }
}

export interface PayUVerifyResponse {
  status: number
  message: string
  transaction_details: {
    [key: string]: {
      mihpayid: string
      request_id: string
      bank_ref_num: string
      amt: string
      disc: string
      mode: string
      status: string
      unmappedstatus: string
      key: string
      txnid: string
      amount: string
      productinfo: string
      firstname: string
      bankcode: string
      udf1: string
      udf2: string
      udf3: string
      udf4: string
      udf5: string
      field2: string
      field9: string
      error: string
      error_Message: string
      addedon: string
      payment_source: string
      card_type: string
      error_code: string
      bank_name: string
      name_on_card: string
      cardnum: string
      cardhash: string
    }
  }
}

export interface PayUWebhookData {
  mihpayid: string
  mode: string
  status: string
  unmappedstatus: string
  key: string
  txnid: string
  amount: string
  addedon: string
  productinfo: string
  firstname: string
  lastname: string
  address1: string
  address2: string
  city: string
  state: string
  country: string
  zipcode: string
  email: string
  phone: string
  udf1: string
  udf2: string
  udf3: string
  udf4: string
  udf5: string
  udf6: string
  udf7: string
  udf8: string
  udf9: string
  udf10: string
  hash: string
  field1: string
  field2: string
  field3: string
  field4: string
  field5: string
  field6: string
  field7: string
  field8: string
  field9: string
  payment_source: string
  PG_TYPE: string
  bank_ref_num: string
  bankcode: string
  error: string
  error_Message: string
  name_on_card: string
  cardnum: string
  cardhash: string
  amount_split: string
  payuMoneyId: string
  discount: string
  net_amount_debit: string
  card_token: string
}

export interface PayUError {
  status: number
  message: string
  error_code?: string
  field?: string
}

// Validation functions
export function validatePayUConfig(): void {
  if (!PAYU_CONFIG.MERCHANT_KEY) {
    throw createError({
      statusCode: 500,
      message: 'PayU merchant key not configured',
    })
  }

  if (!PAYU_CONFIG.MERCHANT_SALT) {
    throw createError({
      statusCode: 500,
      message: 'PayU merchant salt not configured',
    })
  }

  if (!PAYU_CONFIG.MERCHANT_ID) {
    throw createError({
      statusCode: 500,
      message: 'PayU merchant ID not configured',
    })
  }
}

export function validatePayUCurrency(currency: string): boolean {
  return currency in PAYU_SUPPORTED_CURRENCIES
}

export function getPayUCurrencyInfo(currency: string) {
  const currencyInfo = PAYU_SUPPORTED_CURRENCIES[currency as keyof typeof PAYU_SUPPORTED_CURRENCIES]
  if (!currencyInfo) {
    throw createError({
      statusCode: 400,
      message: `Unsupported currency: ${currency}`,
    })
  }
  return currencyInfo
}

// PayU hash generation
export function generatePayUHash(params: Record<string, any>, salt: string): string {
  // PayU hash format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
  const hashString = `${params.key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|${params.udf1 || ''}|${params.udf2 || ''}|${params.udf3 || ''}|${params.udf4 || ''}|${params.udf5 || ''}||||||${salt}`
  
  return crypto.createHash('sha512').update(hashString).digest('hex')
}

// PayU response hash verification
export function verifyPayUHash(params: Record<string, any>, hash: string, salt: string): boolean {
  // PayU response hash format: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const hashString = `${salt}|${params.status}||||||${params.udf5 || ''}|${params.udf4 || ''}|${params.udf3 || ''}|${params.udf2 || ''}|${params.udf1 || ''}|${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${params.key}`
  
  const expectedHash = crypto.createHash('sha512').update(hashString).digest('hex')
  return expectedHash === hash
}

// PayU API request helper
export async function makePayURequest<T>(
  endpoint: string,
  options: {
    method: string
    body?: any
    headers?: Record<string, string>
  }
): Promise<T> {
  const url = `${PAYU_CONFIG.API_BASE_URL}${endpoint}`
  
  try {
    const response = await fetch(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PayU-NodeJS-SDK/1.0.0',
        ...options.headers,
      },
      body: options.body ? new URLSearchParams(options.body).toString() : undefined,
    })

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        message: `PayU API error: ${response.statusText}`,
      })
    }

    const data = await response.json()
    return data as T
  } catch (error) {
    if (error instanceof Error) {
      throw createError({
        statusCode: 500,
        message: `PayU API request failed: ${error.message}`,
      })
    }
    throw error
  }
}

// Status mapping helper
export function mapPayUStatus(payuStatus: string): string {
  const status = payuStatus.toLowerCase()
  return PAYU_STATUS_MAPPING[status] || 'PENDING'
}

// Amount parsing helper
export function parsePayUAmount(amount: string, currency: string): number {
  const numAmount = parseFloat(amount)
  if (isNaN(numAmount)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid amount format',
    })
  }
  return numAmount
}

// Payment method mapping
export function getPayUPaymentMethods(currency: string): string[] {
  const currencyInfo = getPayUCurrencyInfo(currency)
  return currencyInfo.methods
}

// Generate transaction ID
export function generatePayUTransactionId(): string {
  return `payu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Format amount for PayU (2 decimal places)
export function formatPayUAmount(amount: number): string {
  return amount.toFixed(2)
}

// Validate payment method for currency
export function validatePaymentMethod(currency: string, paymentMethod: string): boolean {
  const availableMethods = getPayUPaymentMethods(currency)
  return availableMethods.includes(paymentMethod)
}

// Get payment method fees
export function getPaymentMethodFees(currency: string, paymentMethod: string) {
  const currencyInfo = getPayUCurrencyInfo(currency)
  const methodKey = paymentMethod.toLowerCase().replace(/[-\s]/g, '_')
  return currencyInfo.fees[methodKey as keyof typeof currencyInfo.fees] || currencyInfo.fees.international
}

// Calculate transaction fees
export function calculatePayUFees(amount: number, currency: string, paymentMethod: string) {
  const fees = getPaymentMethodFees(currency, paymentMethod)
  const percentageFee = (amount * fees.percentage) / 100
  const totalFee = percentageFee + fees.fixed
  return {
    amount: amount,
    percentageFee: percentageFee,
    fixedFee: fees.fixed,
    totalFee: totalFee,
    netAmount: amount - totalFee,
  }
} 