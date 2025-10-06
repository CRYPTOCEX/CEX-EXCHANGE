import { GenericUTXONodeService } from './generic-utxo-node';

/**
 * Bitcoin Core Node Service
 * Extends GenericUTXONodeService with Bitcoin-specific functionality
 */
export class BitcoinNodeService extends GenericUTXONodeService {
  private static instance: BitcoinNodeService;

  private constructor() {
    super('BTC');
  }

  public static async getInstance(): Promise<BitcoinNodeService> {
    if (!BitcoinNodeService.instance) {
      BitcoinNodeService.instance = new BitcoinNodeService();
      await BitcoinNodeService.instance.initialize();
    }
    return BitcoinNodeService.instance;
  }
}

export default BitcoinNodeService;