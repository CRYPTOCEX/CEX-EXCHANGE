import { models } from "@b/db";
import { logError } from "../logger";
import { broadcastStatus, broadcastLog } from "./broadcast";

// Store active backup schedules
const activeSchedules = new Map<string, NodeJS.Timeout>();

/**
 * Dynamically get the blockchain backup service if available
 */
async function getBackupService(chain: string) {
  try {
    // @ts-ignore - Dynamic import for optional NFT extension
    const backupModule = await import("@b/api/(ext)/nft/utils/blockchain-backup-service");
    return await backupModule.getBlockchainBackupService(chain);
  } catch (error) {
    broadcastLog("NFT Backup", `Backup service not available for chain: ${chain}`);
    return null;
  }
}

/**
 * Process NFT blockchain backups based on configured schedules
 */
export async function processNFTBackups() {
  try {
    broadcastStatus("NFT Backup", "running", { message: "Processing scheduled NFT backups" });
    
    // Get all configured backup schedules
    const schedules = await models.systemSetting?.findAll({
      where: {
        key: {
          [models.Sequelize.Op.like]: 'nft_backup_schedule_%'
        }
      }
    });

    if (!schedules || schedules.length === 0) {
      broadcastLog("NFT Backup", "No backup schedules configured");
      return;
    }

    for (const schedule of schedules) {
      try {
        const config = JSON.parse(schedule.value);
        
        // Check if backup is enabled
        if (!config.enabled) {
          continue;
        }

        // Check if it's time to run based on schedule
        const lastRun = config.lastRun ? new Date(config.lastRun) : null;
        const nextRun = config.nextRun ? new Date(config.nextRun) : null;
        const now = new Date();

        if (nextRun && now >= nextRun) {
          broadcastLog("NFT Backup", `Running backup for chain: ${config.chain}`);
          
          // Get backup service
          const backupService = await getBackupService(config.chain);
          if (!backupService) {
            continue;
          }
          
          // Execute backup based on type
          if (config.backupType === "FULL") {
            await backupService.createBackup(config.includeDisputes);
            broadcastLog("NFT Backup", `Full backup completed for ${config.chain}`);
          } else {
            await backupService.createIncrementalBackup();
            broadcastLog("NFT Backup", `Incremental backup completed for ${config.chain}`);
          }

          // Update last run and calculate next run
          config.lastRun = now.toISOString();
          config.nextRun = calculateNextRun(config.schedule, now).toISOString();
          
          // Save updated schedule
          await models.systemSetting?.update(
            { value: JSON.stringify(config) },
            { where: { key: schedule.key } }
          );
        }
      } catch (error) {
        logError("process_nft_backup_schedule", error, __filename);
        broadcastLog("NFT Backup", `Error processing backup for schedule: ${error.message}`);
      }
    }

    broadcastStatus("NFT Backup", "completed", { message: "All scheduled backups processed" });
  } catch (error) {
    logError("process_nft_backups", error, __filename);
    broadcastStatus("NFT Backup", "failed", { error: error.message });
  }
}

/**
 * Initialize NFT backup schedules from database on startup
 */
export async function initializeNFTBackupSchedules() {
  try {
    const schedules = await models.systemSetting?.findAll({
      where: {
        key: {
          [models.Sequelize.Op.like]: 'nft_backup_schedule_%'
        }
      }
    });

    if (!schedules || schedules.length === 0) {
      return;
    }

    for (const schedule of schedules) {
      try {
        const config = JSON.parse(schedule.value);
        
        if (!config.enabled) {
          continue;
        }

        // Setup interval for this schedule
        const intervalMs = getIntervalFromSchedule(config.schedule);
        if (intervalMs > 0) {
          const intervalId = setInterval(async () => {
            try {
              const backupService = await getBackupService(config.chain);
              if (!backupService) {
                return;
              }
              
              if (config.backupType === "FULL") {
                await backupService.createBackup(config.includeDisputes);
              } else {
                await backupService.createIncrementalBackup();
              }
              
              broadcastLog("NFT Backup", `Backup completed for ${config.chain}`);
            } catch (error) {
              logError("nft_backup_interval", error, __filename);
            }
          }, intervalMs);

          activeSchedules.set(`nft-backup-${config.chain}`, intervalId);
          console.log(`[NFT Backup] Initialized schedule for ${config.chain}: ${config.schedule}`);
        }
      } catch (error) {
        logError("init_nft_backup_schedule", error, __filename);
      }
    }
  } catch (error) {
    logError("initialize_nft_backup_schedules", error, __filename);
  }
}

