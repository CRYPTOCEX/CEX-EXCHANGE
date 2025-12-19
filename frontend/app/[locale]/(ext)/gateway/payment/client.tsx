"use client";

import React, { useEffect, useState } from "react";
import { Eye, CreditCard } from "lucide-react";
import { Link } from "@/i18n/routing";
import DataTable from "@/components/blocks/data-table";
import { Button } from "@/components/ui/button";
import { useColumns } from "./columns";
import $fetch from "@/lib/api";
import { useMerchantMode } from "../context/merchant-mode";
import GatewayPaymentLoading from "./loading";

export default function MerchantPaymentsClient() {
  const { mode } = useMerchantMode();
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [checkingMerchant, setCheckingMerchant] = useState(true);
  const columns = useColumns();

  useEffect(() => {
    checkMerchant();
  }, [mode]);

  const checkMerchant = async () => {
    const { data, error } = await $fetch({
      url: "/api/gateway/merchant",
      silent: true,
    });

    if (error || !data?.merchant) {
      setNeedsRegistration(true);
    }
    setCheckingMerchant(false);
  };

  if (checkingMerchant) {
    return <GatewayPaymentLoading />;
  }

  if (needsRegistration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="p-6 rounded-full bg-primary/10">
          <CreditCard className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Become a Merchant</h1>
          <p className="text-muted-foreground max-w-md">
            Register as a payment gateway merchant to start accepting payments from customers
            through our platform.
          </p>
        </div>
        <Link href="/gateway/register">
          <Button size="lg">Register as Merchant</Button>
        </Link>
      </div>
    );
  }

  return (
    <DataTable
      key={mode}
      apiEndpoint={`/api/gateway/payment?mode=${mode}`}
      model="gatewayPayment"
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      title="Transaction History"
      description="View and manage all your payment transactions"
      itemTitle="Payment"
      columns={columns}
      isParanoid={false}
      extraTopButtons={() => (
        <Link href="/gateway/dashboard">
          <Button variant="outline" size="sm">
            Back to Dashboard
          </Button>
        </Link>
      )}
      expandedButtons={(row) => (
        <div className="flex gap-2">
          <Link href={`/gateway/payment/${row.id}`}>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
          </Link>
        </div>
      )}
      design={{
        animation: "orbs",
        primaryColor: "#6366F1", // indigo-500
        secondaryColor: "#06B6D4", // cyan-500
        badge: "Payment History",
        icon: CreditCard,
        detailsAlignment: "bottom",
      }}
    />
  );
}
