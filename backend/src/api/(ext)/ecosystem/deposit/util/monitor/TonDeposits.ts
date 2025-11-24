// TonDeposits.ts
import { IDepositMonitor } from "./IDepositMonitor";
import { getTonService } from "@b/utils/safe-imports";

interface TonOptions {
  wallet: walletAttributes;
  chain: string;
  address: string;
}

export class TonDeposits implements IDepositMonitor {
  private wallet: walletAttributes;
  private chain: string;
  private address: string;

  constructor(options: TonOptions) {
    this.wallet = options.wallet;
    this.chain = options.chain;
    this.address = options.address;
  }

  public async watchDeposits(): Promise<void> {
    const TonService = await getTonService();
    if (!TonService) {
      throw new Error("TON service not available");
    }
    const tonService = await TonService.getInstance();
    await tonService.monitorTonDeposits(this.wallet, this.address);
  }
}
