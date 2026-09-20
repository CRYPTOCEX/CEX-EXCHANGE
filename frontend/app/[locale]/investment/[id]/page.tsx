import type { Metadata } from "next";
import PositionClient from "./client";

export const metadata: Metadata = {
  title: "Investment",
  description: "Your position: the term, the maturity date and what it settles.",
};

/**
 * `params` is a Promise in this Next major; awaiting it here keeps the client
 * component a plain `{ id }` consumer.
 */
export default async function PositionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PositionClient id={id} />;
}
