import { models, sequelize } from '@b/db'
import { createError } from '@b/utils/error'
import { sendFiatTransactionEmail } from '@b/utils/emails'
import {
  validatePayFastConfig,
  validateSignature,
  mapPayFastStatus,
  parsePayFastAmount,
  PAYFAST_CONFIG,
  PayFastITNData
} from './utils'

export const metadata = {
  summary: 'Verifies PayFast payment return',
  description: 'Handles PayFast return URL verification after payment completion',
  operationId: 'verifyPayFastPayment',
  tags: ['Finance', 'Deposit', 'PayFast'],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            m_payment_id: {
              type: 'string',
              description: 'Merchant payment ID',
            },
            pf_payment_id: {
              type: 'string',
              description: 'PayFast payment ID',
            },
            payment_status: {
              type: 'string',
              description: 'Payment status from PayFast',
            },
            amount_gross: {
              type: 'string',
              description: 'Gross payment amount',
            },
            signature: {
              type: 'string',
              description: 'PayFast signature for verification',
            },
          },
          required: ['m_payment_id', 'payment_status'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Payment verification completed',
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
                  verified: { type: 'boolean' },
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

interface RequestBody {
  m_payment_id: string
  pf_payment_id?: string
  payment_status: string
  amount_gross?: string
  amount_fee?: string
  amount_net?: string
  signature?: string
  [key: string]: any
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
  if (!body.m_payment_id || !body.payment_status) {
    throw createError({
      statusCode: 400,
      message: 'Payment ID and status are required',
    })
  }

  // Validate configuration
  validatePayFastConfig()

  try {
    // Find the transaction by reference
    const transaction = await models.transaction.findOne({
      where: {
        uuid: body.m_payment_id,
        userId: user.id,
        status: 'PENDING'
      },
      include: [
        {
          model: models.user,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName']
        }
      ]
    })

    if (!transaction) {
      throw createError({
        statusCode: 404,
        message: 'Transaction not found or already processed',
      })
    }

    // Validate signature if provided
    if (body.signature && PAYFAST_CONFIG.PASSPHRASE) {
      const isValidSignature = validateSignature(body, PAYFAST_CONFIG.PASSPHRASE)
      if (!isValidSignature) {
        throw createError({
          statusCode: 400,
          message: 'Invalid payment signature',
        })
      }
    }

    // Map PayFast status to our status
    const newStatus = mapPayFastStatus(body.payment_status)
    
    // Get payment amounts
    const grossAmount = body.amount_gross ? parsePayFastAmount(body.amount_gross) : transaction.amount
    const feeAmount = body.amount_fee ? parsePayFastAmount(body.amount_fee) : 0
    const netAmount = body.amount_net ? parsePayFastAmount(body.amount_net) : grossAmount - feeAmount

    // Start database transaction
    const dbTransaction = await sequelize.transaction()

    try {
      // Update transaction status and metadata
      await transaction.update({
        status: newStatus,
        fee: feeAmount,
        metadata: {
          ...transaction.metadata,
          payfast: {
            ...transaction.metadata?.payfast,
            pf_payment_id: body.pf_payment_id,
            payment_status: body.payment_status,
            amount_gross: grossAmount,
            amount_fee: feeAmount,
            amount_net: netAmount,
            verified_at: new Date().toISOString(),
            signature_valid: !!body.signature,
            return_data: body
          }
        }
      }, { transaction: dbTransaction })

      // If payment was successful, update user wallet
      if (newStatus === 'COMPLETED') {
        // Get user's wallet for the currency
        const currency = transaction.metadata?.currency || 'ZAR'
        
        let wallet = await models.wallet.findOne({
          where: {
            userId: user.id,
            currency: currency
          },
          transaction: dbTransaction
        })

        // Create wallet if it doesn't exist
        if (!wallet) {
          wallet = await models.wallet.create({
            userId: user.id,
            currency: currency,
            balance: 0,
            type: 'FIAT'
          }, { transaction: dbTransaction })
        }

        // Update wallet balance with net amount (after fees)
        const newBalance = parseFloat(wallet.balance) + netAmount
        await wallet.update({
          balance: newBalance
        }, { transaction: dbTransaction })

        // Send confirmation email
        try {
          await sendFiatTransactionEmail(
            transaction.user,
            transaction,
            currency,
            newBalance
          )
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError)
          // Don't fail the transaction for email errors
        }
      }

      // Commit the database transaction
      await dbTransaction.commit()

      return {
        success: true,
        data: {
          transactionId: transaction.id,
          status: newStatus,
          amount: grossAmount,
          currency: transaction.metadata?.currency || 'ZAR',
          paymentId: body.pf_payment_id || body.m_payment_id,
          verified: true,
          fee: feeAmount,
          netAmount: netAmount
        }
      }

    } catch (dbError) {
      await dbTransaction.rollback()
      throw dbError
    }

  } catch (error) {
    console.error('PayFast verification error:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to verify PayFast payment',
    })
  }
} 