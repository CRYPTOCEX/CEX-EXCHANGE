"use client";

import React, { useState, useEffect, useCallback } from "react";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { imageUploader } from "@/utils/upload";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { GatewayEditForm } from "../[id]/edit/components/gateway-edit-form";

// Gateway interface
interface Gateway {
  id: string;
  title: string;
  description: string;
  image?: string;
  alias: string;
  currencies: string[];
  fixedFee: number;
  percentageFee: number;
  minAmount: number;
  maxAmount: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

interface GatewayModalProps {
  gatewayId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onGatewayUpdated?: () => void;
}

export const GatewayModal: React.FC<GatewayModalProps> = ({
  gatewayId,
  isOpen,
  onClose,
  onGatewayUpdated,
}) => {
  const t = useTranslations("admin");
  const { toast } = useToast();
  const [gateway, setGateway] = useState<Gateway | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchGateway = useCallback(async () => {
    if (!gatewayId) return;
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/finance/deposit/gateway/${gatewayId}`,
        silent: true,
      });
      if (!error && data) {
        // Parse currencies if they come as JSON string
        const parsedData = { ...data };
        if (typeof parsedData.currencies === 'string') {
          try {
            parsedData.currencies = JSON.parse(parsedData.currencies);
          } catch (e) {
            parsedData.currencies = [];
          }
        }
        if (!Array.isArray(parsedData.currencies)) {
          parsedData.currencies = [];
        }
        
        setGateway(parsedData);
        setFormData(parsedData);
        setOriginalData(parsedData);
        setHasChanges(false);
      }
    } catch (err) {
      console.error("Failed to fetch gateway", err);
    } finally {
      setIsLoading(false);
    }
  }, [gatewayId]);

  useEffect(() => {
    if (gatewayId && isOpen) {
      fetchGateway();
    }
  }, [gatewayId, isOpen, fetchGateway]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      const hasChanges = JSON.stringify(updated) !== JSON.stringify(originalData);
      setHasChanges(hasChanges);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!formData || !gatewayId) return;
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.title || !formData.description) {
        throw new Error("Please fill in all required fields");
      }

      // Handle image upload if there's a new image file
      let imageUrl = formData.image;
      
      if (formData.imageFile instanceof File) {
        const uploadResult = await imageUploader({
          file: formData.imageFile,
          dir: "gateways",
          size: {
            width: 200,
            height: 100,
            maxWidth: 400,
            maxHeight: 200
          },
          oldPath: typeof formData.image === 'string' ? formData.image : ""
        });

        if (uploadResult.success && uploadResult.url) {
          imageUrl = uploadResult.url;
        } else {
          throw new Error(`Failed to upload image: ${uploadResult.error}`);
        }
      }

      // Prepare payload
      const payload = {
        title: formData.title,
        description: formData.description,
        image: imageUrl,
        alias: formData.alias,
        currencies: Array.isArray(formData.currencies) ? formData.currencies : [],
        fixedFee: formData.fixedFee,
        percentageFee: formData.percentageFee,
        minAmount: formData.minAmount,
        maxAmount: formData.maxAmount,
        status: formData.status,
      };

      const { error } = await $fetch({
        url: `/api/admin/finance/deposit/gateway/${gatewayId}`,
        method: "PUT",
        body: payload,
      });

      if (!error) {
        setGateway((prev) => prev ? { ...prev, ...payload, image: imageUrl } : prev);
        setOriginalData({ ...formData, image: imageUrl });
        setHasChanges(false);
        
        toast({
          title: "Gateway Updated",
          description: "Payment gateway has been successfully updated",
        });
        
        onGatewayUpdated?.();
      }
    } catch (err) {
      console.error("Failed to update gateway", err);
      toast({
        title: "Error",
        description: `Failed to update gateway: ${err instanceof Error ? err.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setGateway(null);
    setFormData(null);
    setOriginalData(null);
    setHasChanges(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent 
        side="right" 
        className="w-[90vw] max-w-[90vw] min-w-[90vw] p-0 overflow-hidden sm:max-w-[90vw]"
        style={{ width: '90vw', maxWidth: '90vw', minWidth: '90vw' }}
      >
        <SheetHeader className="px-6 py-4 border-b bg-muted/30">
          <SheetTitle className="text-xl font-semibold">
            Payment Gateway Details
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-6 space-y-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="text-lg font-medium">Loading gateway details...</p>
                  <p className="text-sm text-muted-foreground">Please wait while we fetch the information</p>
                </div>
              </div>
            ) : !gateway ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium">Gateway not found</p>
                    <p className="text-sm text-muted-foreground">The requested payment gateway could not be located</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Gateway Header */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl p-6 border border-emerald-200/50 dark:border-emerald-800/50">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center">
                          {gateway.image ? (
                            <img src={gateway.image} alt={gateway.title} className="w-8 h-8 object-contain" />
                          ) : (
                            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{gateway.title}</h2>
                          <p className="text-sm text-muted-foreground">Gateway ID: {gateway.id}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          gateway.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-400'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            gateway.status === 'ACTIVE' ? 'bg-green-500' : 'bg-zinc-500'
                          }`}></div>
                          {gateway.status}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Updated: {new Date(gateway.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                        Alias: {gateway.alias}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {gateway.currencies.length} supported currencies
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gateway Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Fee Information */}
                  <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Fee Structure
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fixed Fee:</span>
                        <span className="font-medium">${gateway.fixedFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Percentage Fee:</span>
                        <span className="font-medium">{gateway.percentageFee}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Limits Information */}
                  <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Transaction Limits
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Minimum Amount:</span>
                        <span className="font-medium">${gateway.minAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Maximum Amount:</span>
                        <span className="font-medium">${gateway.maxAmount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supported Currencies */}
                <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Supported Currencies
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {gateway.currencies.map((currency, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
                        {currency}
                      </span>
                    ))}
                    {gateway.currencies.length === 0 && (
                      <span className="text-muted-foreground text-sm">No currencies configured</span>
                    )}
                  </div>
                </div>

                <Separator />
                
                {/* Edit Form */}
                <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Gateway Management
                  </h3>
                  
                  {formData && (
                    <GatewayEditForm gateway={formData} onChange={handleFieldChange} />
                  )}
                  
                  {hasChanges && (
                    <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-zinc-200 dark:border-zinc-700 mt-6">
                      <Button
                        variant="default"
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setFormData(originalData);
                          setHasChanges(false);
                        }}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto"
                      >
                        Reset Changes
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}; 