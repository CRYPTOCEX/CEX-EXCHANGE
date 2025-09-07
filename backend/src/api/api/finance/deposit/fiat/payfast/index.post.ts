import { models } from '@b/db'
import { createError } from '@b/utils/error'
import {
  validatePayFastConfig,
  isCurrencySupported,
  formatPayFastAmount,
  generatePayFastReference,
  generateSignature,
  buildNotifyUrl,
  buildReturnUrl,
  buildCancelUrl,
  buildPaymentUrl,
  generatePaymentForm,
  PAYFAST_CONFIG,
  PayFastPaymentData
} from './utils'

export const metadata = {
  summary: 'Creates a PayFast payment session',
  description: 'Initiates a payment with PayFast and returns payment form',
  operationId: 'createPayFastPayment',
  tags: ['Finance', 'Deposit', 'PayFast'],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Payment amount',
              minimum: 0.01,
            },
            currency: {
              type: 'string',
              description: 'Payment currency code',
              example: 'ZAR',
            },
          },
          required: ['amount', 'currency'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Payment session created successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  transactionId: { type: 'string' },
                  reference: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  paymentUrl: { type: 'string' },
                  paymentForm: { type: 'string' },
                  redirectUrl: { type: 'string' },
                  instructions: { type: 'string' },
                  expiresAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    400: { description: 'Bad request - invalid parameters' },
    401: { description: 'Unauthorized' },
    500: { description: 'Internal server error' },
  },
}

interface RequestBody {
  amount: number
  currency: string
}

interface Handler {
  body: RequestBody
  user?: any
}

export default async (data: Handler) => {
  const { body, user } = data
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
  }

  // Validate required fields
  if (!body.amount || !body.currency) {
    throw createError({
      statusCode: 400,
      message: 'Amount and currency are required',
    })
  }

  // Validate configuration
  validatePayFastConfig()

  // Validate currency support
  if (!isCurrencySupported(body.currency)) {
    throw createError({
      statusCode: 400,
      message: `Currency ${body.currency} is not supported by PayFast`,
    })
  }

  // Validate amount
  if (body.amount <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Amount must be greater than 0',
    })
  }

  const { amount, currency: currencyCode } = body

  try {
    // Get gateway configuration
    const gateway = await models.depositGateway.findOne({
      where: { id: 'payfast' },
    })

    if (!gateway || !gateway.status) {
      throw createError({
        statusCode: 400,
        message: 'PayFast payment gateway is not available',
      })
    }

    // Check currency support in gateway
    const supportedCurrencies = JSON.parse(gateway.currencies || '[]')
    if (!supportedCurrencies.includes(currencyCode.toUpperCase())) {
      throw createError({
        statusCode: 400,
        message: `Currency ${currencyCode} is not supported`,
      })
    }

    // Validate amount limits
    const minAmount = gateway.getMinAmount(currencyCode)
    const maxAmount = gateway.getMaxAmount(currencyCode)

    if (amount < minAmount) {
      throw createError({
        statusCode: 400,
        message: `Minimum amount is ${minAmount} ${currencyCode}`,
      })
    }

    if (maxAmount !== null && amount > maxAmount) {
      throw createError({
        statusCode: 400,
        message: `Maximum amount is ${maxAmount} ${currencyCode}`,
      })
    }

    // Generate unique reference
    const reference = generatePayFastReference()

    // Create pending transaction
    const transaction = await models.transaction.create({
      uuid: reference,
      userId: user.id,
      type: 'DEPOSIT',
      status: 'PENDING',
      amount: amount,
      fee: 0, // PayFast fees are deducted from the amount
      description: `PayFast deposit - ${amount} ${currencyCode}`,
      metadata: {
        gateway: 'payfast',
        currency: currencyCode,
        originalAmount: amount,
        paymentMethod: 'payfast'
      }
    })

    // Prepare PayFast payment data
    const paymentData: PayFastPaymentData = {
      merchant_id: PAYFAST_CONFIG.MERCHANT_ID,
      merchant_key: PAYFAST_CONFIG.MERCHANT_KEY,
      return_url: buildReturnUrl(),
      cancel_url: buildCancelUrl(),
      notify_url: buildNotifyUrl(),
      name_first: user.firstName || 'Customer',
      name_last: user.lastName || '',
      email_address: user.email,
      m_payment_id: reference,
      amount: formatPayFastAmount(amount),
      item_name: `Wallet Deposit - ${amount} ${currencyCode}`,
      item_description: `Deposit to wallet for ${user.email}`,
      custom_str1: transaction.id.toString(),
      custom_str2: user.id.toString(),
      custom_str3: currencyCode,
      custom_str4: 'deposit',
      custom_str5: 'wallet'
    }

    // Add passphrase if configured
    if (PAYFAST_CONFIG.PASSPHRASE) {
      paymentData.passphrase = PAYFAST_CONFIG.PASSPHRASE
    }

    // Generate signature
    paymentData.signature = generateSignature(paymentData, PAYFAST_CONFIG.PASSPHRASE)

    // Update transaction with PayFast data
    await transaction.update({
      metadata: {
        ...transaction.metadata,
        payfast: {
          merchant_id: paymentData.merchant_id,
          m_payment_id: paymentData.m_payment_id,
          amount: paymentData.amount,
          item_name: paymentData.item_name,
          signature: paymentData.signature,
          created_at: new Date().toISOString()
        }
      }
    })

    // Return payment form and details
    return {
      success: true,
      data: {
        transactionId: transaction.id,
        reference: reference,
        amount: amount,
        currency: currencyCode,
        paymentUrl: buildPaymentUrl(),
        paymentForm: generatePaymentForm(paymentData),
        paymentData: {
          ...paymentData,
          // Don't expose sensitive data in response
          merchant_key: undefined,
          passphrase: undefined
        },
        redirectUrl: buildPaymentUrl(),
        instructions: 'You will be redirected to PayFast to complete your payment',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      }
    }

  } catch (error) {
    console.error('PayFast payment creation error:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create PayFast payment',
    })
  }
} 