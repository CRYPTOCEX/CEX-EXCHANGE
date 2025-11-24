"use client";

import OrderDetailClient from "./client";

export default function Page({ params }) {
  const { id } = params.id;
  
  return (
    <div className="px-4 py-6 sm:px-0">
      <OrderDetailClient orderId={id} />
    </div>
  );
}
