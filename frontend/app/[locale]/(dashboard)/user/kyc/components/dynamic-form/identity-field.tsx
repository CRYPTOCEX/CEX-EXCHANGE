"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Upload,
  Check,
  Camera,
  Shield,
  Lock,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define identity document types with enhanced SVG icons
export const IDENTITY_TYPES = [
  {
    value: "passport",
    label: "Passport",
    icon: (props: any) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="12" cy="10" r="3" />
        <path d="M12 13a5 5 0 0 0-5 5" />
        <path d="M12 13a5 5 0 0 1 5 5" />
        <path d="M3 9h2" />
        <path d="M19 9h2" />
        <path d="M8 4v2" />
        <path d="M16 4v2" />
      </svg>
    ),
    color: "blue",
    gradient: "from-blue-500/20 to-blue-600/5",
    fields: [
      {
        id: "passport-scan",
        label: "Passport Information Page",
        description:
          "Upload a clear photo of your passport information page with your photo visible",
        required: true,
        type: "FILE",
        accept: "image/jpeg,image/png,image/jpg",
        icon: "document",
      },
      {
        id: "passport-selfie",
        label: "Selfie with Passport",
        description:
          "Take a photo of yourself holding your passport next to your face with information visible",
        required: true,
        type: "FILE",
        accept: "image/jpeg,image/png,image/jpg",
        icon: "selfie",
      },
    ],
  },
  {
    value: "drivers-license",
    label: "Driver's License",
    icon: (props: any) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <circle cx="7" cy="12" r="2.5" />
        <path d="M13 9h6" />
        <path d="M13 12h6" />
        <path d="M13 15h6" />
        <path d="M2 10h3" />
        <path d="M2 14h3" />
      </svg>
    ),
    color: "amber",
    gradient: "from-amber-500/20 to-amber-600/5",
    fields: [
      {
        id: "dl-front",
        label: "Driver's License Front",
        description:
          "Upload a clear photo of the front of your driver's license showing your photo and details",
        required: true,
        type: "FILE",
        accept: "image/jpeg,image/png,image/jpg",
        icon: "document",
      },
      {
        id: "dl-back",
        label: "Driver's License Back",
        description:
          "Upload a clear photo of the back of your driver's license showing all information",
        required: true,
        type: "FILE",
        accept: "image/jpeg,image/png,image/jpg",
        icon: "document",
      },
      {
        id: "dl-selfie",
        label: "Selfie with Driver's License",
        description:
          "Take a photo of yourself holding your driver's license next to your face",
        required: true,
        type: "FILE",
        accept: "image/jpeg,image/png,image/jpg",
        icon: "selfie",
      },
    ],
  },
  {
    value: "national-id",
    label: "National ID Card",
    icon: (props: any) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M7 15h.01" />
        <path d="M11 15h2" />
        <path d="M16 15h.01" />
        <path d="M3 8h3" />
        <path d="M18 8h3" />
        <path d="M8 5v2" />
        <path d="M16 5v2" />
      </svg>
    ),
    color: "green",
    gradient: "from-green-500/20 to-green-600/5",
    fields: [
      {
        id: "id-front",
        label: "ID Card Front",
        description:
          "Upload a clear photo of the front of your national ID card showing your photo and details",
        required: true,
        type: "FILE",
        accept: "image/jpeg,image/png,image/jpg",
        icon: "document",
      },
      {
        id: "id-back",
        label: "ID Card Back",
        description:
          "Upload a clear photo of the back of your national ID card showing all information",
        required: true,
        type: "FILE",
        accept: "image/jpeg,image/png,image/jpg",
        icon: "document",
      },
      {
        id: "id-selfie",
        label: "Selfie with ID Card",
        description:
          "Take a photo of yourself holding your ID card next to your face",
        required: true,
        type: "FILE",
        accept: "image/jpeg,image/png,image/jpg",
        icon: "selfie",
      },
    ],
  },
  {
    value: "residence-permit",
    label: "Residence Permit",
    icon: (props: any) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 8h10" />
        <path d="M7 12h5" />
        <path d="M7 16h7" />
        <path d="M15 12h2" />
        <path d="M15 16h2" />
        <path d="M3 8h2" />
        <path d="M19 8h2" />
      </svg>
    ),
    color: "purple",
    gradient: "from-purple-500/20 to-purple-600/5",
    fields: [
      {
        id: "permit-front",
        label: "Residence Permit Front",
        description:
          "Upload a clear photo of the front of your residence permit showing your photo and details",
        required: true,
        type: "FILE",
        accept: "image/jpeg,image/png,image/jpg",
        icon: "document",
      },
      {
        id: "permit-back",
        label: "Residence Permit Back",
        description:
          "Upload a clear photo of the back of your residence permit showing all information",
        required: true,
        type: "FILE",
        accept: "image/jpeg,image/png,image/jpg",
        icon: "document",
      },
      {
        id: "permit-selfie",
        label: "Selfie with Residence Permit",
        description:
          "Take a photo of yourself holding your residence permit next to your face",
        required: true,
        type: "FILE",
        accept: "image/jpeg,image/png,image/jpg",
        icon: "selfie",
      },
    ],
  },
  {
    value: "other",
    label: "Other Government-Issued ID",
    icon: (props: any) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M2 7a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7z" />
        <path d="M12 12h.01" />
        <path d="M12 8h.01" />
        <path d="M12 16h.01" />
        <path d="M8 4v2" />
        <path d="M16 4v2" />
      </svg>
    ),
    color: "gray",
    gradient: "from-gray-500/20 to-gray-600/5",
    fields: [
      {
        id: "other-front",
        label: "ID Document Front",
        description:
          "Upload a clear photo of the front of your ID document showing your photo and details",
        required: true,
        type: "FILE",
        accept: "image/jpeg,image/png,image/jpg",
        icon: "document",
      },
      {
        id: "other-back",
        label: "ID Document Back (if applicable)",
        description:
          "Upload a clear photo of the back of your ID document if it has information on both sides",
        required: false,
        type: "FILE",
        accept: "image/jpeg,image/png,image/jpg",
        icon: "document",
      },
      {
        id: "other-selfie",
        label: "Selfie with ID Document",
        description:
          "Take a photo of yourself holding your ID document next to your face",
        required: true,
        type: "FILE",
        accept: "image/jpeg,image/png,image/jpg",
        icon: "selfie",
      },
    ],
  },
];

