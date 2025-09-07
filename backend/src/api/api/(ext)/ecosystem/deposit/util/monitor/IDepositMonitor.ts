// IDepositMonitor.ts
export interface IDepositMonitor {
  watchDeposits(): Promise<void>;
}
