"use client";

import React, { useState, useEffect, useCallback } from "react";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { imageUploader } from "@/utils/upload";
import { ImageUpload } from "@/components/ui/image-upload";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Icon } from "@iconify/react";
import { X } from "lucide-react";

// DepositMethod interface
interface DepositMethod {
  id: string;
  title: string;
  instructions: string;
  image?: string;
  fixedFee: number;
  percentageFee: number;
  minAmount: number;
  maxAmount?: number;
  status: boolean;
  customFields?: CustomField[];
  createdAt: string;
  updatedAt: string;
}

interface CustomField {
  name: string;
  title: string;
  type: "input" | "textarea" | "file" | "image";
  required: boolean;
}

interface MethodModalProps {
  methodId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onMethodUpdated?: () => void;
}

export const MethodModal: React.FC<MethodModalProps> = ({
  methodId,
  isOpen,
  onClose,
  onMethodUpdated,
}) => {
  const t = useTranslations("admin");
  const { toast } = useToast();
  const [method, setMethod] = useState<DepositMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchMethod = useCallback(async () => {
    if (!methodId) return;
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/finance/deposit/method/${methodId}`,
        silent: true,
      });
      if (!error && data) {
        // Parse customFields if they come as JSON string
        const parsedData = { ...data };
        if (typeof parsedData.customFields === 'string') {
          try {
            parsedData.customFields = JSON.parse(parsedData.customFields);
          } catch (e) {
            parsedData.customFields = [];
          }
        }
        // Ensure customFields is always an array
        if (!Array.isArray(parsedData.customFields)) {
          parsedData.customFields = [];
        }
        
        setMethod(parsedData);
        setFormData(parsedData);
        setOriginalData(parsedData);
        setHasChanges(false);
      }
    } catch (err) {
      console.error("Failed to fetch deposit method", err);
    } finally {
      setIsLoading(false);
    }
  }, [methodId]);

  useEffect(() => {
    if (methodId && isOpen) {
      fetchMethod();
    }
  }, [methodId, isOpen, fetchMethod]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      const hasChanges = JSON.stringify(updated) !== JSON.stringify(originalData);
      setHasChanges(hasChanges);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!formData || !methodId) return;
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.title || !formData.instructions) {
        throw new Error("Please fill in all required fields");
      }

      // Handle image upload if there's a new image file
      let imageUrl = formData.image;
      
      if (formData.imageFile instanceof File) {
        const uploadResult = await imageUploader({
          file: formData.imageFile,
          dir: "depositMethods",
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
        instructions: formData.instructions,
        image: imageUrl,
        fixedFee: formData.fixedFee,
        percentageFee: formData.percentageFee,
        minAmount: formData.minAmount,
        maxAmount: formData.maxAmount,
        customFields: formData.customFields || [],
      };

      const { error } = await $fetch({
        url: `/api/admin/finance/deposit/method/${methodId}`,
        method: "PUT",
        body: payload,
      });

      if (!error) {
        setMethod((prev) => prev ? { ...prev, ...payload, image: imageUrl } : prev);
        setOriginalData({ ...formData, image: imageUrl });
        setHasChanges(false);
        
        toast({
          title: "Method Updated",
          description: "Deposit method has been successfully updated",
        });
        
        onMethodUpdated?.();
      }
    } catch (err) {
      console.error("Failed to update method", err);
      toast({
        title: "Error",
        description: `Failed to update method: ${err instanceof Error ? err.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMethod(null);
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
            Deposit Method Details
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-6 space-y-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="text-lg font-medium">Loading method details...</p>
                  <p className="text-sm text-muted-foreground">Please wait while we fetch the information</p>
                </div>
              </div>
            ) : !method ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium">Method not found</p>
                    <p className="text-sm text-muted-foreground">The requested deposit method could not be located</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Method Header */}
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 rounded-xl p-6 border border-violet-200/50 dark:border-violet-800/50">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/50 rounded-xl flex items-center justify-center">
                          {method.image ? (
                            <img src={method.image} alt={method.title} className="w-8 h-8 object-contain" />
                          ) : (
                            <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{method.title}</h2>
                          <p className="text-sm text-muted-foreground">Method ID: {method.id}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          method.status ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-400'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            method.status ? 'bg-green-500' : 'bg-zinc-500'
                          }`}></div>
                          {method.status ? 'ACTIVE' : 'INACTIVE'}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Created: {new Date(method.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                        Fee: ${method.fixedFee} + {method.percentageFee}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Limits: ${method.minAmount} - ${method.maxAmount || '∞'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Method Details Grid */}
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
                        <span className="font-medium">${method.fixedFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Percentage Fee:</span>
                        <span className="font-medium">{method.percentageFee}%</span>
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
                        <span className="font-medium">${method.minAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Maximum Amount:</span>
                        <span className="font-medium">${method.maxAmount || 'No limit'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Payment Instructions
                  </h3>
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap">{method.instructions}</p>
                  </div>
                </div>

                {/* Custom Fields */}
                {method.customFields && Array.isArray(method.customFields) && method.customFields.length > 0 && (
                  <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Custom Fields Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {method.customFields.map((field, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{field.title}</h4>
                              <div className="flex gap-2">
                                <Badge variant={field.required ? "default" : "secondary"}>
                                  {field.required ? "Required" : "Optional"}
                                </Badge>
                                <Badge variant="outline">{field.type}</Badge>
                              </div>
                            </div>
                            {field.name && (
                              <p className="text-xs text-muted-foreground">Name: {field.name}</p>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />
                
                {/* Edit Form */}
                <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Method Management
                  </h3>
                  
                  {formData && (
                    <div className="space-y-6">
                      {/* Basic Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="title">Title *</Label>
                              <Input
                                id="title"
                                value={formData.title || ''}
                                onChange={(e) => handleFieldChange('title', e.target.value)}
                                placeholder="Enter method title"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="status">Status</Label>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="status"
                                  checked={formData.status || false}
                                  onCheckedChange={(checked) => handleFieldChange('status', checked)}
                                />
                                <span className="text-sm text-muted-foreground">
                                  {formData.status ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="instructions">Payment Instructions *</Label>
                            <Textarea
                              id="instructions"
                              rows={4}
                              value={formData.instructions || ''}
                              onChange={(e) => handleFieldChange('instructions', e.target.value)}
                              placeholder="Enter detailed payment instructions for users..."
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="image">Method Image</Label>
                            <ImageUpload
                              onChange={(fileOrNull) => {
                                if (fileOrNull) {
                                  handleFieldChange('imageFile', fileOrNull);
                                } else {
                                  handleFieldChange('image', null);
                                  handleFieldChange('imageFile', null);
                                }
                              }}
                              value={formData.imageFile || formData.image || null}
                              title="Upload Method Image"
                              size="default"
                              aspectRatio="wide"
                              maxSize={5}
                              acceptedFormats={["image/jpeg", "image/png", "image/gif", "image/webp"]}
                            />
                            <p className="text-xs text-muted-foreground">
                              Upload an image for this payment method. Recommended size: 200x100px
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Fee Configuration */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Fee Configuration</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="fixedFee">Fixed Fee ($) *</Label>
                              <Input
                                id="fixedFee"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.fixedFee || 0}
                                onChange={(e) => handleFieldChange('fixedFee', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="percentageFee">Percentage Fee (%) *</Label>
                              <Input
                                id="percentageFee"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={formData.percentageFee || 0}
                                onChange={(e) => handleFieldChange('percentageFee', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Transaction Limits */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Transaction Limits</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="minAmount">Minimum Amount ($) *</Label>
                              <Input
                                id="minAmount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.minAmount || 0}
                                onChange={(e) => handleFieldChange('minAmount', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="maxAmount">Maximum Amount ($)</Label>
                              <Input
                                id="maxAmount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.maxAmount || ''}
                                onChange={(e) => handleFieldChange('maxAmount', parseFloat(e.target.value) || null)}
                                placeholder="Leave empty for no limit"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Custom Fields Management */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Custom Fields</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <h3 className="text-lg font-medium">Custom Fields Configuration</h3>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newField: CustomField = {
                                    name: "new_field",
                                    title: "New Field",
                                    type: "input",
                                    required: false
                                  };
                                  const updatedFields = [...(Array.isArray(formData.customFields) ? formData.customFields : []), newField];
                                  handleFieldChange('customFields', updatedFields);
                                }}
                              >
                                <Icon icon="mdi:plus" className="h-4 w-4" />
                                Add Field
                              </Button>
                            </div>
                            
                            {formData.customFields && Array.isArray(formData.customFields) && formData.customFields.length > 0 ? (
                              <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-md">
                                <table className="w-full text-sm">
                                  <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                                    <tr>
                                      <th className="px-4 py-2 text-left">Name</th>
                                      <th className="px-4 py-2 text-left">Title</th>
                                      <th className="px-4 py-2 text-left">Type</th>
                                      <th className="px-4 py-2 text-center">Required</th>
                                      <th className="px-4 py-2 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                    {formData.customFields.map((field, index) => (
                                      <tr key={index} className="border-b last:border-none">
                                        {/* Name */}
                                        <td className="px-4 py-2">
                                          <Input
                                            type="text"
                                            placeholder="Name"
                                            value={field.name || ''}
                                            onChange={(e) => {
                                              const updatedFields = [...formData.customFields];
                                              updatedFields[index] = { ...updatedFields[index], name: e.target.value };
                                              handleFieldChange('customFields', updatedFields);
                                            }}
                                            className="w-full"
                                          />
                                        </td>
                                        {/* Title */}
                                        <td className="px-4 py-2">
                                          <Input
                                            type="text"
                                            placeholder="Title"
                                            value={field.title}
                                            onChange={(e) => {
                                              const updatedFields = [...formData.customFields];
                                              updatedFields[index] = { ...updatedFields[index], title: e.target.value };
                                              handleFieldChange('customFields', updatedFields);
                                            }}
                                            className="w-full"
                                          />
                                        </td>
                                        {/* Type */}
                                        <td className="px-4 py-2">
                                          <Select
                                            value={field.type}
                                            onValueChange={(val) => {
                                              const updatedFields = [...formData.customFields];
                                              updatedFields[index] = { ...updatedFields[index], type: val as CustomField['type'] };
                                              handleFieldChange('customFields', updatedFields);
                                            }}
                                          >
                                            <SelectTrigger className="min-w-[80px]">
                                              {field.type}
                                            </SelectTrigger>
                                            <SelectContent className="z-[75]">
                                              <SelectItem value="input">Input</SelectItem>
                                              <SelectItem value="textarea">Textarea</SelectItem>
                                              <SelectItem value="file">File Upload</SelectItem>
                                              <SelectItem value="image">Image Upload</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </td>
                                        {/* Required */}
                                        <td className="px-4 py-2 text-center">
                                          <Checkbox
                                            checked={field.required}
                                            onCheckedChange={(checked) => {
                                              const updatedFields = [...formData.customFields];
                                              updatedFields[index] = { ...updatedFields[index], required: Boolean(checked) };
                                              handleFieldChange('customFields', updatedFields);
                                            }}
                                          />
                                        </td>
                                        {/* Actions */}
                                        <td className="px-4 py-2 text-right">
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                              const updatedFields = [...formData.customFields];
                                              updatedFields.splice(index, 1);
                                              handleFieldChange('customFields', updatedFields);
                                            }}
                                          >
                                            <X size={14} />
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No custom fields configured</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
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