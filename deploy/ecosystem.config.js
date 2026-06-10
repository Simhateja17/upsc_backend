module.exports = {
  apps: [
    {
      name: "upsc-backend",
      script: "dist/index.js",
      cwd: "/home/mg8751721/backend",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        NODE_OPTIONS: "--dns-result-order=ipv4first",
        PORT: 5001,
      },
      env_file: "/home/mg8751721/backend/.env.production",
      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      // Logging
      out_file: "/home/mg8751721/backend/logs/backend-out.log",
      error_file: "/home/mg8751721/backend/logs/backend-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
