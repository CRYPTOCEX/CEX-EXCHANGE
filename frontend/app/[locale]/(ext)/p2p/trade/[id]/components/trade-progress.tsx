"use client";

import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertCircle, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

interface TradeProgressProps {
  status: string;
}

export function TradeProgress({ status }: TradeProgressProps) {
  const t = useTranslations("ext_p2p");

  // Normalize status to uppercase for comparison
  const normalizedStatus = status?.toUpperCase() || "";

  const getTradeProgress = () => {
    switch (normalizedStatus) {
      case "PENDING":
        return 25; // Trade created, escrow funded, waiting for payment
      case "PAYMENT_SENT":
        return 50; // Payment confirmed by buyer, waiting for seller to verify
      case "COMPLETED":
        return 100; // Trade completed, funds released
      case "DISPUTED":
        return 60; // Trade is under dispute
      case "CANCELLED":
      case "EXPIRED":
        return 100; // Terminal states
      default:
        return 0;
    }
  };

  const progress = getTradeProgress();

  // Determine step states based on normalized status
  const isTradeCreated = ["PENDING", "PAYMENT_SENT", "COMPLETED", "DISPUTED"].includes(normalizedStatus);
  const isPaymentPending = normalizedStatus === "PENDING";
  const isPaymentConfirmed = ["PAYMENT_SENT", "COMPLETED"].includes(normalizedStatus);
  const isTradeCompleted = normalizedStatus === "COMPLETED";
  const isDisputed = normalizedStatus === "DISPUTED";

  const steps = [
    {
      title: "Trade Created",
      description: "Escrow funded",
      icon: ShieldCheck,
      complete: isTradeCreated,
      active: !isTradeCreated,
    },
    {
      title: "Payment Pending",
      description: "Waiting for payment",
      icon: Clock,
      complete: isPaymentConfirmed || isTradeCompleted,
      active: isPaymentPending,
    },
    {
      title: "Payment Confirmed",
      description: "Verification in progress",
      icon: isDisputed ? AlertCircle : CheckCircle2,
      complete: isTradeCompleted,
      active: isPaymentConfirmed && !isTradeCompleted,
    },
    {
      title: "Trade Completed",
      description: "Funds released",
      icon: CheckCircle2,
      complete: isTradeCompleted,
      active: false,
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
