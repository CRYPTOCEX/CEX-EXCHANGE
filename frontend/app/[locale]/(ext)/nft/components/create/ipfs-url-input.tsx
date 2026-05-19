"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Globe,
  FileText
} from "lucide-react";
import Image from "next/image";
import { MetadataGenerator } from "./metadata-generator";
import { useTranslations } from "next-intl";

interface IPFSUrlInputProps {
  onImageValidated: (url: string, isValid: boolean) => void;
  onMetadataValidated?: (url: string, metadata: any) => void;
  onComplete?: () => void;
  onShowGuide?: () => void;
}

export function IPFSUrlInput({ onImageValidated, onMetadataValidated, onComplete, onShowGuide }: IPFSUrlInputProps) {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const [imageUrl, setImageUrl] = useState("");
  const [metadataUrl, setMetadataUrl] = useState("");
  const [imageValidating, setImageValidating] = useState(false);
  const [metadataValidating, setMetadataValidating] = useState(false);
  const [imageValid, setImageValid] = useState<boolean | null>(null);
  const [metadataValid, setMetadataValid] = useState<boolean | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [metadata, setMetadata] = useState<any>(null);
  const [error, setError] = useState<string>("");

  // Helper to convert IPFS URL to HTTP gateway URL
  const ipfsToHttp = (url: string): string => {
    if (url.startsWith('ipfs://')) {
      const hash = url.replace('ipfs://', '');
      return `https://gateway.pinata.cloud/ipfs/${hash}`;
    }
    return url;
  };

  // Validate if string is valid IPFS hash (CID)
  const isValidIPFSHash = (hash: string): boolean => {
    // CIDv0 validation: Qm followed by 44 base58 characters
    const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    // CIDv1 validation: starts with 'b' (base32) followed by alphanumeric
    // Examples: bafybei..., bafkrei...
    const cidV1Regex = /^baf[a-z0-9]{50,}$/i;
    return cidV0Regex.test(hash) || cidV1Regex.test(hash);
  };

  // Extract IPFS hash from URL (supports Pinata gateway URLs)
  const extractIPFSHash = (url: string): string | null => {
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', '');
    }
    // Match both standard gateways and Pinata subdomain gateways
    // Examples:
    // - https://gateway.pinata.cloud/ipfs/Qm...
    // - https://turquoise-above-baboon-616.mypinata.cloud/ipfs/bafybei...
    const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  // Validate image URL
  const validateImageUrl = async () => {
    setError("");
    setImageValid(null);
    setImagePreview("");
    setImageValidating(true);

    try {
      // Check if URL is provided
      if (!imageUrl.trim()) {
        throw new Error("Please enter an IPFS URL");
      }

      // Extract and validate IPFS hash
      const hash = extractIPFSHash(imageUrl);
      if (!hash) {
        throw new Error("Invalid IPFS URL format. Use: ipfs://Qm... or gateway URL");
      }

      if (!isValidIPFSHash(hash)) {
        throw new Error("Invalid IPFS hash (CID)");
      }

      // Convert to HTTP URL for fetching
      const httpUrl = ipfsToHttp(imageUrl);

      // Try to fetch and validate it's an image
      const response = await fetch(httpUrl, { method: 'HEAD' });

      if (!response.ok) {
        throw new Error("Cannot access IPFS URL. Make sure the file is pinned and accessible.");
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.startsWith('image/') && !contentType?.startsWith('video/')) {
        throw new Error("URL does not point to an image or video file");
      }

      // Set preview
      setImagePreview(httpUrl);
      setImageValid(true);
      onImageValidated(imageUrl, true);

    } catch (err: any) {
      setError(err.message);
      setImageValid(false);
      onImageValidated(imageUrl, false);
    } finally {
      setImageValidating(false);
    }
  };

  // Validate metadata URL
  const validateMetadataUrl = async () => {
    setError("");
    setMetadataValid(null);
    setMetadata(null);
    setMetadataValidating(true);

    try {
      // Metadata is optional
      if (!metadataUrl.trim()) {
        setMetadataValid(null);
        setMetadataValidating(false);
        return;
      }

      // Extract and validate IPFS hash
      const hash = extractIPFSHash(metadataUrl);
      if (!hash) {
        throw new Error("Invalid IPFS metadata URL format");
      }

      if (!isValidIPFSHash(hash)) {
        throw new Error("Invalid IPFS hash (CID) for metadata");
      }

      // Convert to HTTP URL and fetch
      const httpUrl = ipfsToHttp(metadataUrl);
      const response = await fetch(httpUrl);

      if (!response.ok) {
        throw new Error("Cannot access metadata URL. Make sure it's pinned.");
      }

      const data = await response.json();

      // Validate metadata structure (ERC-721 standard)
      if (!data.name || !data.description || !data.image) {
        throw new Error("Invalid metadata structure. Must include: name, description, and image");
      }

      setMetadata(data);
      setMetadataValid(true);
      onMetadataValidated?.(metadataUrl, data);

    } catch (err: any) {
      setError(err.message);
      setMetadataValid(false);
      onMetadataValidated?.(metadataUrl, null);
    } finally {
      setMetadataValidating(false);
    }
  };

  const canProceed = imageValid === true && (metadataValid === true || metadataValid === null);

  return (
    <div className="space-y-6">
      {/* Need Help Banner */}
      {onShowGuide && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{t("new_to_ipfs_need_help_uploading_your_image")}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onShowGuide}
              className="ml-4"
            >
              {t("view_guide")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Image URL Input */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className={`h-5 w-5 text-purple-600`} />
            IPFS Image URL
            <Badge variant="destructive" className="text-xs">Required</Badge>
          </CardTitle>
          <CardDescription>
            {t("paste_the_ipfs_url_of_your_uploaded_nft_image")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>IPFS Image URL</Label>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImageValid(null);
                  setImagePreview("");
                }}
                placeholder="ipfs://Qm... or https://gateway..."
                className="font-mono text-sm flex-1"
                disabled={imageValidating}
              />
              <Button
                onClick={validateImageUrl}
                disabled={imageValidating || !imageUrl.trim()}
                size="default"
              >
                {imageValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Validate"
                )}
              </Button>
            </div>
          </div>

          {/* Validation Status */}
          {imageValid === true && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>{t("image_validated")}</strong> {t("your_ipfs_url_is_working_correctly")}
              </AlertDescription>
            </Alert>
          )}

          {imageValid === false && error && (
            <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                <strong>{t("validation_failed")}</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Image Preview */}
          {imagePreview && imageValid && (
            <div className="mt-4">
              <Label className="mb-2 block">{tCommon("preview")}</Label>
              <div className={`relative aspect-square max-w-sm mx-auto bg-muted rounded-xl overflow-hidden border-2 border-purple-500`}>
                <Image
                  src={imagePreview}
                  alt="IPFS Image Preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* Format Examples */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg text-xs space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <Sparkles className="h-3 w-3" />
              {t("accepted_url_formats")}
            </p>
            <ul className="space-y-1 font-mono text-muted-foreground ml-4 text-[10px]">
              <li>{"https://your-gateway.mypinata.cloud/ipfs/"}</li>
              <li>{"https://gateway.pinata.cloud/ipfs/bafybei..."}</li>
              <li>{"https://ipfs.io/ipfs/..."}</li>
              <li>{t("ipfs_bafybei_ellipsis_advanced")}</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>{t("tip")}</strong> {t("just_copy_the_url_from_your")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Metadata URL Input (Optional) - Advanced Users Only */}
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className={`h-5 w-5 text-purple-600`} />
            IPFS Metadata URL
            <Badge variant="outline" className="text-xs">{t("advanced_optional")}</Badge>
          </CardTitle>
          <CardDescription>
            <strong>{t("for_advanced_users")}</strong> {t("if_youve_manually_created_and_uploaded")} {t("otherwise_skip_this_well_generate_metadata")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>IPFS Metadata JSON URL</Label>
            <div className="flex gap-2">
              <Input
                value={metadataUrl}
                onChange={(e) => {
                  setMetadataUrl(e.target.value);
                  setMetadataValid(null);
                  setMetadata(null);
                }}
                placeholder={t("ipfs_qm_ellipsis_optional")}
                className="font-mono text-sm flex-1"
                disabled={metadataValidating}
              />
              <Button
                onClick={validateMetadataUrl}
                disabled={metadataValidating || !metadataUrl.trim()}
                variant="outline"
              >
                {metadataValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Validate"
                )}
              </Button>
            </div>
          </div>

          {/* Metadata Validation Status */}
          {metadataValid === true && metadata && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>{t("metadata_validated")}</strong> {tExt("found")} {metadata.name}
                <div className="mt-2 p-2 bg-background/50 rounded text-xs font-mono overflow-x-auto">
                  <pre>{JSON.stringify(metadata, null, 2)}</pre>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {metadataValid === false && error && (
            <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                <strong>{t("validation_failed")}</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Info about metadata */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>{t("not_required")}</strong> {t("if_you_skip_this_well_create")} {t("only_use_this_if_youve_manually")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => window.open('https://docs.pinata.cloud', '_blank')}
          size="lg"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          IPFS Documentation
        </Button>
        <Button
          onClick={onComplete}
          disabled={!canProceed}
          size="lg"
          className={`bg-gradient-to-r from-primary to-purple-600`}
        >
          {canProceed ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t("continue_to_nft_details")}
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 mr-2" />
              {t("validate_image_url_first")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
