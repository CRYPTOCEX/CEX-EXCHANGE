import { models } from "@b/db";
import { createAdminNotification, createNotification } from "./notifications";
import { logError } from "@b/utils/logger";
import { CacheManager } from "@b/utils/cache";

export async function processRewards(
  userId: string,
  amount: number,
  conditionName: string,
  currency: string
) {
  const cacheManager = CacheManager.getInstance();
  const extensions = await cacheManager.getExtensions();
  if (!extensions.has("mlm")) return;

  const settings = await cacheManager.getSettings();
  const mlmSystem = settings.has("mlmSystem")
    ? settings.get("mlmSystem")
    : "DIRECT";

  let mlmSettings = null;
  try {
    const mlmSettingsRaw = settings.get("mlmSettings");
    if (mlmSettingsRaw && settings.has("mlmSettings")) {
      // Validate JSON string before parsing to prevent injection
      if (typeof mlmSettingsRaw !== 'string' || mlmSettingsRaw.length > 10000) {
        throw new Error("Invalid MLM settings format or size");
      }
      
      // Additional validation to prevent malicious JSON
      if (mlmSettingsRaw.includes('__proto__') || mlmSettingsRaw.includes('constructor') || mlmSettingsRaw.includes('prototype')) {
        throw new Error("Potentially malicious JSON detected in MLM settings");
      }
      
      mlmSettings = JSON.parse(mlmSettingsRaw);
      
      // Validate the parsed object structure
      if (mlmSettings && typeof mlmSettings === 'object' && mlmSettings !== null) {
        // Ensure it's a plain object, not a function or other potentially dangerous type
        if (Object.getPrototypeOf(mlmSettings) !== Object.prototype) {
          throw new Error("Invalid MLM settings object type");
        }
      }
    }
  } catch (error) {
    logError("mlmSettings", error, __filename);
    return;
  }

  if (!mlmSettings) {
    logError("mlmSettings", new Error("MLM settings not found"), __filename);
    return; // MLM settings not found
  }

  // Validate transaction type and currency
  if (!isValidTransaction(conditionName, amount, currency)) {
    logError(
      "transaction",
      new Error("Invalid transaction type or currency"),
      __filename
    );
    return;
  }

  const { mlmReferralCondition } = models;

  try {
    const condition = await mlmReferralCondition.findOne({
      where: { name: conditionName, status: true },
    });

    if (!condition) {
      logError(
        "condition",
        new Error("Invalid referral condition"),
        __filename
      );
      return;
    }

    let rewardsProcessed = false; // Flag to indicate if rewards were successfully processed

    switch (mlmSystem) {
      case "DIRECT":
        rewardsProcessed = await processDirectRewards(
          condition,
          userId,
          amount
        );
        break;
      case "BINARY":
        rewardsProcessed = await processBinaryRewards(
          condition,
          userId,
          amount,
          mlmSettings
        );
        break;
      case "UNILEVEL":
        rewardsProcessed = await processUnilevelRewards(
          condition,
          userId,
          amount,
          mlmSettings
        );
        break;
      default:
        logError("mlmSystem", new Error("Invalid MLM system type"), __filename);
        break;
    }

    if (rewardsProcessed) {
      // Notify the user about their reward using the new notification utility.
      await createNotification({
        userId,
        relatedId: condition.id ? condition.id.toString() : undefined,
        title: "Reward Processed",
        message: `Your reward for ${conditionName} of ${amount} ${currency} has been successfully processed.`,
        type: "system",
        link: `/mlm/rewards`,
        actions: [
          {
            label: "View Rewards",
            link: `/mlm/rewards`,
            primary: true,
          },
        ],
      });

      // Notify users with the "View MLM Rewards" permission about the reward process.
      await createAdminNotification(
        "View MLM Rewards",
        "MLM Reward Processed",
        `A reward for ${conditionName} of ${amount} ${currency} was processed for user ${userId}.`,
        "system",
        `/admin/mlm/rewards`
      );
    }
  } catch (error) {
    logError("processRewards", error, __filename);
  }
}

