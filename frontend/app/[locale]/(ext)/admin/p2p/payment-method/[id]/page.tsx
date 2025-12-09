import PaymentMethodEditClient from "./client";
import { use } from "react";

export default function PaymentMethodEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PaymentMethodEditClient id={id} />;
}
