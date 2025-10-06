import { GenericUTXONodeService } from './generic-utxo-node';

export class DogecoinNodeService extends GenericUTXONodeService {
  private static instance: DogecoinNodeService;

  private constructor() {
    super('DOGE');
  }

  public static async getInstance(): Promise<DogecoinNodeService> {
    if (!DogecoinNodeService.instance) {
      DogecoinNodeService.instance = new DogecoinNodeService();
      await DogecoinNodeService.instance.initialize();
    }
    return DogecoinNodeService.instance;
  }
}

export default DogecoinNodeService;