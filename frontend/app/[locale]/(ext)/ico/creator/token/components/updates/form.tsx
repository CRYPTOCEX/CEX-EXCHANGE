"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Loader2,
  Plus,
  X,
  FileText,
  Link2,
  ImageIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTokenUpdateStore } from "@/store/ico/creator/updates-store";
import { ImageUpload } from "@/components/ui/image-upload";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { imageUploader } from "@/utils/upload";

// Extend the Attachment type to include an optional file property
export type Attachment = {
  type: "image" | "document" | "link";
  url: string;
  name: string;
  file?: File;
};

// Define form data state type explicitly
type UpdateFormData = {
  title: string;
  content: string;
  attachments: Attachment[];
};
type UpdateFormProps = {
  tokenId: string;
  update?: icoTokenOfferingUpdateAttributes;
  onSuccess?: () => void;
  onCancel?: () => void;
};
export function UpdateForm({
  tokenId,
  update,
  onSuccess,
  onCancel,
}: UpdateFormProps) {
  // Initialize form data with explicit type annotation.
  const [formData, setFormData] = useState<UpdateFormData>({
    title: update?.title || "",
    content: update?.content || "",
    attachments: Array.isArray(update?.attachments)
      ? (update.attachments as Attachment[])
      : [],
  });

  // New attachment state for building a new attachment.
  const [newAttachment, setNewAttachment] = useState<Attachment>({
    type: "image",
    url: "",
    name: "",
    file: undefined,
  });
  const [activeTab, setActiveTab] = useState("content");
  const [isUploading, setIsUploading] = useState(false);
  const {
    postUpdate,
    editUpdate,
    isSubmitting,
    error: submitError,
  } = useTokenUpdateStore();
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleAttachmentChange = (field: keyof Attachment, value: string) => {
    setNewAttachment((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Instead of uploading immediately, store the file and a preview URL.
  const handleImageUploadChange = async (file: File | null) => {
    if (!file) {
      handleAttachmentChange("url", "");
      setNewAttachment((prev) => ({
        ...prev,
        file: undefined,
      }));
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setNewAttachment({
      type: "image",
      url: previewUrl,
      name: newAttachment.name || file.name,
      file,
    });
  };

  // Add a new attachment to the form state.
  const addAttachment = () => {
    if (newAttachment.url.trim() && newAttachment.name.trim()) {
      setFormData((prev) => ({
        ...prev,
        attachments: [
          ...prev.attachments,
          {
            ...newAttachment,
          },
        ],
      }));
      if (newAttachment.url) {
        URL.revokeObjectURL(newAttachment.url);
      }
      setNewAttachment({
        type: "image",
        url: "",
        name: "",
        file: undefined,
      });
    }
  };
  const removeAttachment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Process attachments: upload images that have a File attached.
      const processedAttachments: Attachment[] = await Promise.all(
        formData.attachments.map(async (att) => {
          if (att.type === "image" && att.file) {
            const uploadResult = await imageUploader({
              file: att.file,
              dir: "token-updates",
              size: {
                maxWidth: 1024,
                maxHeight: 728,
              },
              oldPath: "",
            });
            if (uploadResult.success) {
              return {
                ...att,
                url: uploadResult.url,
                file: undefined,
              };
            } else {
              throw new Error("Image upload failed: " + uploadResult.error);
            }
          }
          return att;
        })
      );
      if (update?.id) {
        await editUpdate({
          ...update,
          title: formData.title,
          content: formData.content,
          attachments: processedAttachments,
        });
      } else {
        await postUpdate({
          tokenId,
          title: formData.title,
          content: formData.content,
          attachments: processedAttachments,
        });
      }
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting update:", error);
    }
  };
  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "link":
        return <Link2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <Input
          id="title"
          name="title"
          title="Title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter a title for your update"
          required
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="attachments">
              Attachments
              {formData.attachments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {formData.attachments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="content"
            className="space-y-4 mt-4 max-h-[50vh] overflow-y-auto pe-2"
          >
            <Textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Share news, milestones, or important information with your investors..."
              required
              rows={8}
              className="resize-y min-h-[200px]"
              title="Content"
            />
          </TabsContent>

          <TabsContent
            value="attachments"
            className="space-y-4 mt-4 max-h-[50vh] overflow-y-auto pe-2"
          >
            {/* Helper text to remind users to add the attachment */}
            <p className="text-sm text-muted-foreground">
              After selecting an image or entering details, please click "Add
              Attachment" to include it.
            </p>

            <div className="space-y-4">
              <Label>Current Attachments</Label>
              {formData.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No attachments added yet.
                </p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {formData.attachments.map((attachment, index) => {
                      return (
                        <motion.div
                          key={index}
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
                          transition={{
                            duration: 0.2,
                          }}
                        >
                          <div className="flex items-center gap-2 p-3 border rounded-md group hover:bg-muted/50 transition-colors">
                            <div className="flex-shrink-0">
                              {getAttachmentIcon(attachment.type)}
                            </div>
                            <div className="flex-grow overflow-hidden">
                              <p className="font-medium truncate">
                                {attachment.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {attachment.url}
                              </p>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeAttachment(index)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Remove attachment
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              <div className="border rounded-md p-4 space-y-4">
                <Label>Add New Attachment</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    value={newAttachment.type}
                    onValueChange={(value) =>
                      handleAttachmentChange("type", value as any)
                    }
                  >
                    <SelectTrigger
                      id="attachmentType"
                      title="Type"
                      className="w-full"
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="attachmentName"
                    title="Name"
                    value={newAttachment.name}
                    onChange={(e) =>
                      handleAttachmentChange("name", e.target.value)
                    }
                    placeholder="Attachment name"
                  />
                </div>

                <div>
                  {newAttachment.type === "image" ? (
                    <div className="mt-4">
                      <ImageUpload
                        onChange={handleImageUploadChange}
                        value={newAttachment.url}
                        loading={isUploading}
                        title="Select Image"
                      />
                    </div>
                  ) : (
                    <div className="mt-4">
                      <Input
                        id="attachmentUrl"
                        title="URL"
                        value={newAttachment.url}
                        onChange={(e) =>
                          handleAttachmentChange("url", e.target.value)
                        }
                        placeholder={
                          newAttachment.type === "document"
                            ? "https://example.com/document.pdf"
                            : "https://example.com"
                        }
                      />
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={addAttachment}
                  disabled={
                    !newAttachment.url || !newAttachment.name || isUploading
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Attachment
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            isSubmitting || isUploading || !formData.title || !formData.content
          }
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {update ? "Update" : "Post"}
        </Button>
      </div>
    </form>
  );
}
