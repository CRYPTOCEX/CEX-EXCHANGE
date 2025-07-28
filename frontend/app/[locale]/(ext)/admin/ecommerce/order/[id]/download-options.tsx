"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import {
  Download,
  Key,
  FileText,
  LinkIcon,
  CheckCircle,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface DownloadOptionsManagerProps {
  order: any;
  product: any;
  orderItem: any;
  fetchOrder: () => void;
  canEdit: boolean;
}

const DownloadOptionsManager: React.FC<DownloadOptionsManagerProps> = ({
  order,
  product,
  orderItem,
  fetchOrder,
  canEdit,
}) => {
  const t = useTranslations("ext");
  const [downloadOption, setDownloadOption] = useState("");
  const [downloadLink, setDownloadLink] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (orderItem) {
      if (orderItem.key && orderItem.filePath) {
        setDownloadOption("both");
        setLicenseKey(orderItem.key);
        setDownloadLink(orderItem.filePath);
      } else if (orderItem.key) {
        setDownloadOption("license");
        setLicenseKey(orderItem.key);
      } else if (orderItem.filePath) {
        setDownloadOption("file");
        setDownloadLink(orderItem.filePath);
      }
      setInstructions(orderItem.instructions || "");
    }
  }, [orderItem]);

  const handleDownloadOptionUpdate = async () => {
    if (!order || !orderItem) {
      toast.error("Order item not found.");
      return;
    }

    if (!downloadOption) {
      toast.error("Please select a download option");
      return;
    }

    const validationErrors: string[] = [];

    if (
      downloadOption === "both" &&
      (!licenseKey.trim() || !downloadLink.trim())
    ) {
      validationErrors.push("Both license key and download link are required");
    }
    if (downloadOption === "license" && !licenseKey.trim()) {
      validationErrors.push("License key is required");
    }
    if (downloadOption === "file" && !downloadLink.trim()) {
      validationErrors.push("Download link is required");
    }

    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => toast.error(error));
      return;
    }

    setIsUpdating(true);

    const { error } = await $fetch({
      url: `/api/admin/ecommerce/order/${order.id}/download`,
      method: "PUT",
      body: {
        orderItemId: orderItem.id,
        key:
          downloadOption === "license" || downloadOption === "both"
            ? licenseKey
            : undefined,
        filePath:
          downloadOption === "file" || downloadOption === "both"
            ? downloadLink
            : undefined,
        instructions: instructions.trim() || undefined,
      },
    });

    if (error) {
      toast.error("Failed to update download options");
    } else {
      toast.success("Download options updated successfully");
      fetchOrder();
    }

    setIsUpdating(false);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard`);
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const getStatusBadge = () => {
    const hasKey = orderItem?.key;
    const hasFile = orderItem?.filePath;

    if (hasKey && hasFile) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          {t("Complete")}
        </Badge>
      );
    } else if (hasKey || hasFile) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          {t("Partial")}
        </Badge>
      );
    } else {
      return <Badge variant="destructive">{t("pending_setup")}</Badge>;
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500 dark:border-l-blue-400">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{product.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("digital_product")}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Status Overview */}
        {(orderItem?.key || orderItem?.filePath) && (
          <div className="bg-muted/30 dark:bg-zinc-800/50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {t("current_download_options")}
            </h4>

            {orderItem.key && (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded border">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{t("license_key")}</span>
                  <code className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-sm">
                    {showKey ? orderItem.key : "••••••••••••"}
                  </code>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(orderItem.key, "License key")
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {orderItem.filePath && (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded border">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{t("download_link")}</span>
                  <code className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-sm truncate max-w-xs">
                    {orderItem.filePath}
                  </code>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(orderItem.filePath, "Download link")
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Configuration Section */}
        {canEdit && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <h4 className="font-medium">{t("configure_download_options")}</h4>
            </div>

            <div className="space-y-4">
              <Select value={downloadOption} onValueChange={setDownloadOption}>
                <SelectTrigger title="Download Type">
                  <SelectValue placeholder="Select download type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="license">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      {t("license_key_only")}
                    </div>
                  </SelectItem>
                  <SelectItem value="file">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t("downloadable_file_only")}
                    </div>
                  </SelectItem>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      {t("both_license_key_&_file")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {downloadOption && (
                <div className="grid grid-cols-1 gap-4">
                  {(downloadOption === "license" ||
                    downloadOption === "both") && (
                    <div className="relative">
                      <Input
                        id="licenseKey"
                        title="License Key"
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value)}
                        placeholder="Enter license key"
                        icon={"mdi:key"}
                      />
                    </div>
                  )}

                  {(downloadOption === "file" || downloadOption === "both") && (
                    <div className="relative">
                      <Input
                        id="downloadLink"
                        title="Download Link"
                        value={downloadLink}
                        onChange={(e) => setDownloadLink(e.target.value)}
                        placeholder="Enter download URL"
                        icon={"mdi:link"}
                      />
                    </div>
                  )}

                  <Textarea
                    id="instructions"
                    title="Instructions (Optional)"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Add any special instructions for the customer..."
                    rows={3}
                  />
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleDownloadOptionUpdate}
                  disabled={isUpdating || !downloadOption}
                  className="min-w-32"
                >
                  {isUpdating ? "Updating..." : "Update Options"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {!canEdit && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                {t("download_options_can_is_pending")}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DownloadOptionsManager;
