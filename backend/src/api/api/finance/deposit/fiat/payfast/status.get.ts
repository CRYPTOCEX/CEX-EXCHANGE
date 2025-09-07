import { models } from '@b/db'
import { createError } from '@b/utils/error'
import {
  validatePayFastConfig,
  mapPayFastStatus,
  parsePayFastAmount,
  PAYFAST_CONFIG,
  getPayFastHost
} from './utils'

export const metadata = {
  summary: 'Check PayFast payment status',
  description: 'Queries current payment status from PayFast and updates local records',
  operationId: 'checkPayFastStatus',
  tags: ['Finance', 'Deposit', 'PayFast'],
  requiresAuth: true,
  parameters: [
    {
      name: 'transactionId',
      in: 'query',
      required: true,
      schema: {
        type: 'string',
        description: 'Transaction ID to check',
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
                  transactionId: { type: 'string' },
                  status: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  paymentId: { type: 'string' },
                  reference: { type: 'string' },
                  updated: { type: 'boolean' },
                  paymentUrl: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    400: { description: 'Bad request - invalid parameters' },
    401: { description: 'Unauthorized' },
    404: { description: 'Transaction not found' },
    500: { description: 'Internal server error' },
  },
}

interface QueryParams {
  transactionId: string
}

interface Handler {
  query: QueryParams
  user?: any
}

export default async (data: Handler) => {
  const { query, user } = data

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
  }

  // Validate required fields
  if (!query.transactionId) {
    throw createError({
      statusCode: 400,
      message: 'Transaction ID is required',
    })
  }

  // Validate configuration
  validatePayFastConfig()

  try {
    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        id: query.transactionId,
        userId: user.id
      }
    })

    if (!transaction) {
      throw createError({
        statusCode: 404,
        message: 'Transaction not found',
      })
    }

    // Get PayFast payment data from transaction metadata
    const payfastData = transaction.metadata?.payfast
    if (!payfastData || !payfastData.pf_payment_id) {
      // If no PayFast payment ID, return current status
      return {
        success: true,
        data: {
          transactionId: transaction.id,
          status: transaction.status,
          amount: transaction.amount,
          currency: transaction.metadata?.currency || 'ZAR',
          paymentId: payfastData?.m_payment_id || transaction.uuid,
          reference: transaction.uuid,
          updated: false,
          paymentUrl: null
        }
      }
    }

    let statusUpdated = false
    let currentStatus = transaction.status
    let paymentUrl: string | null = null
    const createdAt = new Date(transaction.createdAt)

    try {
      // Query PayFast for payment status
      // Note: PayFast doesn't have a direct status API, so we rely on ITN notifications
      // This endpoint mainly serves to return current status and provide payment URLs
      
      // For active payments, we can construct the payment URL
      if (currentStatus === 'PENDING') {
        paymentUrl = `https://${getPayFastHost()}/eng/process`
      }

      // Check if payment has expired (PayFast payments typically expire after 1 hour)
      const now = new Date()
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      
      if (currentStatus === 'PENDING' && hoursDiff > 1) {
        // Mark as expired if it's been more than 1 hour
        await transaction.update({
          status: 'EXPIRED',
          metadata: {
            ...transaction.metadata,
            payfast: {
              ...payfastData,
              expired_at: new Date().toISOString(),
              expiry_reason: 'Payment session timeout'
            }
          }
        })
        
        currentStatus = 'EXPIRED'
        statusUpdated = true
        paymentUrl = null
      }

    } catch (apiError) {
      console.error('PayFast status check error:', apiError)
      // Continue with local status if API fails
    }

    return {
      success: true,
      data: {
        transactionId: transaction.id,
        status: currentStatus,
        amount: transaction.amount,
        currency: transaction.metadata?.currency || 'ZAR',
        paymentId: payfastData.pf_payment_id || payfastData.m_payment_id,
        reference: transaction.uuid,
        updated: statusUpdated,
        paymentUrl: paymentUrl,
        metadata: {
          gateway: 'payfast',
          createdAt: transaction.createdAt,
          lastUpdated: transaction.updatedAt,
          merchantId: payfastData.merchant_id,
          paymentForm: payfastData.payment_form,
          expiresAt: new Date(createdAt.getTime() + 60 * 60 * 1000).toISOString() // 1 hour from creation
        }
      }
    }

  } catch (error) {
    console.error('PayFast status check error:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to check PayFast payment status',
    })
  }
} 