function isValidTransaction(conditionName: string, amount: number, currency: string): boolean {
  // Validate input parameters
  if (!conditionName || typeof conditionName !== 'string') {
    return false;
  }
  
  if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
    return false;
  }
  
  if (!currency || typeof currency !== 'string') {
    return false;
  }

  switch (conditionName) {
    case "WELCOME_BONUS":
      return currency === "USDT" && amount >= 100;
    case "MONTHLY_TRADE_VOLUME":
      return currency === "USDT" && amount > 1000;
    case "TRADE_COMMISSION":
    case "DEPOSIT":
    case "TRADE":
    case "INVESTMENT":
    case "BINARY_WIN":
    case "AI_INVESTMENT":
    case "FOREX_INVESTMENT":
    case "ICO_CONTRIBUTION":
    case "STAKING":
    case "STAKING_LOYALTY":
    case "ECOMMERCE_PURCHASE":
    case "P2P_TRADE":
      return amount > 0; // All these conditions require positive amounts
    default:
      return false;
  }
}

async function processDirectRewards(condition, referredId, amount) {
  try {
    // Find the referral record for the user who made the transaction
    const referral = await models.mlmReferral.findOne({
      where: { referredId }, // The person who made the transaction
    });

    if (!referral) return false;

    // Check for existing reward to prevent duplicates
    // Include referredId to make the check more specific
    const existingReward = await models.mlmReferralReward.findOne({
      where: {
        referrerId: referral.referrerId,
        conditionId: condition.id,
        // Add a transaction reference or timestamp to prevent exact duplicates
        // For now, we check if a reward was already given for this condition
      },
    });

    if (existingReward) {
      logError(
        "processDirectRewards", 
        new Error(`Duplicate reward prevented for referrer ${referral.referrerId}, condition ${condition.id}`), 
        __filename
      );
      return false;
    }

    // Calculate reward amount
    const rewardAmount =
      condition.rewardType === "PERCENTAGE"
        ? amount * (condition.reward / 100)
        : condition.reward;

    // Validate reward amount
    if (rewardAmount <= 0) {
      logError(
        "processDirectRewards",
        new Error(`Invalid reward amount calculated: ${rewardAmount}`),
        __filename
      );
      return false;
    }

    // Create the reward record
    await models.mlmReferralReward.create({
      referrerId: referral.referrerId,
      conditionId: condition.id,
      reward: rewardAmount,
    });

    return true;
  } catch (error) {
    logError("processDirectRewards", error, __filename);
    return false;
  }
}

// Helper function to find uplines
async function findUplines(userId, systemType, levels) {
  const uplines: { level: number; referrerId: any }[] = [];
  let currentUserId = userId;

  // Assume model names for binary and unilevel systems
  const model =
    systemType === "BINARY" ? models.mlmBinaryNode : models.mlmUnilevelNode;

  for (let i = 0; i < levels; i++) {
    try {
      const referral = await models.mlmReferral.findOne({
        where: { referredId: currentUserId },
        include: [
          {
            model: model,
            as: systemType === "BINARY" ? "node" : "unilevelNode",
            required: true,
          },
        ],
      });

      if (!referral || !referral.referrerId) {
        logError(
          "findUplines",
          new Error(
            `User ${currentUserId} is not associated to ${
              systemType === "BINARY" ? "mlmBinaryNode" : "mlmUnilevelNode"
            }!`
          ),
          __filename
        );
        break;
      }

      uplines.push({
        level: i + 1,
        referrerId: referral.referrerId,
      });

      currentUserId = referral.referrerId;
    } catch (error) {
      logError("findUplines", error, __filename);
      break;
    }
  }

  return uplines;
}

