interface icoTokenOfferingPhaseAttributes {
  id: string;
  offeringId: string;
  name: string;
  tokenPrice: number;
  allocation: number;
  remaining: number;
  duration: number;
}

interface icoTokenOfferingPhaseCreationAttributes
  extends Partial<icoTokenOfferingPhaseAttributes> {}
