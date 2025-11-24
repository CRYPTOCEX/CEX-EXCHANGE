"use client";

import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  X,
  AlertTriangle,
  Info,
  DollarSign,
  Globe,
  Shield,
  CreditCard,
  FileText,
  MapPin,
  User,
  Settings,
  TrendingUp,
  Clock,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";
import { adminOffersStore } from "@/store/p2p/admin-offers-store";

interface OfferEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string | null;
  onSuccess?: () => void;
}

// Helper function to parse JSON safely
const safeJsonParse = (jsonString: any, defaultValue = {}) => {
  try {
    if (typeof jsonString === 'object') return jsonString;
    return jsonString ? JSON.parse(jsonString) : defaultValue;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return defaultValue;
  }
};

export default function OfferEditDrawer({ isOpen, onClose, offerId, onSuccess }: OfferEditDrawerProps) {
  const t = useTranslations("ext");
  const { toast } = useToast();
  const { updateOffer } = adminOffersStore();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<{
    basic?: string[];
    pricing?: string[];
    payment?: string[];
    location?: string[];
    requirements?: string[];
    settings?: string[];
  }>({});
  
  // Form state - comprehensive with all fields
  const [formData, setFormData] = useState({
    // Basic Settings
    type: "BUY" as "BUY" | "SELL",
    currency: "USDT",
    walletType: "SPOT" as "SPOT" | "FIAT" | "ECO",
    status: "ACTIVE",
    
    // Amount Configuration
    amountConfig: {
      total: 0,
      min: 0,
      max: 0,
    },
    
    // Price Configuration
    priceConfig: {
      model: "FIXED" as "FIXED" | "MARKET" | "CUSTOM",
      value: 0,
      marketPrice: 0,
      finalPrice: 0,
      margin: 0,
    },
    
    // Trade Settings
    tradeSettings: {
      autoCancel: 15,
      kycRequired: false,
      visibility: "PUBLIC" as "PUBLIC" | "PRIVATE",
      termsOfTrade: "",
      additionalNotes: "",
      autoReplyMessage: "",
    },
    
    // Location Settings
    locationSettings: {
      country: "",
      region: "",
      city: "",
      restrictions: [] as string[],
    },
    
    // User Requirements
    userRequirements: {
      minCompletedTrades: 0,
      minSuccessRate: 0,
      minAccountAge: 0,
      trustedOnly: false,
      verifiedOnly: false,
    },
    
    // Payment Methods
    paymentMethodIds: [] as string[],
    
    // Admin Notes
    adminNotes: "",
  });

  // Load payment methods and countries
  useEffect(() => {
    async function loadData() {
      try {
        // Load payment methods
        const { data: methodsData } = await $fetch({
          url: "/api/p2p/payment-method",
          method: "GET",
          silent: true,
        });
        if (methodsData) {
          setPaymentMethods(methodsData);
        }

        // Load countries (you might need to adjust this endpoint)
        const countriesData = [
          { code: "US", name: "United States" },
          { code: "GB", name: "United Kingdom" },
          { code: "AX", name: "Åland Islands" },
          { code: "IQ", name: "Iraq" },
          // Add more countries as needed
        ];
        setCountries(countriesData);
      } catch (err) {
        console.error("Error loading data:", err);
      }
    }
    loadData();
  }, []);

  // Function to process offer data
  const processOfferData = (offerData: any) => {
    console.log("=== PROCESS OFFER DATA ===");
    if (!offerData) {
      console.log("No offer data to process");
      return;
    }
    
    console.log("Raw offer data:", offerData);
    
    // Parse all JSON fields
    const amountConfig = safeJsonParse(offerData.amountConfig, {});
    const priceConfig = safeJsonParse(offerData.priceConfig, {});
    const tradeSettings = safeJsonParse(offerData.tradeSettings, {});
    const locationSettings = safeJsonParse(offerData.locationSettings, {});
    const userRequirements = safeJsonParse(offerData.userRequirements, {});
    
    console.log("Parsed configs:", {
      amountConfig,
      priceConfig,
      tradeSettings,
      locationSettings,
      userRequirements
    });
    
    // Extract payment method IDs
    const paymentMethodIds = Array.isArray(offerData.paymentMethods)
      ? offerData.paymentMethods.map((pm: any) => pm.id)
      : [];
    
    setSelectedPaymentMethods(paymentMethodIds);
    
    // Set form data
    setFormData({
      type: offerData.type || "BUY",
      currency: offerData.currency || "USDT",
      walletType: offerData.walletType || "SPOT",
      status: offerData.status || "ACTIVE",
      
      amountConfig: {
        total: Number(amountConfig.total) || 0,
        min: Number(amountConfig.min) || 0,
        max: Number(amountConfig.max) || 0,
      },
      
      priceConfig: {
        model: priceConfig.model || "FIXED",
        value: Number(priceConfig.value) || 0,
        marketPrice: Number(priceConfig.marketPrice) || 0,
        finalPrice: Number(priceConfig.finalPrice) || 0,
        margin: Number(priceConfig.margin) || 0,
      },
      
      tradeSettings: {
        autoCancel: Number(tradeSettings.autoCancel) || 15,
        kycRequired: Boolean(tradeSettings.kycRequired),
        visibility: tradeSettings.visibility || "PUBLIC",
        termsOfTrade: String(tradeSettings.termsOfTrade || ""),
        additionalNotes: String(tradeSettings.additionalNotes || ""),
        autoReplyMessage: String(tradeSettings.autoReplyMessage || ""),
      },
      
      locationSettings: {
        country: String(locationSettings.country || ""),
        region: String(locationSettings.region || ""),
        city: String(locationSettings.city || ""),
        restrictions: Array.isArray(locationSettings.restrictions) 
          ? locationSettings.restrictions 
          : [],
      },
      
      userRequirements: {
        minCompletedTrades: Number(userRequirements.minCompletedTrades) || 0,
        minSuccessRate: Number(userRequirements.minSuccessRate) || 0,
        minAccountAge: Number(userRequirements.minAccountAge) || 0,
        trustedOnly: Boolean(userRequirements.trustedOnly),
        verifiedOnly: Boolean(userRequirements.verifiedOnly),
      },
      
      paymentMethodIds: paymentMethodIds,
      adminNotes: offerData.adminNotes || "",
    });
    
    console.log("Processed offer data:", offerData);
    console.log("Parsed form data:", {
      type: offerData.type,
      status: offerData.status,
      paymentMethodIds,
    });
  };

  // Load offer data when drawer opens
  useEffect(() => {
    if (isOpen && offerId) {
      loadOfferData();
    }
  }, [isOpen, offerId]);

  const loadOfferData = async () => {
    if (!offerId) return;
    
    setLoading(true);
    try {
      console.log("Loading offer with ID:", offerId);
      // Load the offer data directly via API
      const { data, error } = await $fetch({
        url: `/api/admin/p2p/offer/${offerId}`,
        method: "GET",
        silent: true,
      });
      
      if (error) {
        throw new Error(error);
      }
      
      if (data) {
        console.log("Offer loaded directly:", data);
        // Process the data immediately
        processOfferData(data);
      }
    } catch (err) {
      console.error("Error loading offer:", err);
      toast({
        title: "Error",
        description: "Failed to load offer details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Validate form data
  const validateForm = () => {
    const errors: typeof validationErrors = {};
    let hasErrors = false;
    
    // Basic validation
    const basicErrors: string[] = [];
    if (!formData.currency) {
      basicErrors.push("Currency is required");
    }
    if (!formData.type) {
      basicErrors.push("Trade type is required");
    }
    if (!formData.walletType) {
      basicErrors.push("Wallet type is required");
    }
    if (basicErrors.length > 0) {
      errors.basic = basicErrors;
      hasErrors = true;
    }
    
    // Pricing validation
    const pricingErrors: string[] = [];
    if (formData.amountConfig.total <= 0) {
      pricingErrors.push("Total amount must be greater than 0");
    }
    if (formData.amountConfig.min < 0) {
      pricingErrors.push("Minimum amount cannot be negative");
    }
    if (formData.amountConfig.max < 0) {
      pricingErrors.push("Maximum amount cannot be negative");
    }
    if (formData.amountConfig.min > formData.amountConfig.max && formData.amountConfig.max > 0) {
      pricingErrors.push("Minimum amount cannot be greater than maximum amount");
    }
    if (formData.priceConfig.value <= 0 && formData.priceConfig.model === "FIXED") {
      pricingErrors.push("Price must be greater than 0 for fixed pricing");
    }
    if (pricingErrors.length > 0) {
      errors.pricing = pricingErrors;
      hasErrors = true;
    }
    
    // Payment validation
    const paymentErrors: string[] = [];
    if (selectedPaymentMethods.length === 0) {
      paymentErrors.push("At least one payment method is required");
    }
    if (paymentErrors.length > 0) {
      errors.payment = paymentErrors;
      hasErrors = true;
    }
    
    // Settings validation
    const settingsErrors: string[] = [];
    if (formData.tradeSettings.autoCancel <= 0) {
      settingsErrors.push("Auto-cancel time must be greater than 0");
    }
    if (settingsErrors.length > 0) {
      errors.settings = settingsErrors;
      hasErrors = true;
    }
    
    setValidationErrors(errors);
    return !hasErrors;
  };

  const handleSubmit = async () => {
    console.log("=== HANDLESUBMIT START ===");
    console.log("formData:", formData);
    console.log("selectedPaymentMethods:", selectedPaymentMethods);
    
    // Clear previous errors
    setValidationErrors({});
    
    // Validate form
    if (!validateForm()) {
      console.log("Validation failed, errors:", validationErrors);
      
      // Find first tab with errors
      const tabsWithErrors = Object.keys(validationErrors);
      if (tabsWithErrors.length > 0) {
        setActiveTab(tabsWithErrors[0]);
      }
      
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving",
        variant: "destructive",
      });
      return;
    }

    if (!offerId) {
      console.log("Validation failed: No offer ID");
      toast({
        title: "Error",
        description: "No offer ID provided",
        variant: "destructive",
      });
      return;
    }
    
    console.log("All validations passed, proceeding with save...");

    setSaving(true);
    
    try {
      // Prepare data for API
      const submitData = {
        type: formData.type,
        currency: formData.currency,
        walletType: formData.walletType,
        status: formData.status,
        amountConfig: JSON.stringify(formData.amountConfig),
        priceConfig: JSON.stringify(formData.priceConfig),
        tradeSettings: JSON.stringify(formData.tradeSettings),
        locationSettings: JSON.stringify(formData.locationSettings),
        userRequirements: JSON.stringify(formData.userRequirements),
        paymentMethodIds: selectedPaymentMethods,
        adminNotes: formData.adminNotes,
      };

      console.log("=== SAVE DEBUG ===");
      console.log("Submitting data:", submitData);
      console.log("Offer ID:", offerId);
      console.log("About to call updateOffer...");

      // Use the store's updateOffer function
      const response = await updateOffer(offerId, submitData);
      
      console.log("Update response:", response);
      console.log("=== END SAVE DEBUG ===");

      toast({
        title: "Success",
        description: response?.message || "Offer updated successfully",
      });
      
      // Call onSuccess to refresh the DataTable
      if (onSuccess) {
        console.log("Calling onSuccess callback");
        onSuccess();
      } else {
        console.log("No onSuccess callback, closing drawer");
        onClose();
      }
    } catch (err: any) {
      console.error("=== SAVE ERROR ===");
      console.error("Error updating offer:", err);
      console.error("Error details:", {
        message: err?.message,
        stack: err?.stack,
        response: err?.response,
      });
      toast({
        title: "Error",
        description: err?.message || "Failed to update offer",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      console.log("Save operation completed, saving state reset");
    }
  };

  const togglePaymentMethod = (methodId: string) => {
    setSelectedPaymentMethods(prev =>
      prev.includes(methodId)
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId]
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        className="!w-[90vw] !max-w-[90vw] min-w-[90vw] p-0 !h-[100vh] !max-h-[100vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        aria-describedby="edit-offer-description"
      >
        <SheetHeader className="p-6 pb-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-left text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Edit P2P Offer
              </SheetTitle>
              <SheetDescription id="edit-offer-description" className="text-left mt-1">
                Modify the offer details, pricing, payment methods, and requirements
              </SheetDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={saving || loading}
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* Error Summary */}
              {Object.keys(validationErrors).length > 0 && (
                <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <AlertDescription className="text-orange-900 dark:text-orange-200">
                    <div className="font-semibold mb-2">Please fix the following errors:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {Object.entries(validationErrors).map(([tab, errors]) => (
                        <li key={tab}>
                          <span className="font-medium capitalize">{tab} tab:</span> {errors.length} error{errors.length > 1 ? 's' : ''}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6 mb-6">
                  <TabsTrigger value="basic" className="relative">
                    Basic
                    {validationErrors.basic && validationErrors.basic.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="relative">
                    Pricing
                    {validationErrors.pricing && validationErrors.pricing.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="relative">
                    Payment
                    {validationErrors.payment && validationErrors.payment.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="location" className="relative">
                    Location
                    {validationErrors.location && validationErrors.location.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="requirements" className="relative">
                    Requirements
                    {validationErrors.requirements && validationErrors.requirements.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="relative">
                    Settings
                    {validationErrors.settings && validationErrors.settings.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-6">
                  {validationErrors.basic && validationErrors.basic.length > 0 && (
                    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
                      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <AlertDescription className="text-orange-900 dark:text-orange-200">
                        <ul className="list-disc list-inside">
                          {validationErrors.basic.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Trade Type <span className="text-red-500">*</span></Label>
                          <RadioGroup
                            value={formData.type}
                            onValueChange={(value) => 
                              setFormData({ ...formData, type: value as "BUY" | "SELL" })
                            }
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
                          <Label>Status</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) => 
                              setFormData({ ...formData, status: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ACTIVE">Active</SelectItem>
                              <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                              <SelectItem value="PAUSED">Paused</SelectItem>
                              <SelectItem value="DISABLED">Disabled</SelectItem>
                              <SelectItem value="FLAGGED">Flagged</SelectItem>
                              <SelectItem value="REJECTED">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Currency <span className="text-red-500">*</span></Label>
                          <Select
                            value={formData.currency}
                            onValueChange={(value) => 
                              setFormData({ ...formData, currency: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USDT">USDT</SelectItem>
                              <SelectItem value="BTC">BTC</SelectItem>
                              <SelectItem value="ETH">ETH</SelectItem>
                              <SelectItem value="USDC">USDC</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Wallet Type <span className="text-red-500">*</span></Label>
                          <Select
                            value={formData.walletType}
                            onValueChange={(value) => 
                              setFormData({ ...formData, walletType: value as any })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SPOT">Spot</SelectItem>
                              <SelectItem value="FIAT">Fiat</SelectItem>
                              <SelectItem value="ECO">Eco</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Pricing Tab */}
                <TabsContent value="pricing" className="space-y-6">
                  {validationErrors.pricing && validationErrors.pricing.length > 0 && (
                    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
                      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <AlertDescription className="text-orange-900 dark:text-orange-200">
                        <ul className="list-disc list-inside">
                          {validationErrors.pricing.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Pricing & Amount
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Pricing Model</Label>
                        <RadioGroup
                          value={formData.priceConfig.model}
                          onValueChange={(value) => 
                            setFormData({
                              ...formData,
                              priceConfig: { ...formData.priceConfig, model: value as any }
                            })
                          }
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="FIXED" id="fixed" />
                            <Label htmlFor="fixed">Fixed Price</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="MARKET" id="market" />
                            <Label htmlFor="market">Market Price</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="CUSTOM" id="custom" />
                            <Label htmlFor="custom">Custom Formula</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Price</Label>
                          <Input
                            type="number"
                            value={formData.priceConfig.value}
                            onChange={(e) => 
                              setFormData({
                                ...formData,
                                priceConfig: { 
                                  ...formData.priceConfig, 
                                  value: parseFloat(e.target.value) || 0 
                                }
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Margin (%)</Label>
                          <Input
                            type="number"
                            value={formData.priceConfig.margin}
                            onChange={(e) => 
                              setFormData({
                                ...formData,
                                priceConfig: { 
                                  ...formData.priceConfig, 
                                  margin: parseFloat(e.target.value) || 0 
                                }
                              })
                            }
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="font-medium">Amount Limits</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Total Available <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              value={formData.amountConfig.total}
                              onChange={(e) => 
                                setFormData({
                                  ...formData,
                                  amountConfig: { 
                                    ...formData.amountConfig, 
                                    total: parseFloat(e.target.value) || 0 
                                  }
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Minimum Order</Label>
                            <Input
                              type="number"
                              value={formData.amountConfig.min}
                              onChange={(e) => 
                                setFormData({
                                  ...formData,
                                  amountConfig: { 
                                    ...formData.amountConfig, 
                                    min: parseFloat(e.target.value) || 0 
                                  }
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Maximum Order</Label>
                            <Input
                              type="number"
                              value={formData.amountConfig.max}
                              onChange={(e) => 
                                setFormData({
                                  ...formData,
                                  amountConfig: { 
                                    ...formData.amountConfig, 
                                    max: parseFloat(e.target.value) || 0 
                                  }
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Payment Methods Tab */}
                <TabsContent value="payment" className="space-y-6">
                  {validationErrors.payment && validationErrors.payment.length > 0 && (
                    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
                      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <AlertDescription className="text-orange-900 dark:text-orange-200">
                        <ul className="list-disc list-inside">
                          {validationErrors.payment.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Methods <span className="text-red-500">*</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {paymentMethods.map((method) => (
                          <div
                            key={method.id}
                            className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            <Checkbox
                              id={method.id}
                              checked={selectedPaymentMethods.includes(method.id)}
                              onCheckedChange={() => togglePaymentMethod(method.id)}
                            />
                            <Label
                              htmlFor={method.id}
                              className="flex-1 cursor-pointer flex items-center gap-3"
                            >
                              {method.icon && (
                                <CreditCard className="h-4 w-4 text-zinc-400" />
                              )}
                              <span>{method.name}</span>
                            </Label>
                          </div>
                        ))}
                        {paymentMethods.length === 0 && (
                          <p className="text-center text-zinc-500 py-4">
                            No payment methods available
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Location Tab */}
                <TabsContent value="location" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Location Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Country</Label>
                          <Select
                            value={formData.locationSettings.country}
                            onValueChange={(value) => 
                              setFormData({
                                ...formData,
                                locationSettings: { 
                                  ...formData.locationSettings, 
                                  country: value 
                                }
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Region</Label>
                          <Input
                            value={formData.locationSettings.region}
                            onChange={(e) => 
                              setFormData({
                                ...formData,
                                locationSettings: { 
                                  ...formData.locationSettings, 
                                  region: e.target.value 
                                }
                              })
                            }
                            placeholder="Enter region"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input
                            value={formData.locationSettings.city}
                            onChange={(e) => 
                              setFormData({
                                ...formData,
                                locationSettings: { 
                                  ...formData.locationSettings, 
                                  city: e.target.value 
                                }
                              })
                            }
                            placeholder="Enter city"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Restricted Countries</Label>
                        <Textarea
                          value={formData.locationSettings.restrictions.join(", ")}
                          onChange={(e) => 
                            setFormData({
                              ...formData,
                              locationSettings: { 
                                ...formData.locationSettings, 
                                restrictions: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                              }
                            })
                          }
                          placeholder="Enter countries separated by commas"
                          rows={3}
                        />
                        <p className="text-xs text-zinc-500">
                          Users from these countries will not be able to trade with this offer
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* User Requirements Tab */}
                <TabsContent value="requirements" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        User Requirements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Minimum Completed Trades</Label>
                          <Input
                            type="number"
                            value={formData.userRequirements.minCompletedTrades}
                            onChange={(e) => 
                              setFormData({
                                ...formData,
                                userRequirements: { 
                                  ...formData.userRequirements, 
                                  minCompletedTrades: parseInt(e.target.value) || 0 
                                }
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Minimum Success Rate (%)</Label>
                          <Input
                            type="number"
                            value={formData.userRequirements.minSuccessRate}
                            onChange={(e) => 
                              setFormData({
                                ...formData,
                                userRequirements: { 
                                  ...formData.userRequirements, 
                                  minSuccessRate: parseInt(e.target.value) || 0 
                                }
                              })
                            }
                            max="100"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Minimum Account Age (days)</Label>
                        <Input
                          type="number"
                          value={formData.userRequirements.minAccountAge}
                          onChange={(e) => 
                            setFormData({
                              ...formData,
                              userRequirements: { 
                                ...formData.userRequirements, 
                                minAccountAge: parseInt(e.target.value) || 0 
                              }
                            })
                          }
                        />
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Trusted Users Only</Label>
                            <p className="text-xs text-zinc-500">
                              Only users marked as trusted can trade
                            </p>
                          </div>
                          <Switch
                            checked={formData.userRequirements.trustedOnly}
                            onCheckedChange={(checked) => 
                              setFormData({
                                ...formData,
                                userRequirements: { 
                                  ...formData.userRequirements, 
                                  trustedOnly: checked 
                                }
                              })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Verified Users Only</Label>
                            <p className="text-xs text-zinc-500">
                              Only KYC verified users can trade
                            </p>
                          </div>
                          <Switch
                            checked={formData.userRequirements.verifiedOnly}
                            onCheckedChange={(checked) => 
                              setFormData({
                                ...formData,
                                userRequirements: { 
                                  ...formData.userRequirements, 
                                  verifiedOnly: checked 
                                }
                              })
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-6">
                  {validationErrors.settings && validationErrors.settings.length > 0 && (
                    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
                      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <AlertDescription className="text-orange-900 dark:text-orange-200">
                        <ul className="list-disc list-inside">
                          {validationErrors.settings.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Trade Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Auto-Cancel Time (minutes)</Label>
                          <Input
                            type="number"
                            value={formData.tradeSettings.autoCancel}
                            onChange={(e) => 
                              setFormData({
                                ...formData,
                                tradeSettings: { 
                                  ...formData.tradeSettings, 
                                  autoCancel: parseInt(e.target.value) || 15 
                                }
                              })
                            }
                          />
                          <p className="text-xs text-zinc-500">
                            Unpaid orders will be cancelled after this time
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Visibility</Label>
                          <RadioGroup
                            value={formData.tradeSettings.visibility}
                            onValueChange={(value) => 
                              setFormData({
                                ...formData,
                                tradeSettings: { 
                                  ...formData.tradeSettings, 
                                  visibility: value as any 
                                }
                              })
                            }
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="PUBLIC" id="public" />
                              <Label htmlFor="public">Public</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="PRIVATE" id="private" />
                              <Label htmlFor="private">Private</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>KYC Required</Label>
                          <p className="text-xs text-zinc-500">
                            Users must complete KYC to trade
                          </p>
                        </div>
                        <Switch
                          checked={formData.tradeSettings.kycRequired}
                          onCheckedChange={(checked) => 
                            setFormData({
                              ...formData,
                              tradeSettings: { 
                                ...formData.tradeSettings, 
                                kycRequired: checked 
                              }
                            })
                          }
                        />
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Terms of Trade</Label>
                          <Textarea
                            value={formData.tradeSettings.termsOfTrade}
                            onChange={(e) => 
                              setFormData({
                                ...formData,
                                tradeSettings: { 
                                  ...formData.tradeSettings, 
                                  termsOfTrade: e.target.value 
                                }
                              })
                            }
                            placeholder="Enter your trading terms and conditions"
                            rows={4}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Auto-Reply Message</Label>
                          <Textarea
                            value={formData.tradeSettings.autoReplyMessage}
                            onChange={(e) => 
                              setFormData({
                                ...formData,
                                tradeSettings: { 
                                  ...formData.tradeSettings, 
                                  autoReplyMessage: e.target.value 
                                }
                              })
                            }
                            placeholder="Message sent automatically when trade starts"
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Additional Notes</Label>
                          <Textarea
                            value={formData.tradeSettings.additionalNotes}
                            onChange={(e) => 
                              setFormData({
                                ...formData,
                                tradeSettings: { 
                                  ...formData.tradeSettings, 
                                  additionalNotes: e.target.value 
                                }
                              })
                            }
                            placeholder="Any additional information for traders"
                            rows={3}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>Admin Notes (Internal)</Label>
                        <Textarea
                          value={formData.adminNotes}
                          onChange={(e) => 
                            setFormData({ ...formData, adminNotes: e.target.value })
                          }
                          placeholder="Internal notes about this offer (not visible to users)"
                          rows={3}
                          className="bg-yellow-50 dark:bg-yellow-950/20"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}