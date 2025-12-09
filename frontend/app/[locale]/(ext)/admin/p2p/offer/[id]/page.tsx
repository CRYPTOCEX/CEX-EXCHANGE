import OfferEditClient from "./client";
import { use } from "react";

export default function OfferEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <OfferEditClient id={id} />;
}
