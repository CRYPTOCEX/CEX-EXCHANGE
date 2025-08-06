import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface P2PError {
  code?: string;
  message: string;
  statusCode?: number;
  details?: any;
}

export function useP2PErrorToast() {
  const { toast } = useToast();
  const t = useTranslations("ext");

  const showError = (error: P2PError | Error | any) => {
    let title = t("error");
    let description = t("something_went_wrong");
    let action = undefined;

    // Parse error details
    if (error?.response?.data) {
      // API error response
      const data = error.response.data;
      description = data.message || description;
      
      // Handle specific error codes
      switch (data.statusCode || error.response.status) {
        case 400:
          title = t("invalid_request");
          break;
        case 401:
          title = t("authentication_required");
          action = {
            label: t("login"),
            onClick: () => window.location.href = "/login",
          };
          break;
        case 403:
          title = t("access_denied");
          break;
        case 404:
          title = t("not_found");
          break;
        case 409:
          title = t("conflict");
          break;
        case 429:
          title = t("too_many_requests");
          description = data.message || t("please_slow_down");
          break;
        case 500:
          title = t("server_error");
          description = t("please_try_again_later");
          break;
      }

      // Handle P2P specific errors
      if (data.code) {
        switch (data.code) {
          case "INSUFFICIENT_BALANCE":
            title = t("insufficient_balance");
            action = {
              label: t("deposit"),
              onClick: () => window.location.href = "/finance/deposit",
            };
            break;
          case "TRADE_EXPIRED":
            title = t("trade_expired");
            break;
          case "OFFER_UNAVAILABLE":
            title = t("offer_unavailable");
            break;
          case "PAYMENT_METHOD_REQUIRED":
            title = t("payment_method_required");
            action = {
              label: t("add_payment_method"),
              onClick: () => window.location.href = "/p2p/settings/payment-methods",
            };
            break;
          case "KYC_REQUIRED":
            title = t("verification_required");
            action = {
              label: t("verify_account"),
              onClick: () => window.location.href = "/user/profile/kyc",
            };
            break;
        }
      }
    } else if (error?.message) {
      // Regular error object
      description = error.message;
    } else if (typeof error === "string") {
      // String error
      description = error;
    }

    // Show toast
    toast({
      variant: "destructive",
      title,
      description,
      action: action ? (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ) : undefined,
    });
  };

  const showSuccess = (message: string, title?: string) => {
    toast({
      title: title || t("success"),
      description: message,
    });
  };

  const showWarning = (message: string, title?: string) => {
    toast({
      variant: "default",
      title: title || t("warning"),
      description: message,
      className: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
    });
  };

  const showInfo = (message: string, title?: string) => {
    toast({
      title: title || t("info"),
      description: message,
    });
  };

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
}

// Utility function to handle P2P API errors
export function handleP2PError(error: any): P2PError {
  if (error?.response?.data) {
    return {
      code: error.response.data.code,
      message: error.response.data.message || "An error occurred",
      statusCode: error.response.status,
      details: error.response.data.details,
    };
  }

  if (error?.message) {
    return {
      message: error.message,
    };
  }

  return {
    message: "An unexpected error occurred",
  };
}