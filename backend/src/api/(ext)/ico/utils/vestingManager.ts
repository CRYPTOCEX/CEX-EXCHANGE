import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { createNotification } from "@b/utils/notifications";

export interface VestingSchedule {
  type: "LINEAR" | "CLIFF" | "MILESTONE";
  startDate: Date;
  endDate: Date;
  cliffDuration?: number; // Days
  milestones?: Array<{
    date: Date;
    percentage: number;
  }>;
}

export async function createVestingSchedule(
  transactionId: string,
  schedule: VestingSchedule
): Promise<any> {
  const transaction = await sequelize.transaction();
  
  try {
    // Find the ICO transaction
    const icoTransaction = await models.icoTransaction.findByPk(transactionId, {
      include: [{
        model: models.icoTokenOffering,
        as: "offering",
      }],
      transaction,
    });
    
    if (!icoTransaction) {
      throw new Error("Transaction not found");
    }

    // Calculate release schedule based on type
    let releaseSchedule: Array<{
      date: Date;
      percentage: number;
      amount: number;
    }> | null = null;
    if (schedule.type === "MILESTONE" && schedule.milestones) {
      releaseSchedule = schedule.milestones.map(m => ({
        date: m.date,
        percentage: m.percentage,
        amount: icoTransaction.amount * (m.percentage / 100),
      }));
    }

    // Create vesting record
    const vesting = await models.icoTokenVesting.create({
      transactionId: icoTransaction.id,
      userId: icoTransaction.userId,
      offeringId: icoTransaction.offeringId,
      totalAmount: icoTransaction.amount,
      releasedAmount: 0,
      vestingType: schedule.type,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      cliffDuration: schedule.cliffDuration,
      releaseSchedule,
      status: "ACTIVE",
    }, { transaction });

    // Create initial release records for milestones
    if (schedule.type === "MILESTONE" && releaseSchedule) {
      for (const milestone of releaseSchedule) {
        await models.icoTokenVestingRelease.create({
          vestingId: vesting.id,
          amount: milestone.amount,
          releaseDate: milestone.date,
          status: "PENDING",
        }, { transaction });
      }
    }

    await transaction.commit();
    return vesting;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function calculateVestedAmount(vestingId: string): Promise<number> {
  const vesting = await models.icoTokenVesting.findByPk(vestingId);
  if (!vesting) return 0;

  const now = new Date();
  
  // If before start date, nothing is vested
  if (now < vesting.startDate) return 0;
  
  // If after end date, everything is vested
  if (now >= vesting.endDate) return vesting.totalAmount;

  switch (vesting.vestingType) {
    case "LINEAR":
      // Check cliff period
      if (vesting.cliffDuration) {
        const cliffEndDate = new Date(vesting.startDate);
        cliffEndDate.setDate(cliffEndDate.getDate() + vesting.cliffDuration);
        if (now < cliffEndDate) return 0;
      }

      // Calculate linear vesting
      const totalDuration = vesting.endDate.getTime() - vesting.startDate.getTime();
      const elapsed = now.getTime() - vesting.startDate.getTime();
      const percentage = elapsed / totalDuration;
      return vesting.totalAmount * percentage;

    case "CLIFF":
      // All or nothing at cliff date
      const cliffDate = new Date(vesting.startDate);
      cliffDate.setDate(cliffDate.getDate() + (vesting.cliffDuration || 365));
      return now >= cliffDate ? vesting.totalAmount : 0;

    case "MILESTONE":
      // Sum up all milestones that have passed
      if (!vesting.releaseSchedule) return 0;
      
      let vestedAmount = 0;
      for (const milestone of vesting.releaseSchedule) {
        if (new Date(milestone.date) <= now) {
          vestedAmount += milestone.amount;
        }
      }
      return vestedAmount;

    default:
      return 0;
  }
}

export async function processVestingReleases(): Promise<void> {
  const transaction = await sequelize.transaction();
  
  try {
    const now = new Date();
    
    // Find all pending releases that are due
    const pendingReleases = await models.icoTokenVestingRelease.findAll({
      where: {
        status: "PENDING",
        releaseDate: { [Op.lte]: now },
      },
      include: [{
        model: models.icoTokenVesting,
        as: "vesting",
        where: { status: "ACTIVE" },
        include: [{
          model: models.icoTransaction,
          as: "transaction",
          include: [{
            model: models.icoTokenOffering,
            as: "offering",
          }],
        }],
      }],
      transaction,
    });

    for (const release of pendingReleases) {
      try {
        // Update release status
        await release.update(
          { status: "PROCESSING" },
          { transaction }
        );

        // Update vesting released amount
        await release.vesting.update(
          { releasedAmount: release.vesting.releasedAmount + release.amount },
          { transaction }
        );

        // Notify user
        await createNotification({
          userId: release.vesting.userId,
          relatedId: release.vesting.offeringId,
          type: "investment",
          title: "Vested Tokens Available",
          message: `${release.amount} ${release.vesting.transaction.offering.symbol} tokens are now available for release`,
          details: `Your vested tokens from ${release.vesting.transaction.offering.name} are ready to be claimed.`,
          link: `/ico/dashboard?tab=vesting`,
          actions: [
            {
              label: "Claim Tokens",
              link: `/ico/vesting/${release.vestingId}/claim`,
              primary: true,
            },
          ],
        });

        // Create audit log
        await models.icoAdminActivity.create({
          type: "VESTING_RELEASE",
          offeringId: release.vesting.offeringId,
          offeringName: release.vesting.transaction.offering.name,
          adminId: null, // System action
          details: JSON.stringify({
            vestingId: release.vestingId,
            releaseId: release.id,
            amount: release.amount,
            userId: release.vesting.userId,
          }),
        }, { transaction });

      } catch (error) {
        console.error(`Failed to process vesting release ${release.id}:`, error);
        await release.update(
          { 
            status: "FAILED",
            notes: error.message 
          },
          { transaction }
        );
      }
    }

    // Check for completed vestings
    const activeVestings = await models.icoTokenVesting.findAll({
      where: {
        status: "ACTIVE",
        endDate: { [Op.lte]: now },
      },
      transaction,
    });

    for (const vesting of activeVestings) {
      if (vesting.releasedAmount >= vesting.totalAmount) {
        await vesting.update(
          { status: "COMPLETED" },
          { transaction }
        );
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error processing vesting releases:', error);
    throw error;
  }
}

export async function claimVestedTokens(
  vestingId: string,
  userId: string,
  walletAddress: string,
  transactionHash: string
): Promise<void> {
  const transaction = await sequelize.transaction();
  
  try {
    // Find vesting and verify ownership
    const vesting = await models.icoTokenVesting.findOne({
      where: {
        id: vestingId,
        userId,
        status: "ACTIVE",
      },
      include: [{
        model: models.icoTokenVestingRelease,
        as: "releases",
        where: { status: "PROCESSING" },
      }],
      transaction,
    });

    if (!vesting) {
      throw new Error("Vesting not found or access denied");
    }

    // Update all processing releases to completed
    for (const release of vesting.releases) {
      await release.update(
        {
          status: "COMPLETED",
          transactionHash,
          notes: `Claimed to wallet: ${walletAddress}`,
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Send confirmation notification
    await createNotification({
      userId,
      relatedId: vesting.offeringId,
      type: "investment",
      title: "Vested Tokens Claimed",
      message: "Your vested tokens have been successfully claimed",
      details: `Transaction hash: ${transactionHash}`,
      link: `/ico/dashboard?tab=vesting`,
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getVestingScheduleForUser(userId: string): Promise<any[]> {
  const vestings = await models.icoTokenVesting.findAll({
    where: {
      userId,
      status: { [Op.in]: ["ACTIVE", "COMPLETED"] },
    },
    include: [
      {
        model: models.icoTokenVestingRelease,
        as: "releases",
      },
      {
        model: models.icoTransaction,
        as: "transaction",
        include: [{
          model: models.icoTokenOffering,
          as: "offering",
          attributes: ["name", "symbol"],
        }],
      },
    ],
    order: [["startDate", "ASC"]],
  });

  return await Promise.all(vestings.map(async v => {
    const vestedAmount = await calculateVestedAmount(v.id);
    return {
      ...v.get({ plain: true }),
      vestedAmount,
      availableToClaim: vestedAmount - v.releasedAmount,
    };
  }));
}