import { models } from '@b/db'
import { createError } from '@b/utils/error'
import {
  validatePaystackConfig,
  isCurrencySupported,
  formatPaystackAmount,
  generatePaystackReference,
  makePaystackRequest,
  buildReturnUrl,
  buildCancelUrl,
  getAvailablePaymentMethods,
  getPaymentMethodDisplayName,
  getCurrencyInfo,
  getSupportedChannels,
  calculatePaystackFees,
  PaystackTransactionRequest,
  PaystackInitializeResponse,
  PaystackError
} from './utils'

export const metadata = {
  summary: 'Creates a Paystack payment session',
  description: 'Initializes a payment with Paystack and returns authorization URL for various payment methods across African markets',
  operationId: 'createPaystackPayment',
  tags: ['Finance', 'Deposit', 'Paystack'],
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
              minimum: 1,
            },
            currency: {
              type: 'string',
              description: 'Payment currency code',
              enum: ['NGN', 'GHS', 'ZAR', 'KES', 'XOF', 'EGP', 'USD'],
              example: 'NGN',
            },
            channels: {
              type: 'array',
              items: { type: 'string' },
              description: 'Preferred payment channels',
              example: ['card', 'bank', 'ussd'],
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata for the transaction',
              additionalProperties: true,
            },
          },
          required: ['amount', 'currency'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Paystack payment session created successfully',
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
                  reference: { type: 'string' },
                  authorization_url: { type: 'string' },
                  access_code: { type: 'string' },
                  status: { type: 'string' },
                  gateway: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  region: { type: 'string' },
                  available_methods: {
                    type: 'object',
                    additionalProperties: { type: 'string' }
                  },
                  supported_channels: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  fees_info: {
                    type: 'object',
                    properties: {
                      fees: { type: 'number' },
                      net_amount: { type: 'number' },
                      gross_amount: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request - Invalid parameters',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              details: { type: 'object' },
            },
          },
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
    404: {
      description: 'Payment gateway not found',
    },
    500: {
      description: 'Internal server error',
    },
  },
}

export default async (data: Handler) => {
  const { user, body } = data
  const { amount, currency, channels, metadata = {} } = body

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'User not authenticated',
    })
  }

  if (!amount || amount <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Invalid amount provided',
    })
  }

  if (!currency) {
    throw createError({
      statusCode: 400,
      message: 'Currency is required',
    })
  }

  const currencyCode = currency.toUpperCase()

  try {
    // Validate Paystack configuration
    validatePaystackConfig()

    // Check if currency is supported
    if (!isCurrencySupported(currencyCode)) {
      throw createError({
        statusCode: 400,
        message: `Currency ${currencyCode} is not supported by Paystack. Supported currencies: NGN, GHS, ZAR, KES, XOF, EGP, USD`,
      })
    }

    // Get gateway configuration
    const gateway = await models.depositGateway.findOne({
      where: { id: 'paystack' },
    })

    if (!gateway || !gateway.status) {
      throw createError({
        statusCode: 400,
        message: 'Paystack payment gateway is not available',
      })
    }

    // Check currency support in gateway
    const supportedCurrencies = JSON.parse(gateway.currencies || '[]')
    if (!supportedCurrencies.includes(currencyCode)) {
      throw createError({
        statusCode: 400,
        message: `Currency ${currencyCode} is not supported by this gateway`,
      })
    }

    // Validate amount limits using gateway helper methods
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
    const reference = generatePaystackReference()

    // Get currency information and available methods
    const currencyInfo = getCurrencyInfo(currencyCode)
    const availableMethods = getAvailablePaymentMethods(currencyCode)
    const supportedChannels = getSupportedChannels(currencyCode)
    const feesInfo = calculatePaystackFees(amount, currencyCode)

    // Prepare transaction data for database
    const transactionData = {
      id: reference,
      userId: user.id,
      type: 'DEPOSIT',
      status: 'PENDING',
      amount: amount,
      currency: currencyCode,
      description: `Paystack deposit - ${amount} ${currencyCode}`,
      fee: feesInfo.fees,
      metadata: JSON.stringify({
        gateway: 'paystack',
        region: currencyInfo?.region,
        available_methods: availableMethods,
        supported_channels: supportedChannels,
        user_metadata: metadata,
        ip_address: data.remoteAddress,
      }),
    }

    // Create transaction record
    const transaction = await models.transaction.create(transactionData)

    // Prepare Paystack transaction request
    const paystackAmount = formatPaystackAmount(amount, currencyCode)
    const transactionRequest: PaystackTransactionRequest = {
      reference: reference,
      amount: paystackAmount,
      email: user.email || '',
      currency: currencyCode,
      callback_url: buildReturnUrl(),
      metadata: {
        user_id: user.id,
        transaction_id: transaction.id,
        gateway: 'paystack',
        region: currencyInfo?.region,
        original_amount: amount,
        fees: feesInfo.fees,
        net_amount: feesInfo.netAmount,
        ...metadata,
      },
    }

    // Add channels if specified
    if (channels && Array.isArray(channels) && channels.length > 0) {
      const validChannels = channels.filter(channel => supportedChannels.includes(channel))
      if (validChannels.length > 0) {
        transactionRequest.channels = validChannels
      }
    } else {
      // Use all supported channels for the currency
      transactionRequest.channels = supportedChannels
    }

    // Add customer information if available
    if (user.firstName || user.lastName) {
      transactionRequest.customer = {
        email: user.email || '',
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        phone: user.phone || '',
        metadata: {
          user_id: user.id,
        },
      }
    }

    // Initialize transaction with Paystack
    const paystackResponse = await makePaystackRequest<PaystackInitializeResponse>(
      '/transaction/initialize',
      {
        method: 'POST',
        body: transactionRequest,
      }
    )

    if (!paystackResponse.status || !paystackResponse.data) {
      throw createError({
        statusCode: 400,
        message: paystackResponse.message || 'Failed to initialize Paystack transaction',
      })
    }

    // Update transaction with Paystack response
    await transaction.update({
      referenceId: paystackResponse.data.reference,
      metadata: JSON.stringify({
        ...JSON.parse(transaction.metadata || '{}'),
        paystack_access_code: paystackResponse.data.access_code,
        paystack_reference: paystackResponse.data.reference,
        authorization_url: paystackResponse.data.authorization_url,
      }),
    })

    // Prepare available methods display
    const availableMethodsDisplay = availableMethods.reduce((acc, method) => {
      acc[method] = getPaymentMethodDisplayName(method)
      return acc
    }, {} as Record<string, string>)

    return {
      success: true,
      data: {
        transaction_id: transaction.id,
        reference: reference,
        authorization_url: paystackResponse.data.authorization_url,
        access_code: paystackResponse.data.access_code,
        status: 'PENDING',
        gateway: 'paystack',
        amount: amount,
        currency: currencyCode,
        region: currencyInfo?.region || 'Africa',
        available_methods: availableMethodsDisplay,
        supported_channels: supportedChannels,
        fees_info: {
          fees: feesInfo.fees,
          net_amount: feesInfo.netAmount,
          gross_amount: feesInfo.grossAmount,
        },
      },
    }

  } catch (error) {
    if (error instanceof PaystackError) {
      throw createError({
        statusCode: error.status,
        message: error.message,
      })
    }

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to create Paystack payment session',
    })
  }
} 