// MoneroDeposits.ts
import { IDepositMonitor } from "./IDepositMonitor";
import { getMoneroService } from "@b/utils/safe-imports";

interface MoneroOptions {
  wallet: walletAttributes;
}

export class MoneroDeposits implements IDepositMonitor {
  private wallet: walletAttributes;

  constructor(options: MoneroOptions) {
    this.wallet = options.wallet;
  }

  public async watchDeposits(): Promise<void> {
    const MoneroService = await getMoneroService();
    if (!MoneroService) {
      throw new Error("Monero service not available");
    }
    const moneroService = await MoneroService.getInstance();
    await moneroService.monitorMoneroDeposits(this.wallet);
  }
}
