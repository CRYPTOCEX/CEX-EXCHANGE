"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ImageField } from "./image-field";
import { FileField } from "./file-field";
import { IdentityField } from "./identity-field";
import { IDENTITY_TYPES } from "./identity-field";
import { useTranslations } from "next-intl";

// Extended field interface for internal use that includes all possible properties
interface ExtendedFormField extends KycField {
  hidden?: boolean;
  max?: number;
  min?: number;
  step?: number;
  rows?: number;
  placeholder?: string;
  multiple?: boolean;
}

export interface DynamicFormProps {
  fields: KycField[];
  title?: string;
  description?: string;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
  defaultValues?: Record<string, any>;
  className?: string;
  showProgressBar?: boolean;
  showFieldCount?: boolean;
  variant?: "default" | "compact" | "card" | "embedded";
  isPreview?: boolean;
  hideProgressBar?: boolean;
}

export function DynamicForm({
  fields,
  title,
  description,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  onSubmit,
  onCancel,
  defaultValues = {},
  className,
  showProgressBar = false,
  showFieldCount = false,
  variant = "default",
  isPreview = false,
  hideProgressBar = false,
}: DynamicFormProps) {
  const t = useTranslations("dashboard");
  const [formData, setFormData] = useState<Record<string, any>>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Sort fields by order
  const sortedFields = [...fields].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  // Calculate completion percentage
  useEffect(() => {
    if (!showProgressBar) return;

    const requiredFields = fields.filter((field) => field.required);
    if (requiredFields.length === 0) {
      setCompletionPercentage(100);
      return;
    }

    const filledRequiredFields = requiredFields.filter((field) => {
      const value = formData[field.id];
      return value !== undefined && value !== null && value !== "";
    });

    setCompletionPercentage(
      Math.round((filledRequiredFields.length / requiredFields.length) * 100)
    );
  }, [formData, fields, showProgressBar]);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    // Mark field as touched
    setTouchedFields((prev) => {
      const newSet = new Set(prev);
      newSet.add(fieldId);
      return newSet;
    });

    // Clear error for this field
    if (errors[fieldId]) {
      setErrors((prev) => ({
        ...prev,
        [fieldId]: errors[fieldId],
      }));
    }
  };

  const validateField = (
    field: ExtendedFormField,
    value: any
  ): string | null => {
    // Check required
    if (
      field.required &&
      (value === undefined || value === null || value === "")
    ) {
      return `${field.label} is required`;
    }

    // Skip other validations if empty and not required
    if (value === undefined || value === null || value === "") {
      return null;
    }

    // Type-specific validations
    switch (field.type) {
      case "EMAIL":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return "Please enter a valid email address";
        }
        break;
      case "NUMBER":
        if (isNaN(Number(value))) {
          return "Please enter a valid number";
        }
        if (field.min !== undefined && Number(value) < field.min) {
          return `Value must be at least ${field.min}`;
        }
        if (field.max !== undefined && Number(value) > field.max) {
          return `Value must be at most ${field.max}`;
        }
        break;
      case "PHONE":
        if (!/^\+?[0-9\s\-()]{7,}$/.test(value)) {
          return "Please enter a valid phone number";
        }
        break;
      case "FILE":
      case "IMAGE":
        // For file fields, value should be a File object or a URL string
        if (!(value instanceof File) && typeof value !== "string") {
          return `Please upload a file for ${field.label}`;
        }
        break;
    }

    // Custom validation
    if (field.validation) {
      if (
        field.validation.pattern &&
        !new RegExp(field.validation.pattern).test(value)
      ) {
        return field.validation.message || "Invalid format";
      }
      if (typeof value === "string") {
        if (
          field.validation.minLength !== undefined &&
          value.length < field.validation.minLength
        ) {
          return `Must be at least ${field.validation.minLength} characters`;
        }
        if (
          field.validation.maxLength !== undefined &&
          value.length > field.validation.maxLength
        ) {
          return `Must be at most ${field.validation.maxLength} characters`;
        }
      }
    }

    return null;
  };

  const mapOperator = (
    operator: string
  ):
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "NOT_CONTAINS"
    | "GREATER_THAN"
    | "LESS_THAN" => {
    switch (operator.toLowerCase()) {
      case "equals":
        return "EQUALS";
      case "notequals":
        return "NOT_EQUALS";
      case "contains":
        return "CONTAINS";
      case "notcontains":
        return "NOT_EQUALS";
      case "greaterthan":
        return "GREATER_THAN";
      case "lessthan":
        return "LESS_THAN";
      default:
        return "EQUALS";
    }
  };

  const shouldShowField = (field: ExtendedFormField): boolean => {
    if (field.hidden) return false;
    if (!field.conditional) return true;

    const { field: dependentFieldId, operator, value } = field.conditional;
    const dependentValue = formData[dependentFieldId];

    if (dependentValue === undefined) return false;

    const mappedOperator = mapOperator(operator.toString());

    switch (mappedOperator) {
      case "EQUALS":
        return dependentValue === value;
      case "NOT_EQUALS":
        return dependentValue !== value;
      case "CONTAINS":
        return dependentValue?.includes?.(value) ?? false;
      case "NOT_CONTAINS":
        return !dependentValue.includes(value);
      case "GREATER_THAN":
        return dependentValue > value;
      case "LESS_THAN":
        return dependentValue < value;
      default:
        return true;
    }
  };

  // Function to identify fields that could be placed side by side
  const isShortField = (field: KycField): boolean => {
    return [
      "TEXT",
      "SELECT",
      "DATE",
      "NUMBER",
      "EMAIL",
      "PHONE",
      "CHECKBOX",
      "RADIO",
    ].includes(field.type);
  };

  // Group fields into rows for layout
  const getFieldRows = () => {
    const rows: KycField[][] = [];
    let currentRow: KycField[] = [];

    sortedFields.forEach((field) => {
      if (!shouldShowField(field as ExtendedFormField)) return;

      if (
        isShortField(field) &&
        currentRow.length < 2 &&
        variant !== "compact"
      ) {
        // Add to current row if it's a short field and row isn't full
        currentRow.push(field);
      } else if (
        isShortField(field) &&
        currentRow.length === 2 &&
        variant !== "compact"
      ) {
        // Start a new row if current row is full
        rows.push([...currentRow]);
        currentRow = [field];
      } else {
        // For long fields, finish current row and add as standalone
        if (currentRow.length > 0) {
          rows.push([...currentRow]);
          currentRow = [];
        }
        rows.push([field]);
      }
    });

    // Add any remaining fields in the current row
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  };

  const renderField = (field: KycField) => {
    const extendedField = field as ExtendedFormField;
    if (!shouldShowField(extendedField)) return null;

    const isFieldTouched = touchedFields.has(field.id);
    const fieldError = errors[field.id];
    const showError = isFieldTouched && fieldError;

    const fieldWrapperClasses = cn(
      "relative",
      variant === "compact" ? "mb-3" : "mb-4",
      showError ? "animate-shake" : ""
    );

    const labelClasses = cn(
      "text-sm font-medium mb-1.5 block dark:text-zinc-200",
      showError ? "text-destructive" : ""
    );

    const renderErrorMessage = () => {
      if (!showError) return null;

      return (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="text-xs text-destructive mt-1 flex items-center gap-1"
        >
          <AlertCircle className="h-3 w-3" />
          <span>{fieldError}</span>
        </motion.div>
      );
    };

    switch (field.type) {
      case "TEXT":
      case "EMAIL":
      case "PHONE":
        return (
          <div
            key={field.id}
            className={fieldWrapperClasses}
            data-field-id={field.id}
          >
            <Label htmlFor={field.id} className={labelClasses}>
              {field.label}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground dark:text-zinc-400 mb-1.5">
                {field.description}
              </p>
            )}
            <Input
              id={field.id}
              type={
                field.type === "EMAIL"
                  ? "email"
                  : field.type === "PHONE"
                    ? "tel"
                    : "text"
              }
              placeholder={extendedField.placeholder}
              value={formData[field.id] || ""}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              onBlur={() => {
                if (!touchedFields.has(field.id)) {
                  setTouchedFields((prev) => {
                    const newSet = new Set(prev);
                    newSet.add(field.id);
                    return newSet;
                  });

                  const errorMessage = validateField(
                    extendedField,
                    formData[field.id]
                  );
                  if (errorMessage) {
                    setErrors((prev) => ({
                      ...prev,
                      [field.id]: errorMessage,
                    }));
                  }
                }
              }}
              className={cn(
                "dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100",
                showError
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              )}
            />
            <AnimatePresence>{renderErrorMessage()}</AnimatePresence>
          </div>
        );

      case "TEXTAREA":
        return (
          <div
            key={field.id}
            className={fieldWrapperClasses}
            data-field-id={field.id}
          >
            <Label htmlFor={field.id} className={labelClasses}>
              {field.label}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground dark:text-zinc-400 mb-1.5">
                {field.description}
              </p>
            )}
            <Textarea
              id={field.id}
              placeholder={extendedField.placeholder}
              value={formData[field.id] || ""}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              onBlur={() => {
                if (!touchedFields.has(field.id)) {
                  setTouchedFields((prev) => {
                    const newSet = new Set(prev);
                    newSet.add(field.id);
                    return newSet;
                  });

                  const errorMessage = validateField(
                    extendedField,
                    formData[field.id]
                  );
                  if (errorMessage) {
                    setErrors((prev) => ({
                      ...prev,
                      [field.id]: errorMessage,
                    }));
                  }
                }
              }}
              className={cn(
                "dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100",
                showError
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              )}
              rows={extendedField.rows || 3}
            />
            <AnimatePresence>{renderErrorMessage()}</AnimatePresence>
          </div>
        );

      case "SELECT":
        return (
          <div
            key={field.id}
            className={fieldWrapperClasses}
            data-field-id={field.id}
          >
            <Label htmlFor={field.id} className={labelClasses}>
              {field.label}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground dark:text-zinc-400 mb-1.5">
                {field.description}
              </p>
            )}
            <Select
              onValueChange={(value) => handleInputChange(field.id, value)}
              defaultValue={formData[field.id] || ""}
            >
              <SelectTrigger
                id={field.id}
                className={cn(
                  "dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100",
                  showError
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                )}
              >
                <SelectValue
                  placeholder={extendedField.placeholder || field.label}
                />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AnimatePresence>{renderErrorMessage()}</AnimatePresence>
          </div>
        );

      case "CHECKBOX":
        return (
          <div
            key={field.id}
            className={fieldWrapperClasses}
            data-field-id={field.id}
          >
            <div className="flex items-start space-x-2">
              <Checkbox
                id={field.id}
                checked={!!formData[field.id]}
                onCheckedChange={(checked) =>
                  handleInputChange(field.id, checked)
                }
              />
              <Label
                htmlFor={field.id}
                className={cn(
                  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed dark:text-zinc-200",
                  showError ? "text-destructive" : ""
                )}
              >
                {field.label}
                {field.required && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </Label>
            </div>
            {field.description && (
              <p className="text-sm text-muted-foreground dark:text-zinc-400 mt-1.5">
                {field.description}
              </p>
            )}
            <AnimatePresence>{renderErrorMessage()}</AnimatePresence>
          </div>
        );

      case "RADIO":
        return (
          <div
            key={field.id}
            className={fieldWrapperClasses}
            data-field-id={field.id}
          >
            <Label htmlFor={field.id} className={labelClasses}>
              {field.label}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground dark:text-zinc-400 mb-1.5">
                {field.description}
              </p>
            )}
            <RadioGroup
              defaultValue={formData[field.id] || ""}
              onValueChange={(value) => handleInputChange(field.id, value)}
            >
              <div className="flex flex-col space-y-1.5">
                {field.options?.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2"
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`${field.id}-${option.value}`}
                    />
                    <Label
                      htmlFor={`${field.id}-${option.value}`}
                      className={cn(
                        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed dark:text-zinc-200",
                        showError ? "text-destructive" : ""
                      )}
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
            <AnimatePresence>{renderErrorMessage()}</AnimatePresence>
          </div>
        );

      case "NUMBER":
        return (
          <div
            key={field.id}
            className={fieldWrapperClasses}
            data-field-id={field.id}
          >
            <Label htmlFor={field.id} className={labelClasses}>
              {field.label}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground dark:text-zinc-400 mb-1.5">
                {field.description}
              </p>
            )}
            <Input
              id={field.id}
              type="number"
              placeholder={extendedField.placeholder}
              value={formData[field.id] || ""}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              onBlur={() => {
                if (!touchedFields.has(field.id)) {
                  setTouchedFields((prev) => {
                    const newSet = new Set(prev);
                    newSet.add(field.id);
                    return newSet;
                  });

                  const errorMessage = validateField(
                    extendedField,
                    formData[field.id]
                  );
                  if (errorMessage) {
                    setErrors((prev) => ({
                      ...prev,
                      [field.id]: errorMessage,
                    }));
                  }
                }
              }}
              min={extendedField.min}
              max={extendedField.max}
              step={extendedField.step}
              className={cn(
                "dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100",
                showError
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              )}
            />
            <AnimatePresence>{renderErrorMessage()}</AnimatePresence>
          </div>
        );

      case "IMAGE":
        return (
          <div
            key={field.id}
            className={fieldWrapperClasses}
            data-field-id={field.id}
          >
            <ImageField
              id={field.id}
              label={field.label}
              description={field.description}
              required={field.required}
              accept={extendedField.accept}
              value={formData[field.id] || null}
              onChange={(file) => handleInputChange(field.id, file)}
              error={fieldError}
              touched={isFieldTouched}
            />
          </div>
        );

      case "FILE":
        return (
          <div
            key={field.id}
            className={fieldWrapperClasses}
            data-field-id={field.id}
          >
            <FileField
              id={field.id}
              label={field.label}
              description={field.description}
              required={field.required}
              accept={extendedField.accept}
              value={formData[field.id] || null}
              onChange={(file) => handleInputChange(field.id, file)}
              error={fieldError}
              touched={isFieldTouched}
              multiple={extendedField.multiple}
            />
          </div>
        );

      case "IDENTITY":
        return (
          <div
            key={field.id}
            className={fieldWrapperClasses}
            data-field-id={field.id}
          >
            <IdentityField
              id={field.id}
              label={field.label}
              description={field.description}
              required={field.required}
              identityTypes={field.identityTypes ? IDENTITY_TYPES : undefined}
              defaultType={extendedField.defaultType}
              value={formData[field.id] || {}}
              onChange={(value) => handleInputChange(field.id, value)}
              error={fieldError}
              touched={isFieldTouched}
            />
          </div>
        );

      case "DATE":
        return (
          <div
            key={field.id}
            className={fieldWrapperClasses}
            data-field-id={field.id}
          >
            <Label htmlFor={field.id} className={labelClasses}>
              {field.label}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground dark:text-zinc-400 mb-1.5">
                {field.description}
              </p>
            )}
            <Input
              id={field.id}
              type="date"
              placeholder={extendedField.placeholder}
              value={formData[field.id] || ""}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              onBlur={() => {
                if (!touchedFields.has(field.id)) {
                  setTouchedFields((prev) => {
                    const newSet = new Set(prev);
                    newSet.add(field.id);
                    return newSet;
                  });

                  const errorMessage = validateField(
                    extendedField,
                    formData[field.id]
                  );
                  if (errorMessage) {
                    setErrors((prev) => ({
                      ...prev,
                      [field.id]: errorMessage,
                    }));
                  }
                }
              }}
              className={cn(
                "dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100",
                showError
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              )}
            />
            <AnimatePresence>{renderErrorMessage()}</AnimatePresence>
          </div>
        );

      default:
        return (
          <div
            key={field.id}
            className="p-3 border rounded-md mb-4 dark:bg-zinc-800 dark:border-zinc-700"
            data-field-id={field.id}
          >
            <p className="font-medium dark:text-zinc-200">{field.label}</p>
            <p className="text-sm text-muted-foreground dark:text-zinc-400">
              {t("field_type")}
              {field.type}
            </p>
          </div>
        );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setSubmitError(null);

    // Validate all fields
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      const extendedField = field as ExtendedFormField;
      if (!shouldShowField(extendedField)) continue;
      const value = formData[field.id];
      const errorMessage = validateField(extendedField, value);
      if (errorMessage) {
        newErrors[field.id] = errorMessage;
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setIsSubmitting(false);
      return;
    }

    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
    } catch (error: any) {
      console.error("Form submission error:", error);
      setSubmitError(error.message || "An error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      className={cn(
        "w-full dark:bg-zinc-900 dark:border-zinc-800",
        className,
        variant === "card" ? "" : "border-none shadow-none"
      )}
    >
      {variant === "card" && title && (
        <CardHeader className="dark:bg-zinc-900">
          <CardTitle className="dark:text-zinc-100">{title}</CardTitle>
          {description && (
            <CardDescription className="dark:text-zinc-400">
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent
        className={cn(variant === "card" ? "dark:bg-zinc-900" : "p-0")}
      >
        {title && variant !== "card" && (
          <h2 className="text-2xl font-bold mb-2 dark:text-zinc-100">
            {title}
          </h2>
        )}
        {description && variant !== "card" && (
          <p className="text-muted-foreground dark:text-zinc-400 mb-4">
            {description}
          </p>
        )}

        {!hideProgressBar && showProgressBar && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground dark:text-zinc-400">
                {t("Completion")}
              </p>
              {showFieldCount && (
                <p className="text-sm text-muted-foreground dark:text-zinc-400">
                  {
                    fields.filter(
                      (field) => field.required && formData[field.id]
                    ).length
                  }{" "}
                  _
                  {fields.filter((field) => field.required).length}
                </p>
              )}
            </div>
            <Progress value={completionPercentage} />
          </div>
        )}

        {submitError && (
          <Alert
            variant="destructive"
            className="mb-4 dark:bg-red-950 dark:border-red-800"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {getFieldRows().map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-4">
              {row.map((field) => (
                <div key={field.id} className="w-full">
                  {renderField(field)}
                </div>
              ))}
            </div>
          ))}

          <div
            className={cn(
              "flex items-center",
              onCancel ? "justify-between" : "justify-end",
              variant === "compact" ? "mt-4" : "mt-6"
            )}
          >
            {showFieldCount && (
              <div className="text-sm text-muted-foreground dark:text-zinc-400">
                {
                  fields.filter((field) =>
                    shouldShowField(field as ExtendedFormField)
                  ).length
                }{" "}
                {fields.filter((field) =>
                  shouldShowField(field as ExtendedFormField)
                ).length === 1
                  ? "field"
                  : "fields"}
              </div>
            )}

            <div className="flex gap-3">
              {onCancel && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  {cancelLabel}
                </Button>
              )}
              {onSubmit && (
                <Button
                  type="submit"
                  disabled={isSubmitting || isPreview}
                  className="relative"
                >
                  {isSubmitting ? (
                    <>
                      <span className="opacity-0">{submitLabel}</span>
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg
                          className="animate-spin h-5 w-5 text-current"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      </span>
                    </>
                  ) : (
                    <>
                      {submitLabel}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
