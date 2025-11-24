import { Suspense } from "react";
import { CronManagementClient } from "./client";
import Loading from "./loading";
export default function HomePage() {
  return (
    <Suspense fallback={<Loading />}>
      <CronManagementClient />
    </Suspense>
  );
}
