


interface mlmBinaryNodeAttributes {
  id: string;
  referralId: string;
  parentId?: string;
  leftChildId?: string;
  rightChildId?: string;
}

type mlmBinaryNodePk = "id";
type mlmBinaryNodeId = mlmBinaryNodeAttributes[mlmBinaryNodePk];
type mlmBinaryNodeOptionalAttributes =
  | "parentId"
  | "leftChildId"
  | "rightChildId";
type mlmBinaryNodeCreationAttributes = Optional<
  mlmBinaryNodeAttributes,
  mlmBinaryNodeOptionalAttributes
>;
