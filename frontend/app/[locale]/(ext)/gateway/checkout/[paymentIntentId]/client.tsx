"use client";

import { useParams } from "next/navigation";
import { useConfigStore } from "@/store/config";
import { useCheckout, DesignV1, DesignV2, DesignV3, DesignV4, DesignV5 } from "./designs";
import type { CheckoutDesignVariant } from "./designs";

const DESIGN_COMPONENTS = {
  v1: DesignV1,
  v2: DesignV2,
  v3: DesignV3,
  v4: DesignV4,
  v5: DesignV5,
} as const;

export default function CheckoutClient() {
  const params = useParams();
  const paymentIntentId = params.paymentIntentId as string;
  const { settings } = useConfigStore();

  // Get design from admin settings, default to v2 (Dark Premium)
  const designSetting = settings?.gatewayCheckoutDesign as CheckoutDesignVariant | undefined;
  const design: CheckoutDesignVariant = designSetting && DESIGN_COMPONENTS[designSetting] ? designSetting : "v2";

  const { state, actions } = useCheckout(paymentIntentId);

  const DesignComponent = DESIGN_COMPONENTS[design];

  return (
    <DesignComponent
      state={state}
      actions={actions}
      paymentIntentId={paymentIntentId}
    />
  );
}
