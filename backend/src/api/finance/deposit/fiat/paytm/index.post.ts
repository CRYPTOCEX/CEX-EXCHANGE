import { models } from '@b/db'
import { createError } from '@b/utils/error'
import {
  validatePaytmConfig,
  isCurrencySupported,
  formatPaytmAmount,
  generatePaytmOrderId,
  generateChecksumHash,
  makePaytmRequest,
  buildCallbackUrl,
  getAvailablePaymentMethods,
  getPaymentMethodDisplayName,
  getCurrencyInfo,
  getSupportedChannels,
  calculatePaytmFees,
  PaytmTransactionRequest,
  PaytmInitializeResponse,
  PaytmError,
  PAYTM_CONFIG
} from './utils'

export const metadata = {
  summary: 'Creates a Paytm payment session',
  description: 'Initializes a payment with Paytm and returns transaction token for comprehensive payment methods including UPI, cards, net banking, wallets, and EMI across India and international markets',
  operationId: 'createPaytmPayment',
  tags: ['Finance', 'Deposit', 'Paytm'],
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
              enum: ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'JPY', 'CNY', 'CHF', 'QAR'],
              example: 'INR',
            },
            paymentModes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Preferred payment modes',
              example: ['upi', 'card', 'netbanking'],
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
      description: 'Paytm payment session created successfully',
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
                  order_id: { type: 'string' },
                  txn_token: { type: 'string' },
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
                  callback_url: { type: 'string' },
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
  const { amount, currency, paymentModes, metadata = {} } = body

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
    // Validate Paytm configuration
    validatePaytmConfig()

    // Check if currency is supported
    if (!isCurrencySupported(currencyCode)) {
      throw createError({
        statusCode: 400,
        message: `Currency ${currencyCode} is not supported by Paytm. Supported currencies: INR, USD, EUR, GBP, AUD, CAD, SGD, AED, JPY, CNY, CHF, QAR`,
      })
    }

    // Get gateway configuration
    const gateway = await models.depositGateway.findOne({
      where: { alias: 'paytm' },
    })

    if (!gateway || !gateway.status) {
      throw createError({
        statusCode: 400,
        message: 'Paytm payment gateway is not available',
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

    // Validate amount limits
    const minAmounts = JSON.parse(gateway.minAmount || '{}')
    const maxAmounts = JSON.parse(gateway.maxAmount || '{}')
    const minAmount = minAmounts[currencyCode] || 1.00
    const maxAmount = maxAmounts[currencyCode] || 10000000.00

    if (amount < minAmount) {
      throw createError({
        statusCode: 400,
        message: `Minimum amount is ${minAmount} ${currencyCode}`,
      })
    }

    if (amount > maxAmount) {
      throw createError({
        statusCode: 400,
        message: `Maximum amount is ${maxAmount} ${currencyCode}`,
      })
    }

    // Generate order ID
    const orderId = generatePaytmOrderId()
    const formattedAmount = formatPaytmAmount(amount, currencyCode)

    // Get currency and payment method information
    const currencyInfo = getCurrencyInfo(currencyCode)
    const availableMethods = getAvailablePaymentMethods(currencyCode)
    const supportedChannels = getSupportedChannels(currencyCode)
    const feesInfo = calculatePaytmFees(amount, currencyCode)

    // Create transaction record
    const transaction = await models.transaction.create({
      uuid: orderId,
      userId: user.id,
      type: 'DEPOSIT',
      status: 'PENDING',
      amount: amount,
      fee: feesInfo.fees,
      description: `Paytm deposit of ${amount} ${currencyCode}`,
      metadata: JSON.stringify({
        gateway: 'paytm',
        currency: currencyCode,
        orderId: orderId,
        region: currencyInfo?.region || 'Unknown',
        availableMethods: availableMethods,
        ...metadata,
      }),
    })

    // Prepare Paytm transaction request
    const paytmRequest = {
      body: {
        requestType: 'Payment',
        mid: PAYTM_CONFIG.MID,
        websiteName: PAYTM_CONFIG.WEBSITE,
        orderId: orderId,
        txnAmount: {
          value: formattedAmount,
          currency: currencyCode,
        },
        userInfo: {
          custId: user.id.toString(),
          email: user.email || '',
          mobile: user.phone || '',
        },
        callbackUrl: buildCallbackUrl(),
        enablePaymentMode: paymentModes && paymentModes.length > 0 ? paymentModes : availableMethods,
      }
    }

    // Generate checksum
    const checksum = generateChecksumHash(paytmRequest.body, PAYTM_CONFIG.MERCHANT_KEY)
    paytmRequest.body['checksumHash'] = checksum

    // Make API request to Paytm
    const paytmResponse = await makePaytmRequest<PaytmInitializeResponse>(
      '/theia/api/v1/initiateTransaction',
      {
        method: 'POST',
        body: paytmRequest,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    // Update transaction with Paytm response
    await transaction.update({
      referenceId: paytmResponse.body.txnToken,
      metadata: JSON.stringify({
        ...JSON.parse(transaction.metadata || '{}'),
        txnToken: paytmResponse.body.txnToken,
        paytmResponse: paytmResponse.body,
      }),
    })

    // Prepare available methods for response
    const availableMethodsDisplay = availableMethods.reduce((acc, method) => {
      acc[method] = getPaymentMethodDisplayName(method)
      return acc
    }, {} as Record<string, string>)

    return {
      success: true,
      data: {
        transaction_id: transaction.uuid,
        order_id: orderId,
        txn_token: paytmResponse.body.txnToken,
        status: 'PENDING',
        gateway: 'paytm',
        amount: amount,
        currency: currencyCode,
        region: currencyInfo?.region || 'Unknown',
        available_methods: availableMethodsDisplay,
        supported_channels: supportedChannels,
        fees_info: feesInfo,
        callback_url: buildCallbackUrl(),
        paytm_config: {
          mid: PAYTM_CONFIG.MID,
          website: PAYTM_CONFIG.WEBSITE,
          industry_type: PAYTM_CONFIG.INDUSTRY_TYPE,
          is_sandbox: PAYTM_CONFIG.SANDBOX,
        },
      },
    }
  } catch (error) {
    if (error instanceof PaytmError) {
      throw createError({
        statusCode: error.status,
        message: error.message,
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to create Paytm payment session',
    })
  }
} 