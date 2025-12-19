import { createError } from "@b/utils/error";
import * as fs from "fs";
import * as path from "path";
import archiver from "archiver";
import { PassThrough } from "stream";

export const metadata: OperationObject = { summary: "Download integration plugin",
  description: "Downloads the integration plugin as a ZIP file",
  operationId: "downloadIntegrationPlugin",
  tags: ["Gateway", "Integrations"],
  parameters: [
    { name: "pluginId",
      in: "path",
      required: true,
      description: "Plugin identifier (e.g., woocommerce)",
      schema: { type: "string" },
    },
  ],
  responses: { 200: { description: "Plugin ZIP file",
      content: { "application/zip": { schema: { type: "string", format: "binary" },
        },
      },
    },
    404: { description: "Plugin not found",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Download Integration",
  responseType: "binary",
};

const PLUGINS: Record<
  string,
  { name: string; folder: string; zipName: string }
> = { woocommerce: { name: "Bicrypto Payment Gateway for WooCommerce",
    folder: "bicrypto-payment-gateway-woocommerce",
    zipName: "bicrypto-payment-gateway-woocommerce.zip",
  },
};

export default async (data: Handler) => { const { params, ctx } = data;
  const { pluginId } = params;

  // Check if plugin exists
  const plugin = PLUGINS[pluginId];
  if (!plugin) { throw createError({ statusCode: 404,
      message: "Plugin not found",
    });
  }

  // Get the plugin directory path
  // process.cwd() is the backend folder, plugins are in src/api/(ext)/gateway/integration/plugins
  const pluginsDir = path.join(
    process.cwd(),
    "src",
    "api",
    "(ext)",
    "gateway",
    "integration",
    "plugins"
  );
  const pluginDir = path.join(pluginsDir, plugin.folder);

  // Check if plugin directory exists
  if (!fs.existsSync(pluginDir)) { throw createError({ statusCode: 404,
      message: "Plugin files not found",
    });
  }

  // Create archive in memory and return as buffer
  ctx?.success("Request completed successfully");
  return new Promise((resolve, reject) => { const chunks: Buffer[] = [];
    const passThrough = new PassThrough();

    passThrough.on("data", (chunk) => { chunks.push(chunk);
    });

    passThrough.on("end", () => { const buffer = Buffer.concat(chunks);
      resolve({ data: buffer,
        headers: { "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${plugin.zipName}"`,
        },
      });
    });

    passThrough.on("error", () => { reject(
        createError({ statusCode: 500,
          message: "Failed to create plugin archive",
        })
      );
    });

    const archive = archiver("zip", { zlib: { level: 9 },
    });

    archive.on("error", () => { reject(
        createError({ statusCode: 500,
          message: "Failed to create plugin archive",
        })
      );
    });

    archive.pipe(passThrough);
    archive.directory(pluginDir, plugin.folder);
    archive.finalize();
  });
};
