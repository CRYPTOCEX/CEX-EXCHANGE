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

interface IPFSUrlInputProps {
  onImageValidated: (url: string, isValid: boolean) => void;
  onMetadataValidated?: (url: string, metadata: any) => void;
  onComplete?: () => void;
  onShowGuide?: () => void;
}

export function IPFSUrlInput({ onImageValidated, onMetadataValidated, onComplete, onShowGuide }: IPFSUrlInputProps) {
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
            <span>New to IPFS? Need help uploading your image?</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onShowGuide}
              className="ml-4"
            >
              View Guide
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Image URL Input */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            IPFS Image URL
            <Badge variant="destructive" className="text-xs">Required</Badge>
          </CardTitle>
          <CardDescription>
            Paste the IPFS URL of your uploaded NFT image
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
                placeholder="ipfs://Qm... or https://gateway.pinata.cloud/ipfs/Qm..."
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
                <strong>Image validated!</strong> Your IPFS URL is working correctly.
              </AlertDescription>
            </Alert>
          )}

          {imageValid === false && error && (
            <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                <strong>Validation failed:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Image Preview */}
          {imagePreview && imageValid && (
            <div className="mt-4">
              <Label className="mb-2 block">Preview:</Label>
              <div className="relative aspect-square max-w-sm mx-auto bg-muted rounded-xl overflow-hidden border-2 border-primary">
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
              Accepted URL formats:
            </p>
            <ul className="space-y-1 font-mono text-muted-foreground ml-4 text-[10px]">
              <li>✓ https://[your-gateway].mypinata.cloud/ipfs/bafybei... (Recommended)</li>
              <li>✓ https://gateway.pinata.cloud/ipfs/bafybei...</li>
              <li>✓ https://ipfs.io/ipfs/...</li>
              <li>✓ ipfs://bafybei... (Advanced)</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>Tip:</strong> Just copy the URL from your browser after viewing your file on Pinata!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Metadata URL Input (Optional) - Advanced Users Only */}
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            IPFS Metadata URL
            <Badge variant="outline" className="text-xs">Advanced - Optional</Badge>
          </CardTitle>
          <CardDescription>
            <strong>For advanced users:</strong> If you've manually created and uploaded a complete ERC-721 metadata.json file to IPFS, paste its URL here. Otherwise, skip this - we'll generate metadata automatically from your NFT details in the next steps.
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
                placeholder="ipfs://Qm... (optional)"
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
                <strong>Metadata validated!</strong> Found: {metadata.name}
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
                <strong>Validation failed:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Info about metadata */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Not required!</strong> If you skip this, we'll create the metadata for you using your NFT details in the next steps.
              Only use this if you've manually created a metadata.json file following the ERC-721 standard.
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
          className="bg-gradient-to-r from-primary to-purple-600"
        >
          {canProceed ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Continue to NFT Details
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 mr-2" />
              Validate Image URL First
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
