"use client";

import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Loading } from "./components/loading";
import { TradeDetailsClient } from "./client";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function TradePage() {
  const t = useTranslations("common");
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="flex min-h-screen w-full flex-col pt-16">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/p2p/trade">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              {`| ${t("trade")} `}
              {id}
            </h1>
          </div>
        </div>

        <Suspense fallback={<Loading />}>
          <TradeDetailsClient tradeId={id} />
        </Suspense>
      </main>
    </div>
  );
}
