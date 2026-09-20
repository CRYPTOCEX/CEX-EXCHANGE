"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Copy,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Plus,
  X
} from "lucide-react";
import { useTranslations } from "next-intl";

interface MetadataGeneratorProps {
  imageIpfsUrl: string;
  onMetadataGenerated?: (metadata: any, jsonString: string) => void;
}

export function MetadataGenerator({ imageIpfsUrl, onMetadataGenerated }: MetadataGeneratorProps) {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [attributes, setAttributes] = useState<Array<{ trait_type: string; value: string }>>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Generate metadata whenever inputs change
  useEffect(() => {
    if (!name) return;

    const generatedMetadata = {
      name,
      description: description || t("a_unique_nft", { name: String(name) }),
      image: imageIpfsUrl,
      ...(externalUrl && { external_url: externalUrl }),
      ...(attributes.length > 0 && { attributes: attributes.filter(attr => attr.trait_type && attr.value) })
    };

    setMetadata(generatedMetadata);

    if (onMetadataGenerated) {
      onMetadataGenerated(generatedMetadata, JSON.stringify(generatedMetadata, null, 2));
    }
  }, [name, description, externalUrl, attributes, imageIpfsUrl, onMetadataGenerated]);

  const addAttribute = () => {
    setAttributes([...attributes, { trait_type: "", value: "" }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const updateAttribute = (index: number, field: 'trait_type' | 'value', value: string) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    setAttributes(newAttributes);
  };

  const copyToClipboard = () => {
    if (metadata) {
      navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadMetadata = () => {
    if (!metadata) return;

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-metadata.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Alert className="border-primary/50 bg-primary/5">
        <FileText className="h-4 w-4 text-primary" />
        <AlertDescription>
          <strong>{t("create_metadata_json")}</strong> - {t("since_pinata_doesnt_auto_generate_metadata")}
        </AlertDescription>
      </Alert>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("metadata_generator")}
          </CardTitle>
          <CardDescription>
            {t("fill_in_your_nft_details_to")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>
              {t("nft_name")} <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("my_awesome_nft")}
              className="border-2"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`${t("a_detailed_description_of_your_nft")}…`}
              rows={3}
              className="border-2"
            />
          </div>

          {/* External URL */}
          <div className="space-y-2">
            <Label>
              {t("external_url")} <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>
            </Label>
            <Input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="border-2"
            />
            <p className="text-xs text-muted-foreground">
              {t("link_to_your_website_or_additional")}
            </p>
          </div>

          {/* Attributes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                Attributes <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAttribute}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                {tCommon("add_attribute")}
              </Button>
            </div>

            {attributes.map((attr, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={attr.trait_type}
                  onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)}
                  placeholder="Trait Type (e.g., Background)"
                  className="flex-1"
                />
                <Input
                  value={attr.value}
                  onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                  placeholder="Value (e.g., Blue)"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAttribute(index)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {attributes.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                Attributes add special properties to your NFT (e.g., Background: Blue, Rarity: Rare)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generated Metadata Preview */}
      {metadata && name && (
        <Card className="border-2 border-success/50 bg-success/5 dark:bg-success/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              {t("generated_metadata")}
            </CardTitle>
            <CardDescription>
              {t("your_erc_721_compliant_metadata_json_is_ready")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* JSON Preview */}
            <div className="relative">
              <pre className="p-4 bg-background border-2 rounded-lg overflow-x-auto text-xs font-mono max-h-96">
                <code>{JSON.stringify(metadata, null, 2)}</code>
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1 text-success" />
                    {tCommon("copied")}
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>{tCommon("next_steps")}</strong>
                  <ol className="list-decimal ml-4 mt-2 space-y-1">
                    <li>{t("download_this_metadata_json_file")}</li>
                    <li>Go to Pinata and upload it (same as you uploaded the image)</li>
                    <li>{t("copy_the_metadata_files_ipfs_url")}</li>
                    <li>{t("paste_it_in_the_ipfs_metadata_url_field_below")}</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  onClick={downloadMetadata}
                  className="flex-1 bg-success"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("download_metadata_json")}
                </Button>
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {t("copy_json")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions if no name */}
      {!name && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("enter_your_nft_name_to_generate_metadata")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
