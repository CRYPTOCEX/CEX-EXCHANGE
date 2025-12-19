import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function CategoryLoading() {
  const t = useTranslations("ext_ecommerce");
  return (
    <div className="flex flex-col justify-center items-center min-h-[400px] pt-20 bg-white dark:bg-zinc-800/50 rounded-2xl shadow-xl p-8">
      <Loader2 className="h-12 w-12 animate-spin text-amber-600 dark:text-amber-400 mb-4" />
      <p className="text-gray-500 dark:text-zinc-400 text-lg">{t("loading_categories_ellipsis")}</p>
    </div>
  );
}
