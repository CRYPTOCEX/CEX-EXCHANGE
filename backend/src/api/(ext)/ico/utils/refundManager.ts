import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { createNotification } from "@b/utils/notifications";

export async function checkAndProcessFailedOfferings(): Promise<void> {
  const transaction = await sequelize.transaction();
  
  try {
    const now = new Date();
    
    // Find offerings that ended and didn't reach soft cap
    const failedOfferings = await models.icoTokenOffering.findAll({
      where: {
        status: 'ACTIVE',
        endDate: { [Op.lt]: now },
      },
      include: [{
        model: models.icoTokenDetail,
        as: "tokenDetail",
      }],
      transaction,
    });

    for (const offering of failedOfferings) {
      // Calculate total raised
      const totalRaised = await models.icoTransaction.sum('amount', {
        where: {
          offeringId: offering.id,
          status: { [Op.in]: ['PENDING', 'VERIFICATION', 'RELEASED'] }
        },
        transaction,
      }) || 0;

      const softCap = offering.targetAmount * 0.3; // 30% soft cap
      
      if (totalRaised < softCap) {
        // Mark offering as failed
        await offering.update(
          { 
            status: 'FAILED',
            notes: JSON.stringify({
              failureReason: 'Soft cap not reached',
              totalRaised,
              softCap,
              failedAt: now.toISOString(),
            })
          },
          { transaction }
        );

        // Mark all pending transactions for refund
        await models.icoTransaction.update(
          { status: 'REFUND_PENDING' },
          {
            where: {
              offeringId: offering.id,
              status: { [Op.in]: ['PENDING', 'VERIFICATION'] }
            },
            transaction,
          }
        );

        // Notify offering owner
        await createNotification({
          userId: offering.userId,
          relatedId: offering.id,
          type: "system",
          title: "ICO Offering Failed",
          message: `${offering.name} failed to reach soft cap`,
          details: `Total raised: ${totalRaised} ${offering.purchaseWalletCurrency}\nSoft cap: ${softCap} ${offering.purchaseWalletCurrency}\nRefunds will be processed for all investors.`,
          link: `/ico/creator/token/${offering.id}`,
          actions: [
            {
              label: "Process Refunds",
              link: `/ico/creator/token/${offering.id}/refunds`,
              primary: true,
            },
          ],
        });

        // Notify all investors
        const investors = await models.icoTransaction.findAll({
          where: {
            offeringId: offering.id,
            status: 'REFUND_PENDING',
          },
          attributes: ['userId'],
          group: ['userId'],
          transaction,
        });

        for (const investor of investors) {
          await createNotification({
            userId: investor.userId,
            relatedId: offering.id,
            type: "investment",
            title: "ICO Investment Refund Available",
            message: `${offering.name} did not reach its funding goal`,
            details: `Your investment will be refunded. The ICO failed to reach its soft cap of ${softCap} ${offering.purchaseWalletCurrency}.`,
            link: `/ico/dashboard?tab=transactions`,
          });
        }

        // Create admin activity log
        await models.icoAdminActivity.create({
          type: "OFFERING_FAILED",
          offeringId: offering.id,
          offeringName: offering.name,
          adminId: null, // System action
          details: JSON.stringify({
            reason: 'Soft cap not reached',
            totalRaised,
            softCap,
            currency: offering.purchaseWalletCurrency,
            investorCount: investors.length,
          }),
        }, { transaction });
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error checking failed offerings:', error);
    throw error;
  }
}

export async function processAutomaticRefunds(): Promise<void> {
  const transaction = await sequelize.transaction();
  
  try {
    // Find all offerings marked for refund
    const refundableOfferings = await models.icoTokenOffering.findAll({
      where: {
        status: { [Op.in]: ['FAILED', 'CANCELLED'] },
      },
      transaction,
    });

    for (const offering of refundableOfferings) {
      // Check if refunds are already processed
      const pendingRefunds = await models.icoTransaction.count({
        where: {
          offeringId: offering.id,
          status: 'REFUND_PENDING',
        },
        transaction,
      });

      if (pendingRefunds === 0) continue;

      // Process refunds
      const pendingTransactions = await models.icoTransaction.findAll({
        where: {
          offeringId: offering.id,
          status: 'REFUND_PENDING',
        },
        transaction,
      });

      let refundedCount = 0;
      let totalRefunded = 0;

      for (const icoTransaction of pendingTransactions) {
        try {
          const refundAmount = icoTransaction.amount * icoTransaction.price;
          
          // Find user's wallet
          const wallet = await models.wallet.findOne({
            where: {
              userId: icoTransaction.userId,
              type: offering.purchaseWalletType,
              currency: offering.purchaseWalletCurrency,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          if (!wallet) continue;

          // Refund the amount
          await wallet.update(
            { balance: wallet.balance + refundAmount },
            { transaction }
          );

          // Update transaction status
          await icoTransaction.update(
            { 
              status: 'REFUNDED',
              notes: JSON.stringify({
                ...JSON.parse(icoTransaction.notes || '{}'),
                refund: {
                  amount: refundAmount,
                  reason: 'Automatic refund - offering failed',
                  processedAt: new Date().toISOString(),
                  processedBy: 'SYSTEM',
                }
              })
            },
            { transaction }
          );

          // Create wallet transaction record
          await models.transaction.create({
            userId: icoTransaction.userId,
            walletId: wallet.id,
            type: "ICO_REFUND",
            status: "COMPLETED",
            amount: refundAmount,
            fee: 0,
            description: `Automatic ICO Refund: ${offering.name}`,
            referenceId: icoTransaction.id,
          }, { transaction });

          refundedCount++;
          totalRefunded += refundAmount;
        } catch (error) {
          console.error(`Failed to refund transaction ${icoTransaction.id}:`, error);
        }
      }

      // Update offering status if all refunds processed
      if (refundedCount === pendingTransactions.length) {
        await offering.update(
          { 
            status: 'REFUNDED',
            notes: JSON.stringify({
              ...JSON.parse(offering.notes || '{}'),
              automaticRefund: {
                refundedAt: new Date().toISOString(),
                refundedCount,
                totalRefunded,
              }
            })
          },
          { transaction }
        );
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error processing automatic refunds:', error);
    throw error;
  }
}