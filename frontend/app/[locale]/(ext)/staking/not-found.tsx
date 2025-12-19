import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  const t = useTranslations("ext_staking");
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      <div className="relative overflow-hidden pt-28 pb-12"></div>

      <div className="container mx-auto">
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="max-w-md w-full text-center p-8 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 shadow-xl">
            <div className="w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-6">
              <Search className="h-10 w-10 text-violet-500" />
            </div>
            <div className="text-6xl font-bold text-violet-500 mb-4">404</div>
            <h1 className="text-2xl font-bold tracking-tight mb-3 text-zinc-900 dark:text-white">
              {t("not_found")}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mb-8 max-w-sm mx-auto">
              {t("the_staking_resource_been_moved")}
            </p>
            <Link href="/staking">
              <Button className="rounded-xl bg-linear-to-r from-violet-600 via-indigo-500 to-violet-600 hover:from-violet-700 hover:via-indigo-600 hover:to-violet-700 text-white shadow-lg hover:shadow-xl">
                <Home className="h-4 w-4 mr-2" />
                {t("return_to_staking_home")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
