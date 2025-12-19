import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import FAQDetailContent from "./client";
import FAQDetailLoading from "./loading";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function FAQDetailPage() {
  const t = await getTranslations("ext");
  return (

        <FAQDetailContent />
  );
}
