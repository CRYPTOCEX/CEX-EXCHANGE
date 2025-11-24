import { models } from "@b/db";

export const metadata = {
  summary: "Update default page content",
  operationId: "updateDefaultPageContent",
  tags: ["Admin", "Default Editor"],
  parameters: [
    {
      index: 0,
      name: "pageId",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Page identifier (home, about, privacy, terms, contact)",
    },
    {
      name: "pageSource",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["default", "builder"] },
      description: "Page source type - default for regular pages, builder for builder-created pages",
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            variables: { type: "object" },
            content: { type: "string" },
            meta: { type: "object" },
            status: { type: "string", enum: ["active", "draft"] },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Page content updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              lastModified: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid request",
    },
    404: {
      description: "Page not found",
    },
  },
  requiresAuth: true,
  permission: "edit.page"
};

export default async (data) => {
  const { params, query, body } = data;
  const { pageId } = params;
  // Get pageSource from body first, then query, then default
  const pageSource = body.pageSource || query.pageSource || 'default';
  const { title, content, meta, status } = body;
  let { variables } = body;

  const validPageIds = ['home', 'about', 'privacy', 'terms', 'contact'];
  const validPageSources = ['default', 'builder'];
  
  if (!validPageIds.includes(pageId)) {
    return {
      error: "Invalid page ID",
      status: 400
    };
  }

  if (!validPageSources.includes(pageSource)) {
    return {
      error: "Invalid page source",
      status: 400
    };
  }

  try {
    // Parse variables if it comes as a JSON string
    if (variables && typeof variables === 'string') {
      try {
        variables = JSON.parse(variables);
      } catch (e) {
        console.error("Failed to parse variables string:", e.message);
        variables = {};
      }
    }

    // Handle character-indexed object corruption (when JSON string gets spread)
    if (variables && typeof variables === 'object' && !Array.isArray(variables)) {
      const keys = Object.keys(variables);
      const isCharacterIndexed = keys.length > 0 && keys.every(key => !isNaN(parseInt(key)));
      
      if (isCharacterIndexed) {
        try {
          // Reconstruct the JSON string from character indices
          const jsonString = keys.sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => variables[key])
            .join('');
          variables = JSON.parse(jsonString);
        } catch (e) {
          console.error("Failed to reconstruct variables from character indices:", e.message);
          variables = {};
        }
      }
    }

    // Validate variables is a proper object
    if (variables && (typeof variables !== 'object' || Array.isArray(variables))) {
      variables = {};
    }

    // Check if models are available
    if (!models || !models.defaultPage) {
      return {
        error: "Database connection error",
        status: 500
      };
    }

    // Find existing page
    const existingPage = await models.defaultPage.findOne({
      where: { pageId, pageSource }
    });

    if (!existingPage) {
      // Create new page if it doesn't exist
      const isHomePage = pageId === 'home';
      
      const newPage = await models.defaultPage.create({
        pageId,
        pageSource,
        type: isHomePage ? 'variables' : 'content',
        title: title || pageId.charAt(0).toUpperCase() + pageId.slice(1) + ' Page',
        variables: isHomePage ? (variables || {}) : {},
        content: isHomePage ? "" : (content || ""),
        meta: meta || {},
        status: status || 'active'
      });

      // No caching - data is always fresh
      return {
        success: true,
        lastModified: newPage.updatedAt.toISOString(),
        message: "Page created successfully"
      };
    }

    // Validate data based on page type
    const isHomePage = pageId === 'home';
    
    if (isHomePage && existingPage.type === 'variables') {
      // For home page, only allow variables update
      if (!variables) {
        return {
          error: "Variables are required for home page",
          status: 400
        };
      }
    } else if (!isHomePage && existingPage.type === 'content') {
      // For legal pages, only allow content update
      if (!content) {
        return {
          error: "Content is required for legal pages",
          status: 400
        };
      }
    }

    // Update the page
    const updateData: any = {};
    
    if (title) updateData.title = title;
    if (meta) updateData.meta = meta;
    if (status) updateData.status = status;
    
    if (isHomePage && variables) {
      updateData.variables = variables;
    } else if (!isHomePage && content) {
      updateData.content = content;
    }
    
    // Always update the timestamp to ensure proper ordering
    updateData.updatedAt = new Date();

    await existingPage.update(updateData);

    // No caching - data is always fresh
    return {
      success: true,
      lastModified: existingPage.updatedAt.toISOString(),
      message: "Page updated successfully"
    };

  } catch (error) {
    console.error("Error updating page content:", error.message);
    return {
      error: "Failed to update page content",
      status: 500
    };
  }
}; 