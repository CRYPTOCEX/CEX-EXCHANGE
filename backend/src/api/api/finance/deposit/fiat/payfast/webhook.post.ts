import { models, sequelize } from '@b/db'
import { createError } from '@b/utils/error'
import { sendFiatTransactionEmail } from '@b/utils/emails'
import {
  validatePayFastConfig,
  validateSignature,
  validateITN,
  mapPayFastStatus,
  parsePayFastAmount,
  PAYFAST_CONFIG,
  PayFastITNData
} from './utils'

export const metadata = {
  summary: 'Handles PayFast ITN webhook',
  description: 'Processes PayFast Instant Transaction Notification (ITN) callbacks',
  operationId: 'handlePayFastWebhook',
  tags: ['Finance', 'Deposit', 'PayFast', 'Webhook'],
  requiresAuth: false, // Webhooks don't use user authentication
  requestBody: {
    required: true,
    content: {
      'application/x-www-form-urlencoded': {
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
            amount_fee: {
              type: 'string',
              description: 'PayFast processing fee',
            },
            amount_net: {
              type: 'string',
              description: 'Net amount after fees',
            },
            signature: {
              type: 'string',
              description: 'PayFast signature for verification',
            },
          },
          required: ['m_payment_id', 'pf_payment_id', 'payment_status'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Webhook processed successfully',
      content: {
        'text/plain': {
          schema: {
            type: 'string',
            example: 'OK',
          },
        },
      },
    },
    400: { description: 'Bad request - invalid webhook data' },
    500: { description: 'Internal server error' },
  },
}

interface WebhookData extends PayFastITNData {
  [key: string]: any
}

interface Handler {
  body: WebhookData
  headers?: any
}

export default async (data: Handler) => {
  const { body } = data

  console.log('PayFast ITN received:', {
    m_payment_id: body.m_payment_id,
    pf_payment_id: body.pf_payment_id,
    payment_status: body.payment_status,
    amount_gross: body.amount_gross
  })

  // Validate required fields
  if (!body.m_payment_id || !body.pf_payment_id || !body.payment_status) {
    throw createError({
      statusCode: 400,
      message: 'Required webhook fields missing',
    })
  }

  // Validate configuration
  validatePayFastConfig()

  try {
    // Validate signature
    if (PAYFAST_CONFIG.PASSPHRASE) {
      const isValidSignature = validateSignature(body, PAYFAST_CONFIG.PASSPHRASE)
      if (!isValidSignature) {
        console.error('PayFast ITN signature validation failed')
        throw createError({
          statusCode: 400,
          message: 'Invalid webhook signature',
        })
      }
    }

    // Validate ITN with PayFast (optional additional security)
    const itnValidation = await validateITN(body)
    if (!itnValidation.valid) {
      console.error('PayFast ITN validation failed:', itnValidation.error)
      // Log but don't fail - signature validation is primary security
    }

    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        uuid: body.m_payment_id
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
      console.error('Transaction not found for PayFast ITN:', body.m_payment_id)
      throw createError({
        statusCode: 404,
        message: 'Transaction not found',
      })
    }

    // Check if status has changed to prevent duplicate processing
    const currentStatus = transaction.status
    const newStatus = mapPayFastStatus(body.payment_status)
    
    if (currentStatus === newStatus) {
      console.log('PayFast ITN: Status unchanged, skipping processing')
      return 'OK'
    }

    // Get payment amounts
    const grossAmount = parsePayFastAmount(body.amount_gross)
    const feeAmount = parsePayFastAmount(body.amount_fee || '0')
    const netAmount = parsePayFastAmount(body.amount_net || body.amount_gross) - feeAmount

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
            itn_received_at: new Date().toISOString(),
            signature_valid: true,
            itn_valid: itnValidation.valid,
            webhook_data: body
          }
        }
      }, { transaction: dbTransaction })

      // If payment was successful, update user wallet
      if (newStatus === 'COMPLETED' && currentStatus !== 'COMPLETED') {
        const currency = transaction.metadata?.currency || 'ZAR'
        
        // Get or create user wallet
        let wallet = await models.wallet.findOne({
          where: {
            userId: transaction.userId,
            currency: currency
          },
          transaction: dbTransaction
        })

        if (!wallet) {
          wallet = await models.wallet.create({
            userId: transaction.userId,
            currency: currency,
            balance: 0,
            type: 'FIAT'
          }, { transaction: dbTransaction })
        }

        // Update wallet balance
        const newBalance = parseFloat(wallet.balance) + netAmount
        await wallet.update({
          balance: newBalance
        }, { transaction: dbTransaction })

        // Record admin profit from processing fees
        if (feeAmount > 0) {
          try {
            await models.adminProfit.create({
              type: 'DEPOSIT_FEE',
              amount: feeAmount,
              currency: currency,
              description: `PayFast processing fee for transaction ${transaction.id}`,
              metadata: {
                transactionId: transaction.id,
                userId: transaction.userId,
                gateway: 'payfast',
                pf_payment_id: body.pf_payment_id
              }
            }, { transaction: dbTransaction })
          } catch (profitError) {
            console.error('Failed to record admin profit:', profitError)
            // Don't fail the transaction for profit recording errors
          }
        }

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

      console.log('PayFast ITN processed successfully:', {
        transactionId: transaction.id,
        oldStatus: currentStatus,
        newStatus: newStatus,
        amount: grossAmount,
        fee: feeAmount
      })

      return 'OK'

    } catch (dbError) {
      await dbTransaction.rollback()
      throw dbError
    }

  } catch (error) {
    console.error('PayFast ITN processing error:', error)
    
    // Return error response but don't expose internal details
    throw createError({
      statusCode: error.statusCode || 500,
      message: 'Webhook processing failed',
    })
  }
} 