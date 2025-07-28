"use client";

import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertCircle, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

interface TradeProgressProps {
  status: string;
}

export function TradeProgress({ status }: TradeProgressProps) {
  const t = useTranslations("ext");
  const getTradeProgress = () => {
    switch (status) {
      case "created":
        return 10;
      case "funded":
        return 25;
      case "waiting_payment":
        return 50;
      case "payment_confirmed":
        return 75;
      case "completed":
        return 100;
      case "disputed":
        return 60;
      case "cancelled":
        return 100;
      default:
        return 0;
    }
  };

  const progress = getTradeProgress();

  const steps = [
    {
      title: "Trade Created",
      description: "Escrow funded",
      icon: ShieldCheck,
      complete: progress >= 25,
      active: progress < 25,
    },
    {
      title: "Payment Pending",
      description: "Waiting for payment",
      icon: Clock,
      complete: progress >= 50,
      active: progress >= 25 && progress < 50,
    },
    {
      title: "Payment Confirmed",
      description: "Verification in progress",
      icon: AlertCircle,
      complete: progress >= 75,
      active: progress >= 50 && progress < 75,
    },
    {
      title: "Trade Completed",
      description: "Funds released",
      icon: CheckCircle2,
      complete: progress >= 100,
      active: progress >= 75 && progress < 100,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{t("trade_progress")}</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center text-center">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 ${
                step.complete
                  ? "bg-primary text-primary-foreground"
                  : step.active
                    ? "bg-primary/20 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <step.icon className="h-5 w-5" />
            </div>
            <p
              className={`text-xs font-medium ${step.complete || step.active ? "text-foreground" : "text-muted-foreground"}`}
            >
              {step.title}
            </p>
            <p className="text-xs text-muted-foreground mt-1 hidden md:block">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
