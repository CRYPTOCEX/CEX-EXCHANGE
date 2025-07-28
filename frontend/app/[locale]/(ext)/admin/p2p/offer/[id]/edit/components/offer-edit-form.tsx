"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  DollarSign,
  Globe,
  Info,
  MessageSquare,
  Shield,
  Tag,
  Timer,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface OfferEditFormProps {
  offer: any;
  onChange: (field: string, value: any) => void;
}
export function OfferEditForm({ offer, onChange }: OfferEditFormProps) {
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<
    string[]
  >(Array.isArray(offer?.paymentMethods) ? offer.paymentMethods : []);

  // Keep selected payment methods in sync with offer data
  useEffect(() => {
    if (offer?.paymentMethods && Array.isArray(offer.paymentMethods)) {
      setSelectedPaymentMethods(offer.paymentMethods);
    }
  }, [offer?.paymentMethods]);
  const handlePaymentMethodToggle = (method: string) => {
    setSelectedPaymentMethods((prev) => {
      const newMethods = prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method];

      // Make sure to update the parent form data
      onChange("paymentMethods", newMethods);
      return newMethods;
    });
  };
  const paymentMethods = [
    "Bank Transfer",
    "PayPal",
    "Venmo",
    "Cash App",
    "Zelle",
    "Revolut",
    "Wise",
    "Alipay",
    "WeChat Pay",
    "UPI",
    "SEPA",
    "Cash in Person",
  ];
  return (
    <div className="space-y-6">
      <Card className="dark:border-slate-700/50 dark:bg-slate-900/30">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Edit the core details of this offer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type" className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Offer Type
                </Label>
                <RadioGroup
                  id="type"
                  value={offer?.type || "BUY"}
                  onValueChange={(value) => onChange("type", value)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="BUY" id="buy" />
                    <Label htmlFor="buy">Buy</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="SELL" id="sell" />
                    <Label htmlFor="sell">Sell</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="crypto" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Cryptocurrency
                </Label>
                <Select
                  value={offer?.crypto || "Bitcoin (BTC)"}
                  onValueChange={(value) => onChange("crypto", value)}
                >
                  <SelectTrigger id="crypto">
                    <SelectValue placeholder="Select cryptocurrency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bitcoin (BTC)">Bitcoin (BTC)</SelectItem>
                    <SelectItem value="Ethereum (ETH)">
                      Ethereum (ETH)
                    </SelectItem>
                    <SelectItem value="Tether (USDT)">Tether (USDT)</SelectItem>
                    <SelectItem value="USD Coin (USDC)">
                      USD Coin (USDC)
                    </SelectItem>
                    <SelectItem value="Binance Coin (BNB)">
                      Binance Coin (BNB)
                    </SelectItem>
                    <SelectItem value="XRP (XRP)">XRP (XRP)</SelectItem>
                    <SelectItem value="Cardano (ADA)">Cardano (ADA)</SelectItem>
                    <SelectItem value="Solana (SOL)">Solana (SOL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Price
                </Label>
                <Input
                  id="price"
                  value={offer?.price?.replace(/[^0-9.]/g, "") || ""}
                  onChange={(e) => onChange("price", `$${e.target.value}`)}
                  placeholder="Enter price in USD"
                  type="number"
                  step="0.01"
                  min="0"
                  className="dark:bg-slate-800/50 dark:border-slate-700/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="limits" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Limits
                </Label>
                <Input
                  id="limits"
                  value={offer?.limits || ""}
                  onChange={(e) => onChange("limits", e.target.value)}
                  placeholder="e.g. $100 - $5,000"
                  className="dark:bg-slate-800/50 dark:border-slate-700/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeLimit" className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  Time Limit
                </Label>
                <Select
                  value={offer?.timeLimit || "30 minutes"}
                  onValueChange={(value) => onChange("timeLimit", value)}
                >
                  <SelectTrigger id="timeLimit">
                    <SelectValue placeholder="Select time limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15 minutes">15 minutes</SelectItem>
                    <SelectItem value="30 minutes">30 minutes</SelectItem>
                    <SelectItem value="45 minutes">45 minutes</SelectItem>
                    <SelectItem value="1 hour">1 hour</SelectItem>
                    <SelectItem value="2 hours">2 hours</SelectItem>
                    <SelectItem value="3 hours">3 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Location
                </Label>
                <Select
                  value={offer?.location || "Global"}
                  onValueChange={(value) => onChange("location", value)}
                >
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Global">Global</SelectItem>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="European Union">
                      European Union
                    </SelectItem>
                    <SelectItem value="United Kingdom">
                      United Kingdom
                    </SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="Australia">Australia</SelectItem>
                    <SelectItem value="Asia">Asia</SelectItem>
                    <SelectItem value="Africa">Africa</SelectItem>
                    <SelectItem value="South America">South America</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="userRequirements"
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                User Requirements
              </Label>
              <Input
                id="userRequirements"
                value={offer?.userRequirements || ""}
                onChange={(e) => onChange("userRequirements", e.target.value)}
                placeholder="e.g. Verified users with 3+ trades"
                className="dark:bg-slate-800/50 dark:border-slate-700/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Payment Methods
              </Label>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((method) => {
                  return (
                    <Badge
                      key={method}
                      variant={
                        selectedPaymentMethods.includes(method)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer transition-colors hover:bg-primary/90 dark:hover:bg-primary/80"
                      onClick={() => handlePaymentMethodToggle(method)}
                    >
                      {method}
                      {selectedPaymentMethods.includes(method) && (
                        <span className="ml-1 text-xs">✓</span>
                      )}
                    </Badge>
                  );
                })}
              </div>
              {selectedPaymentMethods.length === 0 && (
                <p className="text-sm text-destructive">
                  Please select at least one payment method
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Status
              </Label>
              <Select
                value={offer?.status || "active"}
                onValueChange={(value) => onChange("status", value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="dark:border-slate-700/50 dark:bg-slate-900/30">
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
          <CardDescription>Add notes and terms for this offer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="terms" className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Terms and Conditions
              </Label>
              <Textarea
                id="terms"
                value={offer?.terms || ""}
                onChange={(e) => onChange("terms", e.target.value)}
                placeholder="Enter any specific terms or conditions for this offer"
                className="min-h-[100px] dark:bg-slate-800/50 dark:border-slate-700/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminNotes" className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Admin Notes (Internal Only)
              </Label>
              <Textarea
                id="adminNotes"
                value={offer?.adminNotes || ""}
                onChange={(e) => onChange("adminNotes", e.target.value)}
                placeholder="Add internal notes about this offer (not visible to users)"
                className="min-h-[100px] dark:bg-slate-800/50 dark:border-slate-700/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
