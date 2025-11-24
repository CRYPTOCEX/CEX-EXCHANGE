interface aiInvestmentPlanDurationAttributes {
  id: string;
  planId: string;
  durationId: string;
}

type aiInvestmentPlanDurationPk = "id";
type aiInvestmentPlanDurationId =
  aiInvestmentPlanDurationAttributes[aiInvestmentPlanDurationPk];
type aiInvestmentPlanDurationOptionalAttributes = "id";
type aiInvestmentPlanDurationCreationAttributes = Optional<
  aiInvestmentPlanDurationAttributes,
  aiInvestmentPlanDurationOptionalAttributes
>;
