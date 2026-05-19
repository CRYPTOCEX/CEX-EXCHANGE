require("dotenv").config({ path: __dirname + "/.env" });

module.exports = {
  apps: [
    {
      name: "backend",
      script: "./backend/dist/index.js",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: process.env.NEXT_PUBLIC_BACKEND_PORT || "4000",
      },
    },
    {
      name: "frontend",
      script: "./node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./frontend",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: process.env.NEXT_PUBLIC_FRONTEND_PORT || "3000",
      },
    },
  ],
};
