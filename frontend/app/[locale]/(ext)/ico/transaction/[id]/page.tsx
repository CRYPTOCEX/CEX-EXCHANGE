import { Suspense } from "react";
import type { Metadata } from "next";
import TransactionDetailsClient from "./client";
import TransactionDetailsLoading from "./loading";

export const metadata: Metadata = {
  title: "Transaction Details | ITO Platform",
  description: "View details of your transaction on the ITO Platform",
};

export default function TransactionDetailsPage() {
  return (
    <div className="container max-w-5xl py-8 mx-auto">
      <Suspense fallback={<TransactionDetailsLoading />}>
        <TransactionDetailsClient />
      </Suspense>
    </div>
  );
}
