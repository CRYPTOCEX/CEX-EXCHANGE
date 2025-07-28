


interface forexDurationAttributes {
  id: string;
  duration: number;
  timeframe: "HOUR" | "DAY" | "WEEK" | "MONTH";
}

type forexDurationPk = "id";
type forexDurationId = forexDurationAttributes[forexDurationPk];
type forexDurationOptionalAttributes = "id";
type forexDurationCreationAttributes = Optional<
  forexDurationAttributes,
  forexDurationOptionalAttributes
>;
