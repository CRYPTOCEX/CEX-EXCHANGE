import OfferViewClient from "./client";
import { use } from "react";

export default function OfferViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <OfferViewClient id={id} />;
}