// Common function to create reward record with proper validation and duplicate prevention
async function createRewardRecord(referrerId: string, rewardAmount: number, conditionId: string) {
  try {
    // Validate inputs
    if (!referrerId || !conditionId) {
      throw new Error("referrerId and conditionId are required");
    }
    
    if (typeof rewardAmount !== 'number' || rewardAmount <= 0 || !isFinite(rewardAmount)) {
      throw new Error(`Invalid reward amount: ${rewardAmount}`);
    }
    
    // Check for duplicate rewards within a transaction
    const existingReward = await models.mlmReferralReward.findOne({
      where: {
        referrerId,
        conditionId,
        createdAt: {
          [models.Sequelize.Op.gte]: new Date(Date.now() - 60000) // Within last minute
        }
      }
    });
    
    if (existingReward) {
      logError(
        "createRewardRecord", 
        new Error(`Duplicate reward prevented for referrer ${referrerId}, condition ${conditionId}`), 
        __filename
      );
      return false;
    }

    await models.mlmReferralReward.create({
      referrerId,
      reward: rewardAmount,
      conditionId: conditionId,
    });
    
    return true;
  } catch (error) {
    logError("createRewardRecord", error, __filename);
    return false;
  }
}

// Binary Rewards Processing
async function processBinaryRewards(
  condition,
  userId,
  depositAmount,
  mlmSettings
) {
  try {
    if (typeof mlmSettings.binary === "string") {
      try {
        // Validate binary settings string before parsing
        if (mlmSettings.binary.length > 5000) {
          throw new Error("Binary settings string too large");
        }
        
        if (mlmSettings.binary.includes('__proto__') || mlmSettings.binary.includes('constructor')) {
          throw new Error("Potentially malicious JSON detected in binary settings");
        }
        
        mlmSettings.binary = JSON.parse(mlmSettings.binary);
        
        // Validate parsed binary settings
        if (mlmSettings.binary && typeof mlmSettings.binary === 'object' && mlmSettings.binary !== null) {
          if (Object.getPrototypeOf(mlmSettings.binary) !== Object.prototype) {
            throw new Error("Invalid binary settings object type");
          }
        }
      } catch (error) {
        logError(
          "mlmSettings.binary",
          new Error("Invalid JSON in mlmSettings.binary"),
          __filename
        );
        return false;
      }
    }

    if (!mlmSettings.binary || !mlmSettings.binary.levels) {
      logError(
        "mlmSettings",
        new Error("Binary MLM settings are invalid"),
        __filename
      );
      return false;
    }

    const binaryLevels = mlmSettings.binary.levels;
    const uplines = await findUplines(userId, "BINARY", binaryLevels);

    if (!uplines.length) {
      return false;
    }

    for (let i = uplines.length - 1; i >= 0; i--) {
      const upline = uplines[i];
      const levelIndex = binaryLevels - i;
      const levelRewardPercentage = mlmSettings.binary.levelsPercentage.find(
        (l) => l.level === levelIndex
      )?.value;

      if (levelRewardPercentage === undefined) {
        continue;
      }

      // Calculate reward based on condition type
      let finalReward: number;
      if (condition.rewardType === "PERCENTAGE") {
        // For percentage rewards, apply the condition's reward percentage to the transaction amount
        const conditionReward = depositAmount * (condition.reward / 100);
        // Then apply the level percentage to determine the upline's share
        finalReward = conditionReward * (levelRewardPercentage / 100);
      } else {
        // For fixed rewards, apply the level percentage to the fixed amount
        finalReward = condition.reward * (levelRewardPercentage / 100);
      }

      await createRewardRecord(upline.referrerId, finalReward, condition.id);
    }

    return true;
  } catch (error) {
    logError("processBinaryRewards", error, __filename);
    return false;
  }
}

