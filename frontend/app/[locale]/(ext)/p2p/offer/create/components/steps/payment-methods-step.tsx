"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useWizard } from "../trading-wizard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  CreditCard,
  Smartphone,
  AlertCircle,
  CheckCircle,
  BanknoteIcon as Bank,
  DollarSign,
  Wallet,
  ChevronsUpDown,
  X,
  Edit,
  Save,
  Loader2,
  Trash2,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useConfigStore } from "@/store/config";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface PaymentMethod {
  id: string;
  userId?: string;
  name: string;
  icon: string;
  description: string;
  processingTime?: string;
  fees?: string;
  available: boolean;
  popularityRank?: number;
  isCustom?: boolean;
  instructions?: string;
  metadata?: Record<string, string>; // Flexible key-value pairs for payment details
  requiresDetails: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  hasActiveTrade?: boolean;
  hasActiveOffer?: boolean;
  fields: {
    name: string;
    label: string;
    type: string;
    required: boolean;
  }[];
}

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, any> = {
  landmark: Bank,
  "credit-card": CreditCard,
  wallet: Wallet,
  smartphone: Smartphone,
  "dollar-sign": DollarSign,
  send: Wallet,
  default: CreditCard,
};
export function PaymentMethodsStep() {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { tradeData, updateTradeData, markStepComplete } = useWizard();
  const { settings } = useConfigStore();
  const { toast } = useToast();
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<Record<string, any>>({});
  const [newMethodOpen, setNewMethodOpen] = useState(false);
  const [newMethodName, setNewMethodName] = useState("");
  const [newMethodInstructions, setNewMethodInstructions] = useState("");
  const [newMethodDescription, setNewMethodDescription] = useState("");
  const [newMethodProcessingTime, setNewMethodProcessingTime] = useState("");
  const [newMethodMetadata, setNewMethodMetadata] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" }, // Start with one empty field
  ]);
  const [customMethods, setCustomMethods] = useState<PaymentMethod[]>([]);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingMethod, setIsCreatingMethod] = useState(false);
  const [isUpdatingMethod, setIsUpdatingMethod] = useState(false);
  const [isDeletingMethod, setIsDeletingMethod] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<string | null>(null);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<
    PaymentMethod[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  // Toggle edit mode
  const toggleEditMode = (methodId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent card toggle when clicking edit button
    }
    if (editMode === methodId) {
      // If we're turning off edit mode, save the payment details
      updateCustomMethod(methodId);
    }
    setEditMode(editMode === methodId ? null : methodId);
  };

  // Handle updating instructions for custom methods
  const handleUpdateInstructions = (methodId: string, instructions: string) => {
    setCustomMethods((prev) =>
      prev.map((method) =>
        method.id === methodId
          ? {
              ...method,
              instructions,
            }
          : method
      )
    );
  };

  // Handle updating metadata for custom methods
  const handleUpdateMetadata = (methodId: string, key: string, value: string) => {
    setCustomMethods((prev) =>
      prev.map((method) =>
        method.id === methodId
          ? {
              ...method,
              metadata: {
                ...(method.metadata || {}),
                [key]: value,
              },
            }
          : method
      )
    );
  };

  // Handle updating metadata key (rename)
  const handleUpdateMetadataKey = (methodId: string, oldKey: string, newKey: string) => {
    setCustomMethods((prev) =>
      prev.map((method) => {
        if (method.id !== methodId || !method.metadata) return method;

        const newMetadata: Record<string, string> = {};
        for (const [k, v] of Object.entries(method.metadata)) {
          if (k === oldKey) {
            newMetadata[newKey] = v;
          } else {
            newMetadata[k] = v;
          }
        }

        return {
          ...method,
          metadata: newMetadata,
        };
      })
    );
  };

  // Handle removing metadata field
  const handleRemoveMetadataField = (methodId: string, key: string) => {
    setCustomMethods((prev) =>
      prev.map((method) => {
        if (method.id !== methodId || !method.metadata) return method;

        const newMetadata = { ...method.metadata };
        delete newMetadata[key];

        return {
          ...method,
          metadata: Object.keys(newMetadata).length > 0 ? newMetadata : undefined,
        };
      })
    );
  };

  // Handle adding metadata field to existing method
  const handleAddMetadataToMethod = (methodId: string) => {
    setCustomMethods((prev) =>
      prev.map((method) => {
        if (method.id !== methodId) return method;

        // Generate a unique placeholder key
        const existingKeys = Object.keys(method.metadata || {});
        let newKey = "";
        let counter = 1;
        while (existingKeys.includes(newKey)) {
          newKey = `field_${counter}`;
          counter++;
        }

        return {
          ...method,
          metadata: {
            ...(method.metadata || {}),
            [newKey]: "",
          },
        };
      })
    );
  };

  // Handle metadata field changes
  const handleMetadataChange = (index: number, field: "key" | "value", value: string) => {
    setNewMethodMetadata((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Add a new metadata field
  const addMetadataField = () => {
    if (newMethodMetadata.length < 20) {
      setNewMethodMetadata((prev) => [...prev, { key: "", value: "" }]);
    }
  };

  // Remove a metadata field
  const removeMetadataField = (index: number) => {
    setNewMethodMetadata((prev) => prev.filter((_, i) => i !== index));
  };

  // Convert metadata array to object for API
  const getMetadataObject = (): Record<string, string> | null => {
    const metadata: Record<string, string> = {};
    for (const { key, value } of newMethodMetadata) {
      const trimmedKey = key.trim();
      const trimmedValue = value.trim();
      if (trimmedKey && trimmedValue) {
        metadata[trimmedKey] = trimmedValue;
      }
    }
    return Object.keys(metadata).length > 0 ? metadata : null;
  };

  // Update custom method via API
  const updateCustomMethod = async (methodId: string) => {
    const method = customMethods.find((m) => m.id === methodId);
    if (!method) return;
    setIsUpdatingMethod(true);
    try {
      const { error } = await $fetch({
        url: `/api/p2p/payment-method/${methodId}`,
        method: "PUT",
        body: {
          name: method.name,
          description: method.description,
          processingTime: method.processingTime,
          instructions: method.instructions,
          metadata: method.metadata, // Include metadata in update
          available: method.available,
        },
      });
      if (error) {
        toast({
          title: "Error updating payment method",
          description: error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment method updated",
          description: `${method.name} has been updated successfully.`,
        });

        // Save to trade data in the next tick
        setTimeout(() => {
          savePaymentMethods();
        }, 0);
      }
    } catch (err) {
      console.error("Error updating payment method:", err);
      toast({
        title: "Error",
        description: "Failed to update payment method. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingMethod(false);
    }
  };

  // Delete custom method
  const deleteCustomMethod = async (methodId: string) => {
    const method = customMethods.find((m) => m.id === methodId);
    if (!method) return;
    setIsDeletingMethod(true);
    try {
      const { error } = await $fetch({
        url: `/api/p2p/payment-method/${methodId}`,
        method: "DELETE",
      });
      if (error) {
        toast({
          title: "Error deleting payment method",
          description: error,
          variant: "destructive",
        });
      } else {
        // Remove from selected methods
        setSelectedMethods((prev) => prev.filter((id) => id !== methodId));

        // Remove from custom methods
        setCustomMethods((prev) => prev.filter((m) => m.id !== methodId));
        toast({
          title: "Payment method deleted",
          description: `${method.name} has been deleted successfully.`,
        });

        // Save to trade data in the next tick
        setTimeout(() => {
          savePaymentMethods();
        }, 0);
      }
    } catch (err) {
      console.error("Error deleting payment method:", err);
      toast({
        title: "Error",
        description: "Failed to delete payment method. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingMethod(false);
      setMethodToDelete(null);
    }
  };

  // Fetch payment methods from API
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await $fetch({
          url: "/api/p2p/payment-method",
          silentSuccess: true,
        });
        if (error) {
          setError("Failed to load payment methods");
          setIsLoading(false);
          return;
        }

        // Handle new API response format: { global: [...], custom: [...] }
        if (data && typeof data === "object" && "global" in data) {
          // New format with separated global and custom methods
          const globalMethods = (data.global || []).map((method: any) => ({
            ...method,
            requiresDetails: false,
            isCustom: false,
            available: method.available === 1 || method.available === true,
            fields: [],
          }));

          const customMethodsFromAPI = (data.custom || []).map((method: any) => ({
            ...method,
            requiresDetails: false,
            isCustom: true,
            available: method.available === 1 || method.available === true,
            fields: [],
          }));

          setAvailablePaymentMethods(globalMethods);
          setCustomMethods(customMethodsFromAPI);
        } else {
          // Legacy format: flat array
          const methods =
            data && Array.isArray(data)
              ? data.map((method: any) => ({
                  ...method,
                  requiresDetails: false,
                  isCustom: !!method.userId,
                  available: method.available === 1 || method.available === true,
                  fields: [],
                }))
              : [];

          // Separate custom methods
          const customMethodsFromAPI = methods.filter(
            (m: PaymentMethod) => m.isCustom
          );
          if (customMethodsFromAPI.length > 0) {
            setCustomMethods(customMethodsFromAPI);
          }

          // Set standard methods
          setAvailablePaymentMethods(
            methods.filter((m: PaymentMethod) => !m.isCustom)
          );
        }
      } catch (err) {
        console.error("Error fetching payment methods:", err);
        setError("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPaymentMethods();
  }, []);

  // Initialize with default values - only once
  useEffect(() => {
    // Only run initialization once
    if (isInitialized) return;

    // Initialize payment methods if needed
    if (!tradeData.paymentMethods) {
      // Set default empty array in the next render cycle
      setTimeout(() => {
        updateTradeData({
          paymentMethods: [],
        });
      }, 0);
    } else if (
      tradeData.paymentMethods &&
      tradeData.paymentMethods.length > 0
    ) {
      // Extract custom methods if any
      const customMethodsFromData = tradeData.paymentMethods
        .filter(
          (m: any) =>
            m.id && typeof m.id === "string" && !m.id.startsWith("custom_")
        )
        .map((m: any) => ({
          id: m.id,
          name: m.name,
          icon: m.icon || "credit-card",
          description: m.description || "Custom payment method",
          processingTime: m.processingTime,
          fees: m.fees,
          available: true,
          isCustom: true,
          instructions: m.instructions || "",
          requiresDetails: false,
          fields: [],
        }));
      if (customMethodsFromData.length > 0) {
        setCustomMethods((prev) => {
          // Merge with existing custom methods, avoiding duplicates
          const existingIds = prev.map((m) => m.id);
          const newMethods = customMethodsFromData.filter(
            (m) => !existingIds.includes(m.id)
          );
          return [...prev, ...newMethods];
        });
      }

      // Set selected methods - create a new array to avoid reference issues
      const methodIds = tradeData.paymentMethods.map((m: any) =>
        typeof m === "string" ? m : m.id
      );
      setSelectedMethods(methodIds);

      // Initialize payment details from existing data
      const details: Record<string, any> = {};
      tradeData.paymentMethods.forEach((method: any) => {
        if (typeof method === "object" && method.id) {
          details[method.id] = method.details || {};
        }
      });
      setPaymentDetails(details);
    }

    // Mark initialization as complete
    setIsInitialized(true);

    // Only mark step complete if at least one payment method is selected
    if (selectedMethods.length > 0) {
      markStepComplete(5);
    }
  }, [
    tradeData.paymentMethods,
    updateTradeData,
    isInitialized,
    markStepComplete,
  ]);

  // Add a useEffect that runs on every render to ensure the step is always marked as complete if payment methods are selected
  useEffect(() => {
    if (selectedMethods.length > 0) {
      // Use the correct step number (5 for payment-methods-step)
      markStepComplete(5);
    }
  }, [selectedMethods, markStepComplete]);

  // Save payment methods to trade data
  const savePaymentMethods = () => {
    // Create an array of payment method objects from the selected IDs
    const methods = selectedMethods.map((id) => {
      const method = [...availablePaymentMethods, ...customMethods].find(
        (m) => m.id === id
      );
      return {
        id,
        name: method?.name || id,
        description: method?.description,
        processingTime: method?.processingTime,
        fees: method?.fees,
        icon: method?.icon,
        instructions: method?.instructions || "",
        metadata: method?.metadata || null, // Include flexible payment details
        details: paymentDetails[id] || {},
      };
    });

    // Update the trade data with the selected payment methods
    updateTradeData({
      paymentMethods: methods,
      paymentMethodsCount: methods.length,
    });

    // Force mark the step as complete if methods are selected
    if (methods.length > 0) {
      markStepComplete(5);
    }
  };

  // Handle payment method selection
  const handleMethodToggle = (methodId: string) => {
    // Update the selected methods state
    const newSelectedMethods = selectedMethods.includes(methodId)
      ? selectedMethods.filter((id) => id !== methodId)
      : [...selectedMethods, methodId];
    setSelectedMethods(newSelectedMethods);

    // Create an array of payment method objects from the selected IDs
    const methods = newSelectedMethods.map((id) => {
      const method = [...availablePaymentMethods, ...customMethods].find(
        (m) => m.id === id
      );
      return {
        id,
        name: method?.name || id,
        description: method?.description,
        processingTime: method?.processingTime,
        fees: method?.fees,
        icon: method?.icon,
        instructions: method?.instructions || "",
        metadata: method?.metadata || null, // Include flexible payment details
        details: paymentDetails[id] || {},
      };
    });

    // Immediately update the trade data with the selected payment methods
    updateTradeData({
      paymentMethods: methods,
      paymentMethodsCount: methods.length,
    });

    // Force mark the step as complete if methods are selected
    if (methods.length > 0) {
      markStepComplete(5);
    }
  };

  // Handle adding a custom payment method
  const handleAddCustomMethod = async () => {
    if (!newMethodName.trim()) return;

    // At least one of instructions or metadata should be provided
    const metadata = getMetadataObject();
    if (!newMethodInstructions.trim() && !metadata) {
      toast({
        title: "Payment details required",
        description: "Please provide either payment instructions or at least one payment detail field.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingMethod(true);
    try {
      // Create a new custom payment method object
      const customMethodData = {
        name: newMethodName,
        icon: "credit-card",
        description: newMethodDescription || "Custom payment method",
        processingTime: newMethodProcessingTime || "Varies",
        instructions: newMethodInstructions,
        metadata, // Include flexible key-value pairs for payment details
        available: true,
      };

      // Send to API to create the custom method
      const { data, error } = await $fetch({
        url: "/api/p2p/payment-method",
        method: "POST",
        body: customMethodData,
      });
      if (error) {
        toast({
          title: "Error creating payment method",
          description: error,
          variant: "destructive",
        });
        setIsCreatingMethod(false);
        return;
      }

      // Get the created method with its ID from the response
      const createdMethod = data.paymentMethod || data;

      // Create a new custom method with the returned data
      const newCustomMethod = {
        id: createdMethod.id,
        userId: createdMethod.userId,
        name: createdMethod.name,
        icon: createdMethod.icon || "credit-card",
        description: createdMethod.description || "Custom payment method",
        processingTime: createdMethod.processingTime,
        fees: createdMethod.fees,
        instructions: newMethodInstructions,
        metadata: createdMethod.metadata || metadata, // Store the metadata
        available: true,
        isCustom: true,
        requiresDetails: false,
        fields: [],
      };

      // Add to custom methods
      setCustomMethods((prev) => {
        const updated = [...prev, newCustomMethod];
        return updated;
      });

      // Select the new method and save immediately
      setSelectedMethods((prev) => {
        const updated = [...prev, newCustomMethod.id];

        // Save to trade data with the updated selection
        // We need to do this in a setTimeout to ensure state has updated
        setTimeout(() => {
          const methods = updated.map((id) => {
            const allMethods = [...availablePaymentMethods, newCustomMethod];
            const method = allMethods.find((m) => m.id === id);
            return {
              id,
              name: method?.name || id,
              description: method?.description,
              processingTime: method?.processingTime,
              fees: method?.fees,
              icon: method?.icon,
              instructions: method?.instructions || "",
              metadata: method?.metadata || null, // Include flexible payment details
              details: paymentDetails[id] || {},
            };
          });
          updateTradeData({
            paymentMethods: methods,
            paymentMethodsCount: methods.length,
          });
          if (methods.length > 0) {
            markStepComplete(5);
          }
        }, 100);

        return updated;
      });

      // Show success toast
      toast({
        title: "Payment method created",
        description: `${newMethodName} has been added to your payment methods.`,
      });

      // Close dialog and reset form
      setNewMethodOpen(false);
      setNewMethodName("");
      setNewMethodDescription("");
      setNewMethodProcessingTime("");
      setNewMethodInstructions("");
      setNewMethodMetadata([{ key: "", value: "" }]); // Reset metadata fields
    } catch (err) {
      console.error("Error creating custom payment method:", err);
      toast({
        title: "Error",
        description:
          "Failed to create custom payment method. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingMethod(false);
    }
  };

  // Toggle method expansion
  const toggleMethodExpansion = (methodId: string) => {
    setExpandedMethod(expandedMethod === methodId ? null : methodId);
  };

  // Get all available methods (standard + custom)
  const getAllMethods = () => [...availablePaymentMethods, ...customMethods];

  // Get icon component for a method
  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || iconMap.default;
  };

  // Check if custom methods are allowed based on config
  const customMethodsAllowed = settings.p2pAllowCustomPaymentMethods === true;

  // Get color class for a method
  const getMethodColorClass = (methodId: string, isCustom = false) => {
    if (isCustom)
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300";
    const colorMap: Record<string, string> = {
      bank_transfer:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
      credit_card:
        "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
      paypal:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
      venmo: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
      cash_app:
        "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
      zelle:
        "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    };
    return (
      colorMap[methodId] ||
      "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300"
    );
  };
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{t("loading_payment_methods")}.</p>
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        {t("select_the_payment_methods_you")}{" "}
        {tradeData.tradeType === "buy" ? "will use to pay" : "will accept"}
        {t("for_this_trade")}. {t("you_can_select_multiple_methods")}.
      </p>

      {selectedMethods.length === 0 && (
        <Alert className="bg-red-50 dark:bg-red-900/30 border-red-200/50 dark:border-red-700/50">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-600 dark:text-red-400">
            {t("at_least_one_payment")}
          </AlertDescription>
        </Alert>
      )}

      {/* Selected Methods Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            {t("selected_payment_methods")}
          </h3>
          <Badge variant="outline" className="font-mono">
            {selectedMethods.length} {tCommon("selected")}
          </Badge>
        </div>

        {selectedMethods.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/50">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-primary/10 p-3 mb-3">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">
                {t("no_payment_methods_selected")}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {t("select_at_least_to_continue")}.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {selectedMethods.map((methodId) => {
                const method = getAllMethods().find((m) => m.id === methodId);
                if (!method) return null;
                const isExpanded = expandedMethod === methodId;
                const MethodIcon = getIconComponent(method.icon);
                const colorClass = getMethodColorClass(
                  method.id,
                  method.isCustom
                );
                return (
                  <motion.div
                    key={methodId}
                    initial={{
                      opacity: 0,
                      y: 20,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      marginTop: 0,
                    }}
                    transition={{
                      duration: 0.2,
                    }}
                  >
                    <Card
                      className={cn(
                        "border overflow-hidden transition-all cursor-pointer",
                        "border-primary/20",
                        isExpanded && "shadow-md"
                      )}
                      onClick={() => toggleMethodExpansion(methodId)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "p-2 rounded-md w-10 h-10 flex items-center justify-center",
                                colorClass
                              )}
                            >
                              <MethodIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">
                                  {method.name}
                                </CardTitle>
                                {method.isCustom && (
                                  <Badge variant="secondary" className="text-xs">
                                    Custom
                                  </Badge>
                                )}
                              </div>
                              <CardDescription>
                                {method.description}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t("ready")}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMethodToggle(methodId);
                              }}
                              className="h-8 w-8 text-destructive hover:text-destructive/80"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Expanded content with payment details */}
                      <AnimatePresence>
                        {isExpanded && method.isCustom && (
                          <motion.div
                            initial={{
                              height: 0,
                              opacity: 0,
                            }}
                            animate={{
                              height: "auto",
                              opacity: 1,
                            }}
                            exit={{
                              height: 0,
                              opacity: 0,
                            }}
                            transition={{
                              duration: 0.2,
                            }}
                            onClick={(e) => e.stopPropagation()} // Prevent collapse when clicking inside
                          >
                            <CardContent className="pb-3 border-t pt-4 bg-muted/30">
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium text-sm">
                                  {tCommon("payment_details")}
                                </h4>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 flex items-center gap-1"
                                    onClick={(e) => toggleEditMode(methodId, e)}
                                    disabled={isUpdatingMethod}
                                  >
                                    {editMode === methodId ? (
                                      <>
                                        {isUpdatingMethod ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Save className="h-3.5 w-3.5" />
                                        )}
                                        <span>{tCommon("save")}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Edit className="h-3.5 w-3.5" />
                                        <span>{tCommon("edit")}</span>
                                      </>
                                    )}
                                  </Button>
                                  <AlertDialog
                                    open={methodToDelete === methodId}
                                    onOpenChange={(open) =>
                                      !open && setMethodToDelete(null)
                                    }
                                  >
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 flex items-center gap-1 text-destructive hover:text-destructive/80"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMethodToDelete(methodId);
                                        }}
                                        disabled={isDeletingMethod}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>{tCommon("delete")}</span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          {t("delete_payment_method")}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {tCommon("are_you_sure_be_undone")}.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          {tCommon("cancel")}
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            deleteCustomMethod(methodId)
                                          }
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          disabled={isDeletingMethod}
                                        >
                                          {isDeletingMethod ? (
                                            <>
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              {tCommon('deleting_ellipsis')}...
                                            </>
                                          ) : (
                                            "Delete"
                                          )}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>

                              {/* Display metadata fields */}
                              {(method.metadata && Object.keys(method.metadata).length > 0) || editMode === methodId ? (
                                <div className="mb-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-xs font-medium text-muted-foreground">{tCommon("payment_details")}</h5>
                                    {editMode === methodId && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddMetadataToMethod(methodId);
                                        }}
                                        className="h-6 text-xs"
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        {tCommon("add_field")}
                                      </Button>
                                    )}
                                  </div>
                                  {editMode === methodId ? (
                                    <div className="bg-background rounded-md p-3 border text-sm space-y-2">
                                      {method.metadata && Object.entries(method.metadata).map(([key, value], index) => (
                                        <div key={`${key}-${index}`} className="flex gap-2 items-center">
                                          <Input
                                            placeholder={tCommon("field_name")}
                                            value={key}
                                            onChange={(e) => handleUpdateMetadataKey(methodId, key, e.target.value)}
                                            className="flex-1 h-8 text-sm"
                                          />
                                          <Input
                                            placeholder={t("field_value")}
                                            value={value}
                                            onChange={(e) => handleUpdateMetadata(methodId, key, e.target.value)}
                                            className="flex-1 h-8 text-sm"
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRemoveMetadataField(methodId, key);
                                            }}
                                            className="h-8 w-8 text-destructive hover:text-destructive/80 flex-shrink-0"
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))}
                                      {(!method.metadata || Object.keys(method.metadata).length === 0) && (
                                        <p className="text-xs text-muted-foreground text-center py-2">
                                          {t("no_payment_details_click_add_field")}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="bg-background rounded-md p-3 border text-sm space-y-2">
                                      {method.metadata && Object.entries(method.metadata).map(([key, value]) => (
                                        <div key={key} className="flex justify-between">
                                          <span className="text-muted-foreground">{key}:</span>
                                          <span className="font-medium">{value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : null}

                              {/* Instructions section */}
                              <div>
                                <h5 className="text-xs font-medium text-muted-foreground mb-2">{tCommon("instructions")}</h5>
                                {editMode === methodId ? (
                                  <Textarea
                                    value={method.instructions || ""}
                                    onChange={(e) =>
                                      handleUpdateInstructions(
                                        methodId,
                                        e.target.value
                                      )
                                    }
                                    placeholder={t("enter_payment_instructions")}
                                    rows={4}
                                    className="resize-none"
                                  />
                                ) : (
                                  <div className="bg-background rounded-md p-3 border text-sm whitespace-pre-wrap">
                                    {method.instructions ||
                                      "No instructions provided"}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Global Payment Methods Section */}
      {availablePaymentMethods.filter((method) => method.available).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-muted-foreground">
              {tExt("global")} {tExt("payment_methods")}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availablePaymentMethods
              .filter((method) => method.available)
              .map((method) => {
                const isSelected = selectedMethods.includes(method.id);
                const MethodIcon = getIconComponent(method.icon);
                const colorClass = getMethodColorClass(method.id);
                return (
                  <motion.div
                    key={method.id}
                    whileHover={{
                      scale: 1.02,
                    }}
                    whileTap={{
                      scale: 0.98,
                    }}
                    transition={{
                      duration: 0.2,
                    }}
                  >
                    <Card
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/20"
                      )}
                      onClick={() => handleMethodToggle(method.id)}
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-md w-10 h-10 flex items-center justify-center",
                            colorClass
                          )}
                        >
                          <MethodIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium flex items-center gap-2">
                            {method.name}
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {method.description}
                          </p>
                          {method.processingTime && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {tCommon("processing")} {method.processingTime}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
          </div>
        </div>
      )}

      {/* Custom Payment Methods Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-muted-foreground">
            {tExt("your_custom_payment_methods")}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Custom methods */}
          {customMethods.map((method) => {
            const isSelected = selectedMethods.includes(method.id);
            const MethodIcon = getIconComponent(method.icon);
            const hasActiveTrade = method.hasActiveTrade === true;
            const hasActiveOffer = method.hasActiveOffer === true;
            const canDelete = method.canDelete !== false;
            return (
              <motion.div
                key={method.id}
                whileHover={{
                  scale: 1.02,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                transition={{
                  duration: 0.2,
                }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/20"
                  )}
                  onClick={() => handleMethodToggle(method.id)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-md w-10 h-10 flex items-center justify-center",
                        "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300"
                      )}
                    >
                      <MethodIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium flex items-center gap-2 flex-wrap">
                        {method.name}
                        <Badge variant="outline" className="text-xs">
                          {tExt("custom")}
                        </Badge>
                        {hasActiveTrade && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Lock className="h-3 w-3" />
                            {t("in_trade")}
                          </Badge>
                        )}
                        {hasActiveOffer && !hasActiveTrade && (
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                            {t("in_offer")}
                          </Badge>
                        )}
                        {canDelete && (
                          <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                            {t("can_delete")}
                          </Badge>
                        )}
                        {isSelected && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {method.description || "Custom payment method"}
                      </p>
                      {method.processingTime && (
                        <p className="text-xs text-muted-foreground">
                          {tCommon("processing")} {method.processingTime}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {/* Add custom method card */}
          {customMethodsAllowed && (
            <motion.div
              whileHover={{
                scale: 1.02,
              }}
              whileTap={{
                scale: 0.98,
              }}
              transition={{
                duration: 0.2,
              }}
            >
              <Card
                className="cursor-pointer transition-all hover:shadow-md border-dashed border-2"
                onClick={() => setNewMethodOpen(true)}
              >
                <CardContent className="p-4 flex items-center justify-center h-full">
                  <div className="text-center py-4">
                    <div className="rounded-full bg-primary/10 p-2 mx-auto mb-2">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-medium">{t("add_custom_method")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("create_your_own_payment_method")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Show message if no custom methods and custom not allowed */}
          {customMethods.length === 0 && !customMethodsAllowed && (
            <div className="col-span-full text-center py-4 text-muted-foreground text-sm">
              {t("no_custom_payment_methods")}
            </div>
          )}
        </div>
      </div>

      {/* Guidance Section */}
      <Alert className="bg-blue-50 dark:bg-blue-900/30 border-blue-200/50 dark:border-blue-700/50">
        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-600 dark:text-blue-400">
          {tradeData.tradeType === "buy"
            ? "As a buyer, you'll need to use one of these payment methods to send funds to the seller."
            : "As a seller, you'll receive payment through one of these methods before releasing currency from escrow."}
          {selectedMethods.length === 0 &&
            " Select at least one payment method to continue."}
        </AlertDescription>
      </Alert>

      {/* Summary Section */}
      {selectedMethods.length > 0 && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t("payment_methods_summary")}
            </CardTitle>
            <CardDescription>
              {selectedMethods.length} {tCommon("method")}{selectedMethods.length !== 1 ? "s" : ""} {tCommon("selected")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedMethods.map((methodId) => {
                const method = getAllMethods().find((m) => m.id === methodId);
                return (
                  <Badge
                    key={methodId}
                    variant="outline"
                    className="py-1.5 px-2.5 transition-colors bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {method?.name || methodId}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-between">
            <p className="text-sm text-muted-foreground">
              {t("all_payment_methods_are_properly_configured")}.
            </p>
          </CardFooter>
        </Card>
      )}

      {/* Add Custom Method Dialog */}
      <Dialog open={newMethodOpen} onOpenChange={setNewMethodOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("add_custom_payment_method")}</DialogTitle>
            <DialogDescription>
              {t("create_a_custom_standard_list")}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="method-name">
                {t("method_name")}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="method-name"
                placeholder={t("e_g_zelle_wire_transfer")}
                value={newMethodName}
                onChange={(e) => setNewMethodName(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method-description">{tCommon("description")}</Label>
              <Input
                id="method-description"
                placeholder={t("brief_description_of_the_payment_method")}
                value={newMethodDescription}
                onChange={(e) => setNewMethodDescription(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method-processing-time">
                {tCommon("processing_time")}
              </Label>
              <Input
                id="method-processing-time"
                placeholder={t("e_g_1_2_business_days")}
                value={newMethodProcessingTime}
                onChange={(e) => setNewMethodProcessingTime(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method-instructions">
                {tCommon("payment_instructions")}
              </Label>
              <Textarea
                id="method-instructions"
                placeholder={t("provide_instructions_for_the_buyer_on")}
                value={newMethodInstructions}
                onChange={(e) => setNewMethodInstructions(e.target.value)}
                rows={3}
                className="resize-none w-full"
              />
            </div>

            {/* Dynamic Payment Details Fields */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {tCommon("payment_details")}
                  <span className="text-muted-foreground text-xs ml-2">
                    ({t("e_g_account_number_email")})
                  </span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addMetadataField}
                  disabled={newMethodMetadata.length >= 20}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {tCommon("add_field")}
                </Button>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {newMethodMetadata.map((field, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder={tCommon("field_name")}
                      value={field.key}
                      onChange={(e) => handleMetadataChange(index, "key", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder={t("field_value")}
                      value={field.value}
                      onChange={(e) => handleMetadataChange(index, "value", e.target.value)}
                      className="flex-1"
                    />
                    {newMethodMetadata.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMetadataField(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive/80 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("add_your_payment_details_like_account_numbers")}
              </p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setNewMethodOpen(false)}
              className="w-full sm:w-auto"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleAddCustomMethod}
              disabled={
                !newMethodName.trim() ||
                isCreatingMethod
              }
              className="w-full sm:w-auto"
            >
              {isCreatingMethod ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tCommon('creating_ellipsis')}...
                </>
              ) : (
                "Add Method"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
