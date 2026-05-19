"use client";

import { Suspense } from "react";
import StakingPoolDetailClient from "./client";
import { LoadingPoolDetail } from "./components/loading-pool-detail";

export default function StakingPoolDetailPage() {
  return (
    <Suspense fallback={<LoadingPoolDetail />}>
      <StakingPoolDetailClient />
    </Suspense>
  );
}
