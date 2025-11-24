


interface forexPlanDurationAttributes {
  id: string;
  planId: string;
  durationId: string;
}

type forexPlanDurationPk = "id";
type forexPlanDurationId = forexPlanDurationAttributes[forexPlanDurationPk];
type forexPlanDurationOptionalAttributes = "id";
type forexPlanDurationCreationAttributes = Optional<
  forexPlanDurationAttributes,
  forexPlanDurationOptionalAttributes
>;
