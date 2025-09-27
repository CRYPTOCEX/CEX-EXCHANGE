import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { createNotification } from "@b/utils/notifications";

export interface PhaseInfo {
  id: string;
  name: string;
  tokenPrice: number;
  allocation: number;
  remaining: number;
  duration: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  index: number;
}

export async function getCurrentPhase(offeringId: string, transaction?: any): Promise<PhaseInfo | null> {
  const offering = await models.icoTokenOffering.findByPk(offeringId, { transaction });
  if (!offering) return null;

  const phases = await models.icoTokenOfferingPhase.findAll({
    where: { offeringId },
    order: [['createdAt', 'ASC']],
    transaction,
  });

  if (phases.length === 0) return null;

  const now = new Date();
  let currentDate = new Date(offering.startDate);
  
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const phaseEndDate = new Date(currentDate);
    phaseEndDate.setDate(phaseEndDate.getDate() + phase.duration);
    
    if (now >= currentDate && now < phaseEndDate && phase.remaining > 0) {
      return {
        id: phase.id,
        name: phase.name,
        tokenPrice: phase.tokenPrice,
        allocation: phase.allocation,
        remaining: phase.remaining,
        duration: phase.duration,
        startDate: currentDate,
        endDate: phaseEndDate,
        isActive: true,
        index: i,
      };
    }
    
    currentDate = phaseEndDate;
  }
  
  return null;
}

export async function getNextPhase(offeringId: string, currentPhaseIndex: number, transaction?: any): Promise<PhaseInfo | null> {
  const offering = await models.icoTokenOffering.findByPk(offeringId, { transaction });
  if (!offering) return null;

  const phases = await models.icoTokenOfferingPhase.findAll({
    where: { offeringId },
    order: [['createdAt', 'ASC']],
    transaction,
  });

  if (currentPhaseIndex + 1 >= phases.length) return null;

  const currentDate = new Date(offering.startDate);
  for (let i = 0; i <= currentPhaseIndex + 1; i++) {
    const phase = phases[i];
    
    if (i === currentPhaseIndex + 1) {
      const phaseEndDate = new Date(currentDate);
      phaseEndDate.setDate(phaseEndDate.getDate() + phase.duration);
      
      return {
        id: phase.id,
        name: phase.name,
        tokenPrice: phase.tokenPrice,
        allocation: phase.allocation,
        remaining: phase.remaining,
        duration: phase.duration,
        startDate: currentDate,
        endDate: phaseEndDate,
        isActive: false,
        index: i,
      };
    }
    
    currentDate.setDate(currentDate.getDate() + phase.duration);
  }
  
  return null;
}

export async function checkAndUpdateOfferingStatus(): Promise<void> {
  const transaction = await sequelize.transaction();
  
  try {
    // Find all active offerings
    const activeOfferings = await models.icoTokenOffering.findAll({
      where: { 
        status: 'ACTIVE',
        endDate: { [Op.lte]: new Date() }
      },
      transaction,
    });

    // Update offerings that have ended
    for (const offering of activeOfferings) {
      const totalRaised = await models.icoTransaction.sum('amount', {
        where: {
          offeringId: offering.id,
          status: { [Op.in]: ['PENDING', 'VERIFICATION', 'RELEASED'] }
        },
        transaction,
      }) || 0;

      const status = totalRaised >= offering.targetAmount * 0.75 ? 'SUCCESS' : 'FAILED';
      
      await offering.update({ status }, { transaction });

      // Notify the creator
      await createNotification({
        userId: offering.userId,
        relatedId: offering.id,
        type: "system",
        title: "ICO Offering Ended",
        message: `Your ICO offering "${offering.name}" has ended with status: ${status}`,
        details: `Total raised: ${totalRaised} ${offering.purchaseWalletCurrency} (Target: ${offering.targetAmount})`,
        link: `/ico/creator/token/${offering.id}`,
      });

      // If failed, prepare for refunds
      if (status === 'FAILED') {
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
      }
    }

    // Find upcoming offerings that should start
    const upcomingOfferings = await models.icoTokenOffering.findAll({
      where: { 
        status: 'UPCOMING',
        startDate: { [Op.lte]: new Date() }
      },
      transaction,
    });

    // Activate offerings that should start
    for (const offering of upcomingOfferings) {
      await offering.update({ status: 'ACTIVE' }, { transaction });

      // Notify the creator
      await createNotification({
        userId: offering.userId,
        relatedId: offering.id,
        type: "system",
        title: "ICO Offering Started",
        message: `Your ICO offering "${offering.name}" is now active!`,
        link: `/ico/creator/token/${offering.id}`,
      });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating offering statuses:', error);
    throw error;
  }
}

export async function transitionToNextPhase(offeringId: string): Promise<boolean> {
  const transaction = await sequelize.transaction();
  
  try {
    const currentPhase = await getCurrentPhase(offeringId, transaction);
    if (!currentPhase) return false;

    const nextPhase = await getNextPhase(offeringId, currentPhase.index, transaction);
    if (!nextPhase) return false;

    const offering = await models.icoTokenOffering.findByPk(offeringId, { transaction });
    if (!offering) return false;

    // Update offering with new phase price
    await offering.update(
      { tokenPrice: nextPhase.tokenPrice },
      { transaction }
    );

    // Create admin activity log
    await models.icoAdminActivity.create(
      {
        type: "PHASE_TRANSITION",
        offeringId: offering.id,
        offeringName: offering.name,
        adminId: null, // System action
        details: JSON.stringify({
          fromPhase: currentPhase.name,
          toPhase: nextPhase.name,
          oldPrice: currentPhase.tokenPrice,
          newPrice: nextPhase.tokenPrice,
        }),
      },
      { transaction }
    );

    // Notify creator
    await createNotification({
      userId: offering.userId,
      relatedId: offering.id,
      type: "system",
      title: "ICO Phase Transition",
      message: `${offering.name} has moved to phase: ${nextPhase.name}`,
      details: `New token price: ${nextPhase.tokenPrice} ${offering.purchaseWalletCurrency}`,
      link: `/ico/creator/token/${offering.id}`,
    });

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error('Error transitioning phase:', error);
    return false;
  }
}

// Function to check if soft cap is reached
export async function checkSoftCap(offeringId: string): Promise<boolean> {
  const offering = await models.icoTokenOffering.findByPk(offeringId);
  if (!offering) return false;

  const totalRaised = await models.icoTransaction.sum('amount', {
    where: {
      offeringId: offering.id,
      status: { [Op.in]: ['PENDING', 'VERIFICATION', 'RELEASED'] }
    }
  }) || 0;

  // Soft cap is typically 30% of target
  const softCap = offering.targetAmount * 0.3;
  return totalRaised >= softCap;
}

// Function to check if hard cap is reached
export async function checkHardCap(offeringId: string): Promise<boolean> {
  const offering = await models.icoTokenOffering.findByPk(offeringId);
  if (!offering) return false;

  const totalRaised = await models.icoTransaction.sum('amount', {
    where: {
      offeringId: offering.id,
      status: { [Op.in]: ['PENDING', 'VERIFICATION', 'RELEASED'] }
    }
  }) || 0;

  return totalRaised >= offering.targetAmount;
}