import InvestmentComplianceClient from "./client";

export const metadata = {
  title: "Investment Compliance",
  description:
    "Which territories may open a fixed-return investment, and who accepted responsibility for offering it there.",
};

export default async function InvestmentCompliancePage() {
  return <InvestmentComplianceClient />;
}