// Unilevel Rewards Processing
async function processUnilevelRewards(
  condition,
  userId,
  depositAmount,
  mlmSettings
) {
  try {
    if (typeof mlmSettings.unilevel === "string") {
      try {
        // Validate unilevel settings string before parsing
        if (mlmSettings.unilevel.length > 5000) {
          throw new Error("Unilevel settings string too large");
        }
        
        if (mlmSettings.unilevel.includes('__proto__') || mlmSettings.unilevel.includes('constructor')) {
          throw new Error("Potentially malicious JSON detected in unilevel settings");
        }
        
        mlmSettings.unilevel = JSON.parse(mlmSettings.unilevel);
        
        // Validate parsed unilevel settings
        if (mlmSettings.unilevel && typeof mlmSettings.unilevel === 'object' && mlmSettings.unilevel !== null) {
          if (Object.getPrototypeOf(mlmSettings.unilevel) !== Object.prototype) {
            throw new Error("Invalid unilevel settings object type");
          }
        }
      } catch (error) {
        logError(
          "mlmSettings.unilevel",
          new Error("Invalid JSON in mlmSettings.unilevel"),
          __filename
        );
        return false;
      }
    }

    if (!mlmSettings.unilevel || !mlmSettings.unilevel.levels) {
      logError(
        "mlmSettings",
        new Error("Unilevel MLM settings are invalid"),
        __filename
      );
      return false;
    }

    const unilevelLevels = mlmSettings.unilevel.levels;
    const uplines = await findUplines(userId, "UNILEVEL", unilevelLevels);

    if (!uplines.length) {
      return false;
    }

    for (let i = uplines.length - 1; i >= 0; i--) {
      const upline = uplines[i];
      const levelIndex = unilevelLevels - i;
      const levelRewardPercentage = mlmSettings.unilevel.levelsPercentage.find(
        (l) => l.level === levelIndex
      )?.value;

      if (levelRewardPercentage === undefined) {
        continue;
      }

      // Calculate reward based on condition type  
      let finalReward: number;
      if (condition.rewardType === "PERCENTAGE") {
        // For percentage rewards, apply the condition's reward percentage to the transaction amount
        const conditionReward = depositAmount * (condition.reward / 100);
        // Then apply the level percentage to determine the upline's share
        finalReward = conditionReward * (levelRewardPercentage / 100);
      } else {
        // For fixed rewards, apply the level percentage to the fixed amount
        finalReward = condition.reward * (levelRewardPercentage / 100);
      }

      await createRewardRecord(upline.referrerId, finalReward, condition.id);
    }

    return true;
  } catch (error) {
    logError("processUnilevelRewards", error, __filename);
    return false;
  }
}

export const handleReferralRegister = async (refId: string, userId: string) => {
  try {
    const referrer = await models.user.findByPk(refId);
    if (referrer) {
      const cacheManager = CacheManager.getInstance();
      const settings = await cacheManager.getSettings();
      const referralApprovalRequired = settings.has("referralApprovalRequired")
        ? settings.get("referralApprovalRequired") === "true"
        : false;
      const referral = await models.mlmReferral.create({
        referrerId: referrer.id,
        referredId: userId,
        status: referralApprovalRequired ? "PENDING" : "ACTIVE",
      });

      const mlmSystem = settings.has("mlmSystem")
        ? settings.get("mlmSystem")
        : null;

      if (mlmSystem === "DIRECT") {
        return;
      } else if (mlmSystem === "BINARY") {
        await handleBinaryMlmReferralRegister(
          referrer.id,
          referral,
          models.mlmBinaryNode
        );
      } else if (mlmSystem === "UNILEVEL") {
        await handleUnilevelMlmReferralRegister(
          referrer.id,
          referral,
          models.mlmUnilevelNode
        );
      }
    }
  } catch (error) {
    logError("handleReferralRegister", error, __filename);
    throw error;
  }
};

