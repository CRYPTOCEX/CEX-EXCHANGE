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
  requiresDetails: boolean;
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
  const t = useTranslations("ext");
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

        // Transform API data to our format with required fields
        // Add a fallback empty array if data is undefined
        const methods =
          data && Array.isArray(data)
            ? data.map((method: any) => ({
                ...method,
                requiresDetails: false,
                // Custom methods don't require additional details
                isCustom: !!method.userId,
                // Mark as custom if it has a userId
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
        details: paymentDetails[id] || {},
      };
    });
    console.log("Saving payment methods:", methods);

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
    console.log("Method toggled:", methodId);
    console.log("New selected methods:", newSelectedMethods);

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
    if (!newMethodName.trim() || !newMethodInstructions.trim()) return;
    setIsCreatingMethod(true);
    try {
      // Create a new custom payment method object
      const customMethodData = {
        name: newMethodName,
        icon: "credit-card",
        description: newMethodDescription || "Custom payment method",
        processingTime: newMethodProcessingTime || "Varies",
        instructions: newMethodInstructions,
        // Save instructions with the payment method
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
        // Store instructions
        available: true,
        isCustom: true,
        requiresDetails: false,
        fields: [],
      };

      // Add to custom methods
      setCustomMethods((prev) => [...prev, newCustomMethod]);

      // Select the new method
      setSelectedMethods((prev) => [...prev, newCustomMethod.id]);

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

      // Save to trade data in the next tick
      setTimeout(() => {
        savePaymentMethods();
      }, 0);
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
        "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
      paypal:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
      venmo: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
      cash_app:
        "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
      zelle:
        "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
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
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
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
            {selectedMethods.length} {t("selected")}
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
                              className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t("Ready")}
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
                                  {t("payment_instructions")}
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
                                        <span>{t("Save")}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Edit className="h-3.5 w-3.5" />
                                        <span>{t("Edit")}</span>
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
                                        <span>{t("Delete")}</span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          {t("delete_payment_method")}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {t("are_you_sure_be_undone")}.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          {t("Cancel")}
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
                                              {t("Deleting")}...
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
                              {editMode === methodId ? (
                                <Textarea
                                  value={method.instructions || ""}
                                  onChange={(e) =>
                                    handleUpdateInstructions(
                                      methodId,
                                      e.target.value
                                    )
                                  }
                                  placeholder="Enter payment instructions"
                                  rows={4}
                                  className="resize-none"
                                />
                              ) : (
                                <div className="bg-background rounded-md p-3 border text-sm whitespace-pre-wrap">
                                  {method.instructions ||
                                    "No instructions provided"}
                                </div>
                              )}
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

      {/* Available Methods Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            {t("available_payment_methods")}
          </h3>
          {/* Removed the Add Custom button from here */}
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
                            {t("processing")} {method.processingTime}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

          {/* Custom methods */}
          {customMethods.map((method) => {
            const isSelected = selectedMethods.includes(method.id);
            const MethodIcon = getIconComponent(method.icon);
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
                      <h3 className="font-medium flex items-center gap-2">
                        {method.name}
                        <Badge variant="outline" className="ml-1 text-xs">
                          {t("Custom")}
                        </Badge>
                        {isSelected && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {method.description || "Custom payment method"}
                      </p>
                      {method.processingTime && (
                        <p className="text-xs text-muted-foreground">
                          {t("processing")} {method.processingTime}
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
        </div>
      </div>

      {/* Guidance Section */}
      <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
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
              {selectedMethods.length} {t("method")}{selectedMethods.length !== 1 ? "s" : ""} {t("selected")}
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
                    className="py-1.5 px-2.5 transition-colors bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
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
                placeholder="e.g., Zelle, Wire Transfer"
                value={newMethodName}
                onChange={(e) => setNewMethodName(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method-description">{t("Description")}</Label>
              <Input
                id="method-description"
                placeholder="Brief description of the payment method"
                value={newMethodDescription}
                onChange={(e) => setNewMethodDescription(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method-processing-time">
                {t("processing_time")}
              </Label>
              <Input
                id="method-processing-time"
                placeholder="e.g., 1-2 business days"
                value={newMethodProcessingTime}
                onChange={(e) => setNewMethodProcessingTime(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method-instructions">
                {t("payment_instructions")}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="method-instructions"
                placeholder="Provide instructions for the buyer on how to use this payment method"
                value={newMethodInstructions}
                onChange={(e) => setNewMethodInstructions(e.target.value)}
                rows={5}
                className="resize-none w-full"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setNewMethodOpen(false)}
              className="w-full sm:w-auto"
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleAddCustomMethod}
              disabled={
                !newMethodName.trim() ||
                !newMethodInstructions.trim() ||
                isCreatingMethod
              }
              className="w-full sm:w-auto"
            >
              {isCreatingMethod ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("Creating")}...
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
