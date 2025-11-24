interface aiInvestmentDurationAttributes {
  id: string;
  duration: number;
  timeframe: "HOUR" | "DAY" | "WEEK" | "MONTH";
}

type aiInvestmentDurationPk = "id";
type aiInvestmentDurationId =
  aiInvestmentDurationAttributes[aiInvestmentDurationPk];
type aiInvestmentDurationOptionalAttributes = "id";
type aiInvestmentDurationCreationAttributes = Optional<
  aiInvestmentDurationAttributes,
  aiInvestmentDurationOptionalAttributes
>;
