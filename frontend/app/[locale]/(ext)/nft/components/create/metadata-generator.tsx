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

interface MetadataGeneratorProps {
  imageIpfsUrl: string;
  onMetadataGenerated?: (metadata: any, jsonString: string) => void;
}

export function MetadataGenerator({ imageIpfsUrl, onMetadataGenerated }: MetadataGeneratorProps) {
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
      description: description || `${name} - A unique NFT`,
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
          <strong>Create Metadata JSON</strong> - Since Pinata doesn't auto-generate metadata, use this tool to create your metadata.json file. You can then upload it to Pinata and use the URL.
        </AlertDescription>
      </Alert>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Metadata Generator
          </CardTitle>
          <CardDescription>
            Fill in your NFT details to generate ERC-721 compliant metadata
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>
              NFT Name <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome NFT"
              className="border-2"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A detailed description of your NFT..."
              rows={3}
              className="border-2"
            />
          </div>

          {/* External URL */}
          <div className="space-y-2">
            <Label>
              External URL <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>
            </Label>
            <Input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="border-2"
            />
            <p className="text-xs text-muted-foreground">
              Link to your website or additional info about this NFT
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
                Add Attribute
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
        <Card className="border-2 border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle2 className="h-5 w-5" />
              Generated Metadata
            </CardTitle>
            <CardDescription>
              Your ERC-721 compliant metadata.json is ready!
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
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                    Copied!
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
                  <strong>Next Steps:</strong>
                  <ol className="list-decimal ml-4 mt-2 space-y-1">
                    <li>Download this metadata.json file</li>
                    <li>Go to Pinata and upload it (same as you uploaded the image)</li>
                    <li>Copy the metadata file's IPFS URL</li>
                    <li>Paste it in the "IPFS Metadata URL" field below</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  onClick={downloadMetadata}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download metadata.json
                </Button>
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy JSON
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
            Enter your NFT name to generate metadata. The metadata will update automatically as you type.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
