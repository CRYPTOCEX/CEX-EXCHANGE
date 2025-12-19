import { AlertTriangle, ArrowLeft, FileText, Pencil } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";

interface EditOfferErrorStateProps {
  error?: string;
  offerId?: string;
}

export function EditOfferErrorState({ error }: EditOfferErrorStateProps) {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Pencil className="h-3.5 w-3.5" />,
          text: "Edit Offer",
          gradient: `from-blue-500/10 to-violet-500/10`,
          iconColor: `text-blue-500`,
          textColor: `text-blue-600 dark:text-blue-400`,
        }}
        title={[{ text: tCommon("edit_offer") }]}
        description={t("modify_your_offer_settings")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        background={{
          orbs: [
            { color: "#3b82f6", position: { top: "-10rem", right: "-10rem" }, size: "20rem" },
            { color: "#8b5cf6", position: { bottom: "-5rem", left: "-5rem" }, size: "15rem" },
          ],
        }}
        particles={{ count: 6, type: "floating", colors: ["#3b82f6", "#8b5cf6"], size: 8 }}
      />

      {/* Error Content */}
      <main className="container mx-auto py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-8 border border-zinc-200/50 dark:border-zinc-700/50 text-center">
            {/* Error Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center mb-6">
              <AlertTriangle className="h-8 w-8 text-amber-500 dark:text-amber-400" />
            </div>

            {/* Error Message */}
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
              {tExt("offer_not_found")}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-8 max-w-md mx-auto">
              {error || t("offer_not_found_or")}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/p2p/offer">
                <Button variant="outline" className="w-full sm:w-auto border-zinc-300 dark:border-zinc-700">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {tCommon('back_to_offerings')}
                </Button>
              </Link>
              <Link href="/p2p/dashboard">
                <Button className={`w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white`}>
                  <FileText className="mr-2 h-4 w-4" />
                  {tCommon("my_offers")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
