import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";

export function PositionsEmptyState({ tab }: { tab: string }) {
  const t = useTranslations("ext");
  let title: string;
  let description: string;

  switch (tab) {
    case "ACTIVE":
      title = "No active staking positions";
      description =
        "You don't have any currently active staking positions. Start staking tokens to see them here.";
      break;
    case "PENDING_WITHDRAWAL":
      title = "No pending withdrawals";
      description =
        "There are no staking positions pending withdrawal at the moment.";
      break;
    case "COMPLETED":
      title = "No completed staking positions";
      description = "You haven't completed any staking positions yet.";
      break;
    default:
      title = "No staking positions found";
      description =
        "You haven't staked any tokens yet. Start earning rewards by staking your tokens in one of our available pools.";
      break;
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-primary/10 p-4 rounded-full mb-6">
        <Coins className="h-12 w-12 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      <Link href="/staking/pool">
        <Button size="lg">{t("browse_staking_pools")}</Button>
      </Link>
    </div>
  );
}
