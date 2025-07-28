


interface mlmUnilevelNodeAttributes {
  id: string;
  referralId: string;
  parentId: string | null;
}

type mlmUnilevelNodePk = "id";
type mlmUnilevelNodeId = mlmUnilevelNodeAttributes[mlmUnilevelNodePk];
type mlmUnilevelNodeOptionalAttributes = "parentId";
type mlmUnilevelNodeCreationAttributes = Optional<
  mlmUnilevelNodeAttributes,
  mlmUnilevelNodeOptionalAttributes
>;
