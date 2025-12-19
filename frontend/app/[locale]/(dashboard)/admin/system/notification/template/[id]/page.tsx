"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Loader2 } from "lucide-react";

export default function NotificationTemplateEdit() {
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    // Redirect to full-screen editor
    if (id) {
      router.push(`/admin/system/notification/template/${id}/edit`);
    }
  }, [id, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