// Document icon components
const DocumentIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="12" y1="6" x2="16" y2="6" />
    <line x1="12" y1="10" x2="16" y2="10" />
    <line x1="12" y1="14" x2="16" y2="14" />
    <line x1="8" y1="6" x2="8.01" y2="6" />
    <line x1="8" y1="10" x2="8.01" y2="10" />
    <line x1="8" y1="14" x2="8.01" y2="14" />
    <path d="M8 18h8" />
  </svg>
);
const SelfieIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="10" r="3" />
    <path d="M12 13a5 5 0 0 0-5 5" />
    <path d="M12 13a5 5 0 0 1 5 5" />
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="8" y1="2" x2="8" y2="4" />
    <line x1="16" y1="2" x2="16" y2="4" />
  </svg>
);
interface IdentityFieldProps {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  identityTypes?: typeof IDENTITY_TYPES;
  defaultType?: string;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  touched?: boolean;
}
export function IdentityField({
  id,
  label,
  description,
  required = false,
  identityTypes = IDENTITY_TYPES,
  defaultType = "passport",
  value = {},
  onChange,
  error,
  touched,
}: IdentityFieldProps) {
  const [selectedType, setSelectedType] = useState(value.type || defaultType);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [previewVisible, setPreviewVisible] = useState<Record<string, boolean>>(
    {}
  );
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Initialize value object if empty
  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      onChange({
        type: selectedType,
      });
    }
  }, [value, selectedType, onChange]);

  // Update fields when type changes
  useEffect(() => {
    if (value?.type !== selectedType) {
      // Keep existing values but update the type
      onChange({
        ...value,
        type: selectedType,
      });
    }
  }, [selectedType, value, onChange]);

  // Clean up preview URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  // Initialize preview URLs for existing file paths
  useEffect(() => {
    if (value) {
      // For each field in the selected type config
      const selectedTypeConfig = identityTypes.find(
        (type) => type.value === selectedType
      );
      if (selectedTypeConfig) {
        selectedTypeConfig.fields.forEach((field) => {
          const fieldId = field.id;
          const fieldValue = value[fieldId];

          // If the field value is a string (URL path) and not already in previewUrls
          if (typeof fieldValue === "string" && !previewUrls[fieldId]) {
            // Set it as visible
            setPreviewVisible((prev) => ({
              ...prev,
              [fieldId]: true,
            }));
          }
        });
      }
    }
  }, [value, selectedType, identityTypes, previewUrls]);
  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);
  };
  const handleFileChange = (fieldId: string, file: File | null) => {
    // Revoke previous preview URL if it exists
    if (previewUrls[fieldId]) {
      URL.revokeObjectURL(previewUrls[fieldId]);
    }

    // Create a new preview URL if file exists
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrls((prev) => ({
        ...prev,
        [fieldId]: url,
      }));
      setPreviewVisible((prev) => ({
        ...prev,
        [fieldId]: true,
      }));

      // Simulate upload progress
      setUploadProgress((prev) => ({
        ...prev,
        [fieldId]: 0,
      }));
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = Math.min((prev[fieldId] || 0) + 5, 100);
          if (newProgress === 100) clearInterval(interval);
          return {
            ...prev,
            [fieldId]: newProgress,
          };
        });
      }, 50);
    } else {
      setPreviewUrls((prev) => {
        const newUrls = {
          ...prev,
        };
        delete newUrls[fieldId];
        return newUrls;
      });
      setPreviewVisible((prev) => {
        const newVisible = {
          ...prev,
        };
        delete newVisible[fieldId];
        return newVisible;
      });
      setUploadProgress((prev) => {
        const newProgress = {
          ...prev,
        };
        delete newProgress[fieldId];
        return newProgress;
      });
    }
    onChange({
      ...value,
      [fieldId]: file,
    });
  };
  const togglePreviewVisibility = (fieldId: string) => {
    setPreviewVisible((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId],
    }));
  };
  const removeFile = (fieldId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileChange(fieldId, null);
    if (fileInputRefs.current[fieldId]) {
      fileInputRefs.current[fieldId]!.value = "";
    }
  };
  const selectedTypeConfig =
    identityTypes.find((type) => type.value === selectedType) ||
    identityTypes[0];
  const showError = touched && error;
  const getCompletionPercentage = () => {
    const requiredFields = selectedTypeConfig.fields.filter(
      (field) => field.required
    );
    if (requiredFields.length === 0) return 100;
    const completedFields = requiredFields.filter((field) => value[field.id]);
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };
  const completionPercentage = getCompletionPercentage();
  const isComplete = completionPercentage === 100;

  // Animation variants
  const cardVariants = {
    initial: {
      opacity: 0,
      y: 20,
      scale: 0.98,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.98,
      transition: {
        duration: 0.3,
        ease: "easeIn",
      },
    },
  };
  const fieldVariants = {
    initial: {
      opacity: 0,
      y: 5,
    },
    animate: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.2,
      },
    }),
  };
  const pulseAnimation = {
    initial: {
      scale: 1,
    },
    animate: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 1.5,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "reverse",
      },
    },
  };
  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label
            htmlFor={`${id}-type`}
            className={cn(
              "text-sm font-medium",
              showError ? "text-destructive" : ""
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {isComplete ? (
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800 flex items-center gap-1"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Complete</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800"
            >
              {completionPercentage}% Complete
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
        )}

        <div className="mb-6">
          <div className="relative h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
            <motion.div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-primary/80 dark:from-primary dark:to-primary/60"
              initial={{
                width: 0,
              }}
              animate={{
                width: `${completionPercentage}%`,
              }}
              transition={{
                duration: 0.5,
                ease: "easeInOut",
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {identityTypes.map((type) => {
            const isSelected = selectedType === type.value;
            const isHovered = hoveredType === type.value;
            const Icon = type.icon;
            return (
              <motion.button
                key={type.value}
                type="button"
                onClick={() => handleTypeChange(type.value)}
                onMouseEnter={() => setHoveredType(type.value)}
                onMouseLeave={() => setHoveredType(null)}
                className={cn(
                  "relative flex flex-col items-center p-5 rounded-xl border-2 transition-all dark:bg-zinc-900",
                  "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-zinc-900",
                  isSelected
                    ? `border-${type.color}-500 bg-gradient-to-br ${type.gradient} dark:bg-gradient-to-br dark:from-${type.color}-950/50 dark:to-${type.color}-900/20`
                    : "border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600"
                )}
                whileHover={{
                  y: -4,
                  transition: {
                    duration: 0.2,
                  },
                }}
                whileTap={{
                  scale: 0.98,
                }}
                animate={
                  isSelected
                    ? {
                        y: -4,
                      }
                    : {
                        y: 0,
                      }
                }
              >
                <motion.div
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-sm",
                    isSelected
                      ? `bg-${type.color}-100 text-${type.color}-600 dark:bg-${type.color}-950/50 dark:text-${type.color}-400`
                      : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
                  )}
                  initial={false}
                  animate={
                    isSelected || isHovered
                      ? {
                          scale: 1.1,
                          transition: {
                            type: "spring",
                            stiffness: 400,
                            damping: 10,
                          },
                        }
                      : {
                          scale: 1,
                        }
                  }
                >
                  <Icon className="w-8 h-8" />
                </motion.div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    isSelected
                      ? `text-${type.color}-700 dark:text-${type.color}-300`
                      : "text-gray-700 dark:text-zinc-300"
                  )}
                >
                  {type.label}
                </span>
                {isSelected && (
                  <motion.div
                    className="absolute top-2 right-2 bg-primary text-white rounded-full p-1"
                    initial={{
                      scale: 0,
                    }}
                    animate={{
                      scale: 1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 15,
                    }}
                  >
                    <Check className="w-3 h-3" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedType}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Card className="border-dashed overflow-hidden dark:bg-zinc-900 dark:border-zinc-700">
            <CardHeader className="pb-3 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent dark:from-primary/30 dark:via-primary/20 dark:to-transparent dark:bg-zinc-900">
              <CardTitle className="text-base flex items-center gap-2 dark:text-zinc-100">
                {selectedTypeConfig.icon({
                  className: "h-5 w-5",
                })}
                {selectedTypeConfig.label} Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6 dark:bg-zinc-900">
              {selectedTypeConfig.fields.map((field, index) => {
                return (
                  <motion.div
                    key={field.id}
                    className="space-y-2"
                    variants={fieldVariants}
                    initial="initial"
                    animate="animate"
                    custom={index}
                    onFocus={() => setActiveField(field.id)}
                    onBlur={() => setActiveField(null)}
                  >
                    <div className="flex justify-between items-center">
                      <Label
                        htmlFor={field.id}
                        className={cn(
                          "text-sm font-medium flex items-center gap-1.5 dark:text-zinc-200",
                          activeField === field.id
                            ? "text-primary dark:text-primary-400"
                            : ""
                        )}
                      >
                        {field.label}
                        {field.required && (
                          <span className="text-destructive">*</span>
                        )}
                      </Label>
                      {value?.[field.id] && (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          <span>Verified</span>
                        </Badge>
                      )}
                    </div>
                    {field.description && (
                      <p className="text-xs text-muted-foreground dark:text-zinc-400">
                        {field.description}
                      </p>
                    )}

                    <div
                      className={cn(
                        "relative border-2 border-dashed rounded-lg transition-all dark:bg-zinc-800/50",
                        "hover:border-primary/50 focus-within:border-primary/70 dark:hover:border-primary/60 dark:focus-within:border-primary/80",
                        value?.[field.id]
                          ? "bg-muted/20 border-primary/30 shadow-sm dark:bg-zinc-800/30 dark:border-primary/40"
                          : "border-gray-200 dark:border-zinc-700"
                      )}
                    >
                      <input
                        type="file"
                        id={field.id}
                        className="hidden"
                        accept={field.accept}
                        ref={(el) => {
                          fileInputRefs.current[field.id] = el;
                        }}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleFileChange(field.id, file);
                        }}
                      />
                      <label
                        htmlFor={field.id}
                        className="cursor-pointer block"
                      >
                        {value?.[field.id] ? (
                          <div className="p-4 dark:bg-zinc-800/30">
                            <div className="flex items-center gap-4">
                              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted dark:bg-zinc-800 flex-shrink-0 shadow-sm">
                                {/* Handle both File objects and string URLs */}
                                {typeof value[field.id] === "string" ? (
                                  // For string URLs (existing files)
                                  <>
                                    <img
                                      src={
                                        value[field.id] || "/placeholder.svg"
                                      }
                                      alt={field.label}
                                      className={cn(
                                        "w-full h-full object-cover transition-opacity duration-200",
                                        previewVisible[field.id] !== false
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                      onError={(e) => {
                                        e.currentTarget.src =
                                          "/placeholder.svg?height=80&width=80";
                                      }}
                                    />
                                    <div
                                      className={cn(
                                        "absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity duration-200",
                                        previewVisible[field.id] !== false
                                          ? "opacity-0 hover:opacity-100"
                                          : "opacity-100"
                                      )}
                                    >
                                      <button
                                        type="button"
                                        className="text-white p-1"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          togglePreviewVisibility(field.id);
                                        }}
                                      >
                                        {previewVisible[field.id] !== false ? (
                                          <EyeOff className="h-5 w-5" />
                                        ) : (
                                          <Eye className="h-5 w-5" />
                                        )}
                                      </button>
                                    </div>
                                  </>
                                ) : previewUrls[field.id] ? (
                                  // For File objects with preview URLs
                                  <>
                                    <img
                                      src={
                                        previewUrls[field.id] ||
                                        "/placeholder.svg"
                                      }
                                      alt={field.label}
                                      className={cn(
                                        "w-full h-full object-cover transition-opacity duration-200",
                                        previewVisible[field.id]
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div
                                      className={cn(
                                        "absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity duration-200",
                                        previewVisible[field.id]
                                          ? "opacity-0 hover:opacity-100"
                                          : "opacity-100"
                                      )}
                                    >
                                      <button
                                        type="button"
                                        className="text-white p-1"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          togglePreviewVisibility(field.id);
                                        }}
                                      >
                                        {previewVisible[field.id] ? (
                                          <EyeOff className="h-5 w-5" />
                                        ) : (
                                          <Eye className="h-5 w-5" />
                                        )}
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-primary/20">
                                    {field.icon === "selfie" ? (
                                      <SelfieIcon className="h-8 w-8 text-primary/70" />
                                    ) : (
                                      <DocumentIcon className="h-8 w-8 text-primary/70" />
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium truncate dark:text-zinc-200">
                                    {typeof value[field.id] === "string"
                                      ? value[field.id].split("/").pop()
                                      : value[field.id]?.name ||
                                        "Uploaded file"}
                                  </span>
                                  <span className="text-xs text-muted-foreground dark:text-zinc-400">
                                    {typeof value[field.id] === "string"
                                      ? "Verified"
                                      : value[field.id]?.size
                                        ? `${(value[field.id].size / 1024).toFixed(1)} KB`
                                        : ""}
                                  </span>
                                </div>
                                {uploadProgress[field.id] !== undefined &&
                                uploadProgress[field.id] < 100 ? (
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span>Uploading...</span>
                                      <span>{uploadProgress[field.id]}%</span>
                                    </div>
                                    <Progress
                                      value={uploadProgress[field.id]}
                                      className="h-1.5"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center text-xs text-green-600 dark:text-green-400 gap-1 mb-2">
                                    <Check className="h-3 w-3" />
                                    <span>Uploaded successfully</span>
                                  </div>
                                )}
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 text-xs"
                                  >
                                    Change
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                    onClick={(e) => removeFile(field.id, e)}
                                  >
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 flex flex-col items-center gap-3 dark:bg-zinc-800/20">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 flex items-center justify-center shadow-sm">
                              {field.icon === "selfie" ? (
                                <Camera className="h-8 w-8 text-primary/70" />
                              ) : (
                                <Upload className="h-8 w-8 text-primary/70" />
                              )}
                            </div>
                            <p className="text-sm font-medium text-primary/80 dark:text-primary-400 mb-1">
                              {field.icon === "selfie"
                                ? "Take a photo or upload a selfie"
                                : "Drag and drop or click to upload"}
                            </p>
                            <p className="text-xs text-muted-foreground dark:text-zinc-400">
                              {field.accept
                                ? `Supports ${field.accept.replace(/image\//g, "").replace(/,/g, ", ")}`
                                : ""}
                            </p>
                          </div>
                        )}
                      </label>
                    </div>
                  </motion.div>
                );
              })}

              <div className="pt-3 mt-2 border-t border-dashed border-gray-200 dark:border-zinc-700">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-zinc-400">
                        <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-950/50">
                          <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span>
                          Your documents are encrypted and securely stored
                        </span>
                        <Lock className="h-3.5 w-3.5 text-muted-foreground/70 dark:text-zinc-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        All your documents are encrypted using industry-standard
                        encryption and stored securely. Your privacy is our
                        priority.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 dark:bg-zinc-800/30 px-5 py-3 flex justify-between">
              <div className="text-xs text-muted-foreground dark:text-zinc-400">
                {isComplete ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    All required documents uploaded
                  </span>
                ) : (
                  <span>
                    Please upload{" "}
                    {
                      selectedTypeConfig.fields.filter(
                        (f) => f.required && !value[f.id]
                      ).length
                    }{" "}
                    more required document(s)
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground dark:text-zinc-400">
                Verification powered by{" "}
                <span className="font-medium text-primary dark:text-primary-400">
                  Secure ID Verification
                </span>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>

      {showError && (
        <motion.div
          initial={{
            opacity: 0,
            height: 0,
          }}
          animate={{
            opacity: 1,
            height: "auto",
          }}
          exit={{
            opacity: 0,
            height: 0,
          }}
          className="text-xs text-destructive mt-1 flex items-center gap-1"
        >
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
}
