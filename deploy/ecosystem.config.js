module.exports = {
  apps: [
    {
      name: "upsc-backend",
      script: "dist/index.js",
      cwd: "/var/www/backend",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        NODE_OPTIONS: "--dns-result-order=ipv4first",
        PORT: 5001,
      },
      env_file: "/var/www/backend/.env.production",
      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      // Logging
      out_file: "/var/log/pm2/backend-out.log",
      error_file: "/var/log/pm2/backend-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