const checkCycleForBinary = async (
  referrerNode: any,
  newUserId: string,
  mlmBinaryNodeModel: any
): Promise<boolean> => {
  let current = referrerNode;
  while (current) {
    const referral = await models.mlmReferral.findOne({
      where: { id: current.referralId },
    });
    if (referral && referral.referredId === newUserId) {
      return true;
    }
    if (!current.parentId) break;
    current = await mlmBinaryNodeModel.findByPk(current.parentId);
  }
  return false;
};

const checkCycleForUnilevel = async (
  referrerNode: any,
  newUserId: string,
  mlmUnilevelNodeModel: any
): Promise<boolean> => {
  let current = referrerNode;
  while (current) {
    const referral = await models.mlmReferral.findOne({
      where: { id: current.referralId },
    });
    if (referral && referral.referredId === newUserId) {
      return true;
    }
    if (!current.parentId) break;
    current = await mlmUnilevelNodeModel.findByPk(current.parentId);
  }
  return false;
};

export const handleBinaryMlmReferralRegister = async (
  referrerUserId: string,
  newReferral: any,
  mlmBinaryNode: any
) => {
  const { sequelize } = models;
  
  return await sequelize.transaction(async (transaction) => {
    try {
      let referrerReferral = await models.mlmReferral.findOne({
        where: { referrerId: referrerUserId, referredId: referrerUserId },
        transaction,
      });
      if (!referrerReferral) {
        referrerReferral = await models.mlmReferral.create({
          referrerId: referrerUserId,
          referredId: referrerUserId,
          status: "ACTIVE",
        }, { transaction });
      }

      let referrerNode = await mlmBinaryNode.findOne({
        where: { referralId: referrerReferral.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!referrerNode) {
        referrerNode = await mlmBinaryNode.create({
          referralId: referrerReferral.id,
          parentId: null,
        }, { transaction });
      }

      const cycleExists = await checkCycleForBinary(
        referrerNode,
        newReferral.referredId,
        mlmBinaryNode
      );
      if (cycleExists) {
        throw new Error(
          "Referral loop detected: the referred user is already an ancestor."
        );
      }

      const placementField = referrerNode.leftChildId
        ? "rightChildId"
        : "leftChildId";

      const newNode = await mlmBinaryNode.create({
        referralId: newReferral.id,
        parentId: referrerNode.id,
      }, { transaction });

      referrerNode[placementField] = newNode.id;
      await referrerNode.save({ transaction });
      
      return newNode;
    } catch (error) {
      logError("handleBinaryMlmReferralRegister", error, __filename);
      throw error;
    }
  });
};

export const handleUnilevelMlmReferralRegister = async (
  referrerUserId: string,
  newReferral: any,
  mlmUnilevelNode: any
) => {
  const { sequelize } = models;
  
  return await sequelize.transaction(async (transaction) => {
    try {
      let referrerReferral = await models.mlmReferral.findOne({
        where: { referrerId: referrerUserId, referredId: referrerUserId },
        transaction,
      });
      if (!referrerReferral) {
        referrerReferral = await models.mlmReferral.create({
          referrerId: referrerUserId,
          referredId: referrerUserId,
          status: "ACTIVE",
        }, { transaction });
      }

      let referrerNode = await mlmUnilevelNode.findOne({
        where: { referralId: referrerReferral.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!referrerNode) {
        referrerNode = await mlmUnilevelNode.create({
          referralId: referrerReferral.id,
          parentId: null,
        }, { transaction });
      }

      const cycleExists = await checkCycleForUnilevel(
        referrerNode,
        newReferral.referredId,
        mlmUnilevelNode
      );
      if (cycleExists) {
        throw new Error(
          "Referral loop detected: the referred user is already an ancestor."
        );
      }

      const newNode = await mlmUnilevelNode.create({
        referralId: newReferral.id,
        parentId: referrerNode.id,
      }, { transaction });
      
      return newNode;
    } catch (error) {
      logError("handleUnilevelMlmReferralRegister", error, __filename);
      throw error;
    }
  });
};