/**
 * Stop all active NFT backup schedules
 */
export function stopNFTBackupSchedules() {
  for (const [key, intervalId] of activeSchedules) {
    clearInterval(intervalId);
    activeSchedules.delete(key);
  }
  console.log("[NFT Backup] All backup schedules stopped");
}

/**
 * Calculate next run time based on schedule type
 */
function calculateNextRun(schedule: string, fromDate: Date = new Date()): Date {
  const nextRun = new Date(fromDate);
  
  switch (schedule) {
    case "HOURLY":
      nextRun.setHours(nextRun.getHours() + 1);
      break;
    case "DAILY":
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case "WEEKLY":
      nextRun.setDate(nextRun.getDate() + 7);
      break;
    case "MONTHLY":
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
    default:
      // Default to daily
      nextRun.setDate(nextRun.getDate() + 1);
  }
  
  return nextRun;
}

/**
 * Get interval in milliseconds from schedule type
 */
function getIntervalFromSchedule(schedule: string): number {
  switch (schedule) {
    case "HOURLY":
      return 60 * 60 * 1000; // 1 hour
    case "DAILY":
      return 24 * 60 * 60 * 1000; // 24 hours
    case "WEEKLY":
      return 7 * 24 * 60 * 60 * 1000; // 7 days
    case "MONTHLY":
      return 30 * 24 * 60 * 60 * 1000; // 30 days (approximate)
    default:
      return 24 * 60 * 60 * 1000; // Default to daily
  }
}

/**
 * Create or update NFT backup schedule
 */
export async function createNFTBackupSchedule(
  chain: string,
  schedule: string,
  backupType: "FULL" | "INCREMENTAL",
  includeDisputes: boolean = false,
  enabled: boolean = true
) {
  try {
    const key = `nft_backup_schedule_${chain}`;
    
    // Stop existing schedule if any
    const existingId = activeSchedules.get(`nft-backup-${chain}`);
    if (existingId) {
      clearInterval(existingId);
      activeSchedules.delete(`nft-backup-${chain}`);
    }
    
    // Create new schedule configuration
    const config = {
      chain,
      schedule,
      backupType,
      includeDisputes,
      enabled,
      lastRun: null as string | null,
      nextRun: calculateNextRun(schedule).toISOString(),
      createdAt: new Date().toISOString()
    };
    
    // Save to database
    await models.systemSetting?.upsert({
      key,
      value: JSON.stringify(config)
    });
    
    // Setup new interval if enabled
    if (enabled) {
      const intervalMs = getIntervalFromSchedule(schedule);
      if (intervalMs > 0) {
        const intervalId = setInterval(async () => {
          try {
            const backupService = await getBackupService(chain);
            if (!backupService) {
              return;
            }
            
            if (backupType === "FULL") {
              await backupService.createBackup(includeDisputes);
            } else {
              await backupService.createIncrementalBackup();
            }
            
            // Update last run time
            config.lastRun = new Date().toISOString();
            config.nextRun = calculateNextRun(schedule).toISOString();
            
            await models.systemSetting?.update(
              { value: JSON.stringify(config) },
              { where: { key } }
            );
            
            broadcastLog("NFT Backup", `Backup completed for ${chain}`);
          } catch (error) {
            logError("nft_backup_schedule_execution", error, __filename);
          }
        }, intervalMs);
        
        activeSchedules.set(`nft-backup-${chain}`, intervalId);
      }
    }
    
    return config;
  } catch (error) {
    logError("create_nft_backup_schedule", error, __filename);
    throw error;
  }
}

/**
 * Delete NFT backup schedule
 */
export async function deleteNFTBackupSchedule(chain: string) {
  try {
    // Stop active schedule
    const scheduleId = activeSchedules.get(`nft-backup-${chain}`);
    if (scheduleId) {
      clearInterval(scheduleId);
      activeSchedules.delete(`nft-backup-${chain}`);
    }
    
    // Delete from database
    await models.systemSetting?.destroy({
      where: { key: `nft_backup_schedule_${chain}` }
    });
    
    broadcastLog("NFT Backup", `Backup schedule deleted for ${chain}`);
  } catch (error) {
    logError("delete_nft_backup_schedule", error, __filename);
    throw error;
  }
}