"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save,
  ArrowLeft,
  Eye,
  RefreshCw,
  FileText,
  Tag,
  Settings
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import { useDebounce, useDebouncedCallback } from "@/hooks/use-debounce";
import RichTextEditor from "@/components/ui/editor";
import {
  SectionCard,
  HeroSectionEditor,
  FeaturesSectionEditor,
  GlobalSectionEditor,
  GettingStartedEditor,
  CTASectionEditor,
  type EditorProps
} from "./";

interface PageContent {
  id: string;
  pageId: string;
  type: 'variables' | 'content';
  title: string;
  variables?: Record<string, any>;
  content?: string;
  meta?: Record<string, any>;
  status: string;
  lastModified: string;
}

interface DefaultPageEditorProps {
  pageId: string;
}

export function DefaultPageEditor({ pageId }: DefaultPageEditorProps) {
  const router = useRouter();
  
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasLocalBackup, setHasLocalBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("content");

  // Determine page source based on pageId
  const getPageSource = () => {
    if (pageId === 'home-builder') {
      return 'builder';
    }
    return 'default';
  };

  // Get actual pageId (remove -builder suffix)
  const getActualPageId = () => {
    if (pageId === 'home-builder') {
      return 'home';
    }
    return pageId;
  };

  const actualPageId = getActualPageId();
  const isHomePage = actualPageId === 'home';

  // Load page content
  useEffect(() => {
    const fetchPageContent = async () => {
      try {
        setLoading(true);
        const pageSource = getPageSource();
        
        const { data, error } = await $fetch({
          url: `/api/admin/default-editor/${actualPageId}?pageSource=${pageSource}`,
          method: "GET",
          silentSuccess: true,
        });
      
        if (error) {
          // If admin endpoint fails, try public endpoint
          const { data: publicData, error: publicError } = await $fetch({
            url: `/api/public/default-page/${actualPageId}?pageSource=${pageSource}`,
            method: "GET",
            silent: true,
          });
          
          if (!publicError && publicData) {
            setPageContent(publicData);
            return;
          }
          
          // Create fallback content
          const defaultPageContent = {
            id: 'frontend-fallback',
            pageId: actualPageId,
            pageSource: getPageSource(),
            type: isHomePage ? 'variables' as const : 'content' as const,
            title: `${actualPageId.charAt(0).toUpperCase() + actualPageId.slice(1)} Page`,
            variables: isHomePage ? {} : undefined,
            content: isHomePage ? "" : `<h1>${actualPageId.charAt(0).toUpperCase() + actualPageId.slice(1)}</h1><p>Default content for ${actualPageId} page.</p>`,
            meta: {
              seoTitle: `${actualPageId.charAt(0).toUpperCase() + actualPageId.slice(1)} Page`,
              seoDescription: `${actualPageId.charAt(0).toUpperCase() + actualPageId.slice(1)} page content`,
              keywords: []
            },
            status: 'active' as const,
            lastModified: new Date().toISOString()
          };
          
          setPageContent(defaultPageContent);
          return;
        }

        // Ensure meta field is always an object
        if (data && typeof data.meta === 'string') {
          try {
            data.meta = JSON.parse(data.meta);
          } catch (e) {
            data.meta = {};
          }
        }

        setPageContent(data);
      } catch (err) {
        console.error("Error loading page content:", err);
        setError("Failed to load page content");
      } finally {
        setLoading(false);
      }
    };

    fetchPageContent();
  }, [pageId, actualPageId]);

  // Handle content changes
  const handleContentChange = useCallback((content: string) => {
    if (!pageContent) return;
    
    setPageContent(prev => prev ? { ...prev, content } : null);
    setHasChanges(true);
  }, [pageContent]);

  // Handle variables changes (for home page)
  const handleVariablesChange = useCallback((variables: Record<string, any>) => {
    if (!pageContent) return;
    
    setPageContent(prev => prev ? { ...prev, variables } : null);
    setHasChanges(true);
  }, [pageContent]);

  // Handle meta changes
  const handleMetaChange = useCallback((meta: Record<string, any>) => {
    if (!pageContent) return;
    
    setPageContent(prev => prev ? { ...prev, meta } : null);
    setHasChanges(true);
  }, [pageContent]);

  // Save page
  const handleSave = async () => {
    if (!pageContent || !hasChanges) return;

    try {
      setSaving(true);
      const pageSource = getPageSource();
      const { error } = await $fetch({
        url: `/api/admin/default-editor/${actualPageId}?pageSource=${pageSource}`,
        method: "PUT",
        body: {
          ...pageContent,
          pageSource: pageSource
        },
      });

      if (error) {
        toast.error(error);
        return;
      }
      
      setHasChanges(false);
      toast.success("Page saved successfully! Cache has been cleared.");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !pageContent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-1/3 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/default-editor">
            <Button variant="secondary" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {pageContent.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              Edit your {isHomePage ? 'home' : 'legal'} page content
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {pageContent.status === 'active' ? 'Active' : 'Draft'}
            </Badge>
          </div>
          <Link href={`/admin/default-editor/${pageId}/preview`}>
            <Button variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </Link>
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="w-full flex gap-4">
          <TabsTrigger value="content" className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="seo" className="w-full">
            <Tag className="h-4 w-4 mr-2" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="settings" className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <Card className="overflow-hidden border-none shadow-lg">
          <CardContent className="p-0">
            <TabsContent value="content" className="m-0 p-6 space-y-6">
              {isHomePage ? (
                <SectionalHomeEditor 
                  variables={
                    pageContent.variables && 
                    typeof pageContent.variables === 'object' && 
                    !Array.isArray(pageContent.variables) 
                      ? pageContent.variables 
                      : {}
                  } 
                  onVariablesChange={handleVariablesChange}
                />
              ) : (
                <div>
                  <Label htmlFor="content" className="text-base font-medium">
                    Page Content
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Use the rich text editor to create and format your page content
                  </p>
                  <div className="mt-1.5 overflow-hidden">
                    <RichTextEditor
                      value={pageContent.content || ""}
                      onChange={handleContentChange}
                      placeholder="Write your page content here..."
                      uploadDir="legal-pages"
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="seo" className="m-0 p-6 space-y-6">
              <MetaEditor 
                meta={pageContent.meta || {}} 
                onMetaChange={handleMetaChange}
              />
            </TabsContent>

            <TabsContent value="settings" className="m-0 p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-base font-medium">
                    Page Title
                  </Label>
                  <Input
                    id="title"
                    value={pageContent.title}
                    onChange={(e) => {
                      setPageContent(prev => prev ? { ...prev, title: e.target.value } : null);
                      setHasChanges(true);
                    }}
                    placeholder="Enter page title"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="status" className="text-base font-medium">
                    Status
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Set the page status to control visibility
                  </p>
                  <select 
                    id="status"
                    value={pageContent.status}
                    onChange={(e) => {
                      setPageContent(prev => prev ? { ...prev, status: e.target.value } : null);
                      setHasChanges(true);
                    }}
                    className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

// Meta Editor Component
function MetaEditor({ meta, onMetaChange }: {
  meta: Record<string, any>;
  onMetaChange: (meta: Record<string, any>) => void;
}) {
  const handleChange = (key: string, value: any) => {
    onMetaChange({ ...meta, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">SEO Settings</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Optimize your page for search engines
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="seoTitle" className="text-base font-medium">
            SEO Title
          </Label>
          <Input
            id="seoTitle"
            value={meta.seoTitle || ""}
            onChange={(e) => handleChange("seoTitle", e.target.value)}
            placeholder="Enter SEO title"
            className="mt-1.5"
          />
        </div>
        
        <div>
          <Label htmlFor="seoDescription" className="text-base font-medium">
            SEO Description
          </Label>
          <Textarea
            id="seoDescription"
            value={meta.seoDescription || ""}
            onChange={(e) => handleChange("seoDescription", e.target.value)}
            placeholder="Enter SEO description"
            className="mt-1.5"
            rows={3}
          />
        </div>
        
        <div>
          <Label htmlFor="keywords" className="text-base font-medium">
            Keywords
          </Label>
          <Input
            id="keywords"
            value={Array.isArray(meta.keywords) ? meta.keywords.join(", ") : ""}
            onChange={(e) => handleChange("keywords", e.target.value.split(",").map((k: string) => k.trim()).filter(Boolean))}
            placeholder="Enter keywords separated by commas"
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
}

// Sectional Home Editor (for home page variables)
function SectionalHomeEditor({ variables, onVariablesChange }: {
  variables: Record<string, any>;
  onVariablesChange: (variables: Record<string, any>) => void;
}) {
  // Helper function to get nested values from variables
  const getValue = (path: string) => {
    const keys = path.split('.');
    let value = variables;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  };

  // Helper function to update nested values in variables
  const updateVariable = (path: string, value: any) => {
    const keys = path.split('.');
    const newVariables = { ...variables };
    let current = newVariables;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current[key] = { ...current[key] };
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    onVariablesChange(newVariables);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Home Page Sections</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Configure your home page sections and content
        </p>
      </div>
      
      <HeroSectionEditor 
        variables={variables}
        getValue={getValue}
        updateVariable={updateVariable}
      />
      
      <FeaturesSectionEditor 
        variables={variables}
        getValue={getValue}
        updateVariable={updateVariable}
      />
      
      <GlobalSectionEditor 
        variables={variables}
        getValue={getValue}
        updateVariable={updateVariable}
      />
      
      <GettingStartedEditor 
        variables={variables}
        getValue={getValue}
        updateVariable={updateVariable}
      />
      
      <CTASectionEditor 
        variables={variables}
        getValue={getValue}
        updateVariable={updateVariable}
      />
    </div>
  );
} 