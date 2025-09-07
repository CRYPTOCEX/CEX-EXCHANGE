import { models } from '@b/db'
import { createError } from '@b/utils/error'
import {
  validatePayUConfig,
  validatePayUCurrency,
  generatePayUHash,
  generatePayUTransactionId,
  formatPayUAmount,
  getPayUPaymentMethods,
  validatePaymentMethod,
  PayUTransactionRequest,
  PAYU_CONFIG
} from './utils'

export const metadata = {
  summary: 'Creates a PayU payment session',
  description: 'Initiates a PayU payment transaction with comprehensive payment method support',
  operationId: 'createPayUPayment',
  tags: ['Finance', 'Deposit', 'PayU'],
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
              description: 'Payment currency (INR, USD, EUR, GBP, PLN, CZK, RON, HUF, UAH, TRY, BRL, COP, PEN, ARS, CLP, MXN, ZAR)',
              enum: ['INR', 'USD', 'EUR', 'GBP', 'PLN', 'CZK', 'RON', 'HUF', 'UAH', 'TRY', 'BRL', 'COP', 'PEN', 'ARS', 'CLP', 'MXN', 'ZAR'],
            },
            paymentMethod: {
              type: 'string',
              description: 'Preferred payment method (card, upi, netbanking, wallet, emi, cash, bank_transfer, boleto, pix)',
              enum: ['card', 'upi', 'netbanking', 'wallet', 'emi', 'cash', 'bank_transfer', 'boleto', 'pix'],
            },
            customerInfo: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                address: {
                  type: 'object',
                  properties: {
                    street: { type: 'string' },
                    city: { type: 'string' },
                    state: { type: 'string' },
                    country: { type: 'string' },
                    zipCode: { type: 'string' },
                  },
                },
              },
              required: ['firstName', 'email'],
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
                  transaction_id: { type: 'string' },
                  payment_url: { type: 'string' },
                  payment_form_data: { type: 'object' },
                  amount: { type: 'number' },
                  fee: { type: 'number' },
                  total_amount: { type: 'number' },
                  currency: { type: 'string' },
                  gateway: { type: 'string' },
                  expires_at: { type: 'string' },
                  supported_methods: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request - Invalid input data',
    },
    401: {
      description: 'Unauthorized - User not authenticated',
    },
    500: {
      description: 'Internal server error',
    },
  },
}

