"use client";

import OrderDetailClient from "./client";
import { use } from "react";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return <OrderDetailClient orderId={id} />;
}
