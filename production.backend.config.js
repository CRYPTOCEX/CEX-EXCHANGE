module.exports = {
  apps: [
    {
      name: "backend",
      script: "./backend/dist/index.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      env_production: {
        NODE_ENV: "production",
      },
      exec_mode: "fork",
      instances: 1,
      max_memory_restart: "4G",
      watch: false,
      autorestart: true,
    },
  ],
};
