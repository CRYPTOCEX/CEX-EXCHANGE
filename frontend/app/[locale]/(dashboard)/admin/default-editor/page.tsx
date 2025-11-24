"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home,
  FileText,
  Users,
  Shield,
  Phone,
  Edit3,
  Eye,
  Code,
  Palette
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";

interface DefaultPage {
  id: string;
  name: string;
  description: string;
  path: string;
  status: "active" | "inactive";
  lastModified?: string;
  type: "page" | "layout";
}

interface DefaultPageWithIcon extends DefaultPage {
  icon: React.ComponentType<{ className?: string }>;
}

// Icon mapping for page types
const getIconForPage = (pageId: string, type: string): React.ComponentType<{ className?: string }> => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    home: Home,
    about: Users, 
    privacy: Shield,
    terms: FileText,
    contact: Phone,
    "legal-layout": Code
  };
  
  return iconMap[pageId] || (type === "layout" ? Code : FileText);
};

// Format relative date
const formatRelativeDate = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
};

export default function DefaultEditorPage() {
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [pages, setPages] = useState<DefaultPageWithIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        setLoading(true);
        const { data, error } = await $fetch({
          url: "/api/admin/default-editor",
          method: "GET"
        });

        if (error) {
          setError(error);
          return;
        }

        // Add icons and format dates
        const pagesWithIcons: DefaultPageWithIcon[] = data.map((page: DefaultPage) => ({
          ...page,
          icon: getIconForPage(page.id, page.type),
          lastModified: page.lastModified ? formatRelativeDate(page.lastModified) : undefined
        }));

        setPages(pagesWithIcons);
      } catch (err) {
        setError("Failed to load pages");
        console.error("Error fetching default editor pages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Default Page Editor</h1>
          <p className="text-muted-foreground mt-2">
            Edit default frontend pages and layouts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
            <Palette className="w-3 h-3 mr-1" />
            Default Frontend
          </Badge>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-blue-600 p-2 text-white">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Default Frontend Editor
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                This editor allows you to modify the built-in default pages when your frontend type is set to "Default". 
                Changes will apply to the core landing page, legal pages, and layout components.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading pages...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium">Error loading pages</p>
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pages Grid */}
      {!loading && !error && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.map((page) => (
          <Card 
            key={page.id} 
            className={`group cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedPage === page.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
            }`}
            onClick={() => setSelectedPage(page.id)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${
                    page.type === 'layout' 
                      ? 'bg-purple-100 dark:bg-purple-900/20' 
                      : 'bg-blue-100 dark:bg-blue-900/20'
                  }`}>
                    <page.icon className={`h-5 w-5 ${
                      page.type === 'layout'
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{page.name}</CardTitle>
                    <Badge 
                      variant={page.type === 'layout' ? 'secondary' : 'default'}
                        className="mt-1"
                    >
                      {page.type}
                    </Badge>
                  </div>
                </div>
                <Badge 
                  variant={page.status === 'active' ? 'default' : 'secondary'}
                    className={page.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' : ''}
                >
                  {page.status}
                </Badge>
              </div>
            </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                {page.description}
              </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-mono text-muted-foreground">{page.path}</span>
                  </div>
                {page.lastModified && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Modified {page.lastModified}</span>
                    </div>
                )}
              </div>
              <div className="flex gap-2">
                  <Link href={`/admin/default-editor/${page.id}/edit`}>
                <Button 
                  size="sm" 
                  className="flex-1"
                >
                    <Edit3 className="w-3 h-3 mr-1" />
                    Edit
                    </Button>
                  </Link>
                  <Link href={`/admin/default-editor/${page.id}/preview`}>
                <Button 
                  size="sm" 
                  variant="outline"
                >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                    </Button>
                  </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm">
              <Code className="w-4 h-4 mr-2" />
              Backup Current Pages
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Export Pages
            </Button>
            <Button variant="outline" size="sm">
              <Shield className="w-4 h-4 mr-2" />
              Restore Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 