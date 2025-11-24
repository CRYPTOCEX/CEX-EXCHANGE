import { models } from '@b/db'
import { createError } from '@b/utils/error'
import {
  validatePaystackConfig,
  makePaystackRequest,
  mapPaystackStatus,
  parsePaystackAmount,
  PaystackVerifyResponse,
  PaystackError
} from './utils'

export const metadata = {
  summary: 'Checks Paystack payment status',
  description: 'Queries current payment status from Paystack and updates local transaction records',
  operationId: 'checkPaystackPaymentStatus',
  tags: ['Finance', 'Deposit', 'Paystack'],
  requiresAuth: true,
  parameters: [
    {
      name: 'reference',
      in: 'query',
      required: true,
      schema: {
        type: 'string',
        description: 'Payment reference to check',
      },
    },
  ],
  responses: {
    200: {
      description: 'Payment status retrieved successfully',
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
                  status: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  gateway: { type: 'string' },
                  gateway_response: { type: 'string' },
                  paid_at: { type: 'string' },
                  channel: { type: 'string' },
                  fees: { type: 'number' },
                  authorization_url: { type: 'string' },
                  expired: { type: 'boolean' },
                  expires_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request - Invalid parameters',
    },
    401: {
      description: 'Unauthorized',
    },
    404: {
      description: 'Transaction not found',
    },
    500: {
      description: 'Internal server error',
    },
  },
}

export default async (data: Handler) => {
  const { user, query } = data
  const { reference } = query

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'User not authenticated',
    })
  }

  if (!reference) {
    throw createError({
      statusCode: 400,
      message: 'Payment reference is required',
    })
  }

  try {
    // Validate Paystack configuration
    validatePaystackConfig()

    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        id: reference,
        userId: user.id,
      },
    })

    if (!transaction) {
      throw createError({
        statusCode: 404,
        message: 'Transaction not found',
      })
    }

    // Parse existing metadata
    const metadata = JSON.parse(transaction.metadata || '{}')
    const authorizationUrl = metadata.authorization_url || ''

    // Check if transaction is expired (1 hour timeout)
    const createdAt = new Date(transaction.createdAt)
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const isExpired = createdAt < oneHourAgo && transaction.status === 'PENDING'

    // If transaction is in final state, return cached data
    if (['COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(transaction.status) || isExpired) {
      return {
        success: true,
        data: {
          transaction_id: transaction.id,
          reference: reference,
          status: isExpired ? 'EXPIRED' : transaction.status,
          amount: transaction.amount,
          currency: transaction.currency,
          gateway: 'paystack',
          gateway_response: metadata.gateway_response || 'N/A',
          paid_at: metadata.paid_at || null,
          channel: metadata.channel || 'unknown',
          fees: transaction.fee || 0,
          authorization_url: authorizationUrl,
          expired: isExpired,
          expires_at: new Date(createdAt.getTime() + 60 * 60 * 1000).toISOString(),
        },
      }
    }

    // Query current status from Paystack
    try {
      const verifyResponse = await makePaystackRequest<PaystackVerifyResponse>(
        `/transaction/verify/${reference}`,
        {
          method: 'GET',
        }
      )

      if (verifyResponse.status && verifyResponse.data) {
        const paystackTransaction = verifyResponse.data
        const newStatus = mapPaystackStatus(paystackTransaction.status)
        const actualAmount = parsePaystackAmount(paystackTransaction.amount, paystackTransaction.currency)
        const gatewayFees = parsePaystackAmount(paystackTransaction.fees || 0, paystackTransaction.currency)

        // Update transaction if status changed
        if (newStatus !== transaction.status) {
          await transaction.update({
            status: newStatus,
            referenceId: paystackTransaction.reference,
            fee: gatewayFees,
            metadata: JSON.stringify({
              ...metadata,
              paystack_transaction_id: paystackTransaction.id,
              paystack_status: paystackTransaction.status,
              gateway_response: paystackTransaction.gateway_response,
              paid_at: paystackTransaction.paid_at,
              channel: paystackTransaction.channel,
              authorization: paystackTransaction.authorization,
              customer: paystackTransaction.customer,
              fees_breakdown: paystackTransaction.fees_breakdown,
              status_checked_at: new Date().toISOString(),
            }),
          })

          // If payment completed, update wallet
          if (newStatus === 'COMPLETED' && transaction.status !== 'COMPLETED') {
            const wallet = await models.wallet.findOne({
              where: {
                userId: user.id,
                currency: transaction.currency,
              },
            })

            if (wallet) {
              await wallet.update({
                balance: wallet.balance + transaction.amount,
              })
            } else {
              await models.wallet.create({
                userId: user.id,
                currency: transaction.currency,
                type: 'FIAT',
                balance: transaction.amount,
              })
            }
          }
        }

        return {
          success: true,
          data: {
            transaction_id: transaction.id,
            reference: reference,
            status: newStatus,
            amount: actualAmount,
            currency: paystackTransaction.currency,
            gateway: 'paystack',
            gateway_response: paystackTransaction.gateway_response,
            paid_at: paystackTransaction.paid_at,
            channel: paystackTransaction.channel,
            fees: gatewayFees,
            authorization_url: authorizationUrl,
            expired: false,
            expires_at: new Date(createdAt.getTime() + 60 * 60 * 1000).toISOString(),
          },
        }
      }
    } catch (paystackError) {
      // If Paystack API fails, return current local status
      console.warn('Failed to check Paystack status:', paystackError)
    }

    // Return current local status if API call failed
    return {
      success: true,
      data: {
        transaction_id: transaction.id,
        reference: reference,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        gateway: 'paystack',
        gateway_response: metadata.gateway_response || 'Status check failed',
        paid_at: metadata.paid_at || null,
        channel: metadata.channel || 'unknown',
        fees: transaction.fee || 0,
        authorization_url: authorizationUrl,
        expired: isExpired,
        expires_at: new Date(createdAt.getTime() + 60 * 60 * 1000).toISOString(),
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
      message: 'Failed to check payment status',
    })
  }
} 