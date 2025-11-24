// SolanaDeposits.ts
import { IDepositMonitor } from "./IDepositMonitor";
import { getSolanaService } from "@b/utils/safe-imports";
import { getEcosystemToken } from "@b/api/(ext)/ecosystem/utils/tokens";

interface SolanaOptions {
  wallet: walletAttributes;
  chain: string;
  currency: string;
  address: string;
}

export class SolanaDeposits implements IDepositMonitor {
  private wallet: walletAttributes;
  private chain: string;
  private currency: string;
  private address: string;
  public active: boolean = true;

  constructor(options: SolanaOptions) {
    this.wallet = options.wallet;
    this.chain = options.chain;
    this.currency = options.currency;
    this.address = options.address;
  }

  public async watchDeposits(): Promise<void> {
    const SolanaService = await getSolanaService();
    if (!SolanaService) {
      throw new Error("Solana service not available");
    }
    const solanaService = await SolanaService.getInstance();

    if (this.currency === "SOL") {
      await solanaService.monitorSolanaDeposits(this.wallet, this.address, () =>
        this.stopPolling()
      );
    } else {
      const token = await getEcosystemToken(this.chain, this.currency);
      if (!token || !token.contract) {
        console.error(
          `SPL Token ${this.currency} not found or invalid mint address`
        );
        return;
      }
      await solanaService.monitorSPLTokenDeposits(
        this.wallet,
        this.address,
        token.contract,
        () => this.stopPolling()
      );
    }
  }

  public stopPolling() {
    this.active = false;
    console.log(`Monitor for wallet ${this.wallet.id} has stopped polling.`);
  }
}
