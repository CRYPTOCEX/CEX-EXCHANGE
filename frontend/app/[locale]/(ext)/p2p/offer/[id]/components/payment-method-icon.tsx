import {
  CreditCard,
  Landmark,
  Wallet,
  Smartphone,
  DollarSign,
} from "lucide-react";

interface PaymentMethodIconProps {
  methodId?: string;
  icon?: string;
  className?: string;
}

export function PaymentMethodIcon({
  methodId,
  icon = "credit-card",
  className = "h-5 w-5 mr-2",
}: PaymentMethodIconProps) {
  // Use icon if provided, otherwise fallback to methodId
  const iconType = icon || methodId || "credit-card";

  switch (iconType.toLowerCase()) {
    case "bank":
    case "bank-transfer":
      return <Landmark className={`text-blue-500 ${className}`} />;
    case "wallet":
    case "e-wallet":
      return <Wallet className={`text-green-500 ${className}`} />;
    case "mobile":
    case "mobile-money":
      return <Smartphone className={`text-purple-500 ${className}`} />;
    case "cash":
      return <DollarSign className={`text-yellow-500 ${className}`} />;
    case "credit-card":
    case "debit-card":
    case "card":
    default:
      return <CreditCard className={`text-gray-500 ${className}`} />;
  }
}
