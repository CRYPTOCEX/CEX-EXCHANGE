module.exports = {
  apps: [
    {
      name: "backend",
      script: "./backend/dist/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      exec_mode: "fork",
      instances: 1,
    },
    {
      name: "frontend",
      script: "./frontend/node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./frontend",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NEXT_PUBLIC_SITE_URL: "https://mash3div.com",
        NEXT_PUBLIC_BACKEND_PORT: "4000",
        NEXT_PUBLIC_FRONTEND_PORT: "3000",
        NEXT_PUBLIC_SITE_NAME: "Bicrypto",
        NEXT_PUBLIC_SITE_DESCRIPTION: "Bicrypto Exchange Platform",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        NEXT_PUBLIC_SITE_URL: "https://mash3div.com",
        NEXT_PUBLIC_BACKEND_PORT: "4000", 
        NEXT_PUBLIC_FRONTEND_PORT: "3000",
        NEXT_PUBLIC_SITE_NAME: "Bicrypto",
        NEXT_PUBLIC_SITE_DESCRIPTION: "Bicrypto Exchange Platform",
      },
      exec_mode: "fork",
      instances: 1,
    },
  ],
};