export default async (data: Handler) => {
  const { user, body } = data
  const { amount, currency, paymentMethod, customerInfo } = body

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'User not authenticated',
    })
  }

  if (!amount || amount <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Valid amount is required',
    })
  }

  if (!currency) {
    throw createError({
      statusCode: 400,
      message: 'Currency is required',
    })
  }

  try {
    // Get PayU gateway configuration
    const gateway = await models.depositGateway.findOne({
      where: { alias: 'payu', status: true },
    })

    if (!gateway) {
      throw createError({
        statusCode: 404,
        message: 'PayU gateway not found or disabled',
      })
    }

    // Validate PayU configuration
    validatePayUConfig()

    // Validate currency support
    if (!validatePayUCurrency(currency)) {
      throw createError({
        statusCode: 400,
        message: `Unsupported currency: ${currency}`,
      })
    }

    if (!gateway.currencies?.includes(currency)) {
      throw createError({
        statusCode: 400,
        message: `Currency ${currency} is not supported by PayU gateway`,
      })
    }

    // Get currency-specific fees and limits
    const fixedFee = gateway.getFixedFee(currency)
    const percentageFee = gateway.getPercentageFee(currency)
    const minAmount = gateway.getMinAmount(currency)
    const maxAmount = gateway.getMaxAmount(currency)

    // Validate amount limits
    if (amount < minAmount) {
      throw createError({
        statusCode: 400,
        message: `Amount must be at least ${minAmount} ${currency}`,
      })
    }

    if (maxAmount && amount > maxAmount) {
      throw createError({
        statusCode: 400,
        message: `Amount cannot exceed ${maxAmount} ${currency}`,
      })
    }

    // Calculate fees
    const feeAmount = (amount * percentageFee) / 100 + fixedFee
    const totalAmount = amount + feeAmount

    // Get available payment methods for currency
    const availableMethods = getPayUPaymentMethods(currency)

    // Validate payment method if specified
    if (paymentMethod && !validatePaymentMethod(currency, paymentMethod)) {
      throw createError({
        statusCode: 400,
        message: `Payment method ${paymentMethod} not supported for ${currency}`,
      })
    }

    // Generate unique transaction ID
    const transactionId = generatePayUTransactionId()
    const formattedAmount = formatPayUAmount(totalAmount)

    // Customer information with defaults
    const customer = {
      firstName: customerInfo?.firstName || user.firstName || 'Customer',
      lastName: customerInfo?.lastName || user.lastName || '',
      email: customerInfo?.email || user.email,
      phone: customerInfo?.phone || user.phone || '',
      address: {
        street: customerInfo?.address?.street || '',
        city: customerInfo?.address?.city || '',
        state: customerInfo?.address?.state || '',
        country: customerInfo?.address?.country || '',
        zipCode: customerInfo?.address?.zipCode || '',
      },
    }

    if (!customer.email) {
      throw createError({
        statusCode: 400,
        message: 'Customer email is required',
      })
    }

    // Create transaction record
    const transaction = await models.transaction.create({
      uuid: transactionId,
      userId: user.id,
      type: 'DEPOSIT',
      status: 'PENDING',
      amount: amount,
      fee: feeAmount,
      description: `PayU deposit of ${amount} ${currency} (Fee: ${feeAmount} ${currency})`,
      metadata: JSON.stringify({
        gateway: 'payu',
        currency: currency,
        paymentMethod: paymentMethod || 'card',
        customer: customer,
        fees: {
          fixed: fixedFee,
          percentage: percentageFee,
          total: feeAmount,
        },
        amounts: {
          base: amount,
          fee: feeAmount,
          total: totalAmount,
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour expiry
      }),
    })

    // Prepare PayU payment request
    const payuRequest: PayUTransactionRequest = {
      key: PAYU_CONFIG.MERCHANT_KEY,
      txnid: transactionId,
      amount: formattedAmount,
      productinfo: `Wallet deposit - ${currency}`,
      firstname: customer.firstName,
      email: customer.email,
      phone: customer.phone,
      surl: `${process.env.FRONTEND_URL}${PAYU_CONFIG.SUCCESS_URL}`,
      furl: `${process.env.FRONTEND_URL}${PAYU_CONFIG.FAILURE_URL}`,
      hash: '', // Will be generated below
    }

    // Add optional fields
    if (customer.lastName) {
      payuRequest.udf1 = customer.lastName
    }
    if (customer.address.city) {
      payuRequest.udf2 = customer.address.city
    }
    if (customer.address.state) {
      payuRequest.udf3 = customer.address.state
    }
    if (customer.address.country) {
      payuRequest.udf4 = customer.address.country
    }
    if (paymentMethod) {
      payuRequest.udf5 = paymentMethod
    }

    // Set payment method specific parameters
    if (paymentMethod) {
      switch (paymentMethod) {
        case 'upi':
          payuRequest.pg = 'UPI'
          break
        case 'netbanking':
          payuRequest.pg = 'NB'
          break
        case 'wallet':
          payuRequest.pg = 'WALLET'
          break
        case 'emi':
          payuRequest.pg = 'EMI'
          break
        case 'card':
        default:
          payuRequest.pg = 'CC'
          break
      }
    }

    // Generate hash for the request
    payuRequest.hash = generatePayUHash(payuRequest, PAYU_CONFIG.MERCHANT_SALT)

    // Update transaction with PayU request data
    await transaction.update({
      referenceId: transactionId,
      metadata: JSON.stringify({
        ...JSON.parse(transaction.metadata || '{}'),
        payuRequest: payuRequest,
        paymentUrl: `${PAYU_CONFIG.API_BASE_URL}/_payment`,
        callbackUrl: `${process.env.FRONTEND_URL}${PAYU_CONFIG.CALLBACK_URL}`,
        successUrl: payuRequest.surl,
        failureUrl: payuRequest.furl,
        cancelUrl: `${process.env.FRONTEND_URL}${PAYU_CONFIG.CANCEL_URL}`,
      }),
    })

    return {
      success: true,
      data: {
        transaction_id: transactionId,
        payment_url: `${PAYU_CONFIG.API_BASE_URL}/_payment`,
        payment_form_data: payuRequest,
        amount: amount,
        fee: feeAmount,
        total_amount: totalAmount,
        currency: currency,
        gateway: 'payu',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        supported_methods: availableMethods,
        customer_info: {
          name: `${customer.firstName} ${customer.lastName}`.trim(),
          email: customer.email,
          phone: customer.phone,
        },
        callback_url: `${process.env.FRONTEND_URL}${PAYU_CONFIG.CALLBACK_URL}`,
        success_url: payuRequest.surl,
        failure_url: payuRequest.furl,
        cancel_url: `${process.env.FRONTEND_URL}${PAYU_CONFIG.CANCEL_URL}`,
        limits: {
          min: minAmount,
          max: maxAmount,
        },
        fees: {
          fixed: fixedFee,
          percentage: percentageFee,
          total: feeAmount,
        },
      },
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to create PayU payment',
    })
  }
} 