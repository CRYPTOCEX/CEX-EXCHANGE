import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import FAQDetailContent from "./client";
import FAQDetailLoading from "./loading";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function FAQDetailPage() {
  const t = useTranslations("ext");
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6">
        <Link
          href="/faq"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back_to_faq_list")}
        </Link>
      </div>

      <Suspense fallback={<FAQDetailLoading />}>
        <FAQDetailContent />
      </Suspense>
    </div>
  );
}
