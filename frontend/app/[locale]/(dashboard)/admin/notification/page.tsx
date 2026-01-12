import { Suspense } from "react";
import { NotificationServiceClient } from "./client";
import Loading from "./loading";

export default function NotificationServicePage() {
  return (
    <Suspense fallback={<Loading />}>
      <NotificationServiceClient />
    </Suspense>
  );
}
