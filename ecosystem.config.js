module.exports = {
  apps: [
    {
      name: 'kwise-backend',
      cwd: 'c:\\Users\\PCWISE\\Documents\\KWise Final\\KWise-Final\\KWise-Backend',
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: 'logs/backend-error.log',
      out_file: 'logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'kwise-frontend',
      cwd: 'c:\\Users\\PCWISE\\Documents\\KWise Final\\KWise-Final\\K-Wise',
      script: 'C:\\Users\\PCWISE\\AppData\\Roaming\\npm\\node_modules\\serve\\build\\main.js',
      args: ['-s', 'build', '-l', '3000'],
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '../KWise-Backend/logs/frontend-error.log',
      out_file: '../KWise-Backend/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
