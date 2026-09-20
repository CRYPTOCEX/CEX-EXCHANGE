import type { Metadata } from "next";
import PlanClient from "./client";

export const metadata: Metadata = {
  title: "Investment plan",
  description:
    "The rate, the terms, the currency it takes, and what this plan pays at maturity.",
};

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlanClient planId={id} />;
}
