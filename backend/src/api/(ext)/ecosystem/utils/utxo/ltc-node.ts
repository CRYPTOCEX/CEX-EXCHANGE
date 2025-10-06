import { GenericUTXONodeService } from './generic-utxo-node';

export class LitecoinNodeService extends GenericUTXONodeService {
  private static instance: LitecoinNodeService;

  private constructor() {
    super('LTC');
  }

  public static async getInstance(): Promise<LitecoinNodeService> {
    if (!LitecoinNodeService.instance) {
      LitecoinNodeService.instance = new LitecoinNodeService();
      await LitecoinNodeService.instance.initialize();
    }
    return LitecoinNodeService.instance;
  }
}

export default LitecoinNodeService;