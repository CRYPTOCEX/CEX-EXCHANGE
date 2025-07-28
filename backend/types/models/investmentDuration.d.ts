


interface investmentDurationAttributes {
  id: string;
  duration: number;
  timeframe: "HOUR" | "DAY" | "WEEK" | "MONTH";
}

type investmentDurationPk = "id";
type investmentDurationId = investmentDurationAttributes[investmentDurationPk];
type investmentDurationOptionalAttributes = "id";
type investmentDurationCreationAttributes = Optional<
  investmentDurationAttributes,
  investmentDurationOptionalAttributes
>;
