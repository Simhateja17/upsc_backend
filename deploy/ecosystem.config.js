const dotenv = require("dotenv");
const path = require("path");

const APP_DIR = "/home/mg8751721/backend";
const envFromFile = dotenv.config({ path: path.join(APP_DIR, ".env.production") }).parsed || {};

module.exports = {
  apps: [
    {
      name: "upsc-backend",
      script: "dist/index.js",
      cwd: APP_DIR,
      instances: 1,
      exec_mode: "fork",
      env_production: {
        ...envFromFile,
        NODE_ENV: "production",
        NODE_OPTIONS: "--dns-result-order=ipv4first",
        PORT: 5001,
      },
      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_memory_restart: "750M",
      // Logging
      out_file: "/home/mg8751721/backend/logs/backend-out.log",
      error_file: "/home/mg8751721/backend/logs/backend-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
