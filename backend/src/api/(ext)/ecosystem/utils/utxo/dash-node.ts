import { GenericUTXONodeService } from './generic-utxo-node';

export class DashNodeService extends GenericUTXONodeService {
  private static instance: DashNodeService;

  private constructor() {
    super('DASH');
  }

  public static async getInstance(): Promise<DashNodeService> {
    if (!DashNodeService.instance) {
      DashNodeService.instance = new DashNodeService();
      await DashNodeService.instance.initialize();
    }
    return DashNodeService.instance;
  }
}

export default DashNodeService;