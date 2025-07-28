// TronDeposits.ts
import { IDepositMonitor } from "./IDepositMonitor";
import { getTronService } from "@b/utils/safe-imports";

interface TronOptions {
  wallet: walletAttributes;
  chain: string;
  address: string;
}

export class TronDeposits implements IDepositMonitor {
  private wallet: walletAttributes;
  private chain: string;
  private address: string;

  constructor(options: TronOptions) {
    this.wallet = options.wallet;
    this.chain = options.chain;
    this.address = options.address;
  }

  public async watchDeposits(): Promise<void> {
    const TronService = await getTronService();
    if (!TronService) {
      throw new Error("Tron service not available");
    }
    const tronService = await TronService.getInstance();
    await tronService.monitorTronDeposits(this.wallet, this.address);
  }
}
