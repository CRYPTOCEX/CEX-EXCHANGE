


interface forexAccountSignalAttributes {
  forexAccountId: string;
  forexSignalId: string;
}

type forexAccountSignalPk = "forexAccountId" | "forexSignalId";
type forexAccountSignalId = forexAccountSignalAttributes[forexAccountSignalPk];
type forexAccountSignalCreationAttributes = forexAccountSignalAttributes;
