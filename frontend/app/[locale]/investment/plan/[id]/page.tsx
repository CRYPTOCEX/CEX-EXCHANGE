import InvestmentPlanClient from "./client";

interface InvestmentPlanPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvestmentPlanPage({
  params,
}: InvestmentPlanPageProps) {
  const { id } = await params;
  return <InvestmentPlanClient planId={id} />;
}
