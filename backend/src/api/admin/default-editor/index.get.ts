
export const metadata = {
  summary: "List default editor pages",
  operationId: "listDefaultEditorPages",
  tags: ["Admin", "Default Editor"],
  responses: {
    200: {
      description: "List of default editor pages",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                path: { type: "string" },
                status: { type: "string", enum: ["active", "inactive"] },
                lastModified: { type: "string" },
                type: { type: "string", enum: ["page", "layout"] }
              }
            }
          }
        }
      }
    }
  },
  requiresAuth: true,
  permission: "view.page"
};

export default async (data: Handler) => {
  // Return the default pages that can be edited
  const defaultPages = [
    {
      id: "home",
      name: "Default Home Page",
      description: "Main landing page with hero section, features, and market overview (Default Layout)",
      path: "/home.tsx",
      status: "active",
      lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      type: "page",
      pageSource: "default"
    },
    {
      id: "about",
      name: "About Page", 
      description: "Company information and team details",
      path: "/about/page.tsx",
      status: "active",
      lastModified: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      type: "page",
      pageSource: "default"
    },
    {
      id: "privacy",
      name: "Privacy Policy",
      description: "Privacy policy and data protection information", 
      path: "/privacy/page.tsx",
      status: "active",
      lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      type: "page",
      pageSource: "default"
    },
    {
      id: "terms",
      name: "Terms of Service",
      description: "Terms and conditions for platform usage",
      path: "/terms/page.tsx", 
      status: "active",
      lastModified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      type: "page",
      pageSource: "default"
    },
    {
      id: "contact",
      name: "Contact Page",
      description: "Contact form and support information",
      path: "/contact/page.tsx",
      status: "active", 
      lastModified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      type: "page",
      pageSource: "default"
    },
  ];

  return defaultPages;
}; 