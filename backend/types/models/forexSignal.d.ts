


interface forexSignalAttributes {
  id: string;
  title: string;
  image: string;
  status: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type forexSignalPk = "id";
type forexSignalId = forexSignalAttributes[forexSignalPk];
type forexSignalOptionalAttributes =
  | "id"
  | "status"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type forexSignalCreationAttributes = Optional<
  forexSignalAttributes,
  forexSignalOptionalAttributes
>;
