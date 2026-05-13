module.exports = {
  apps: [
    {
      name: 'profitengine',
      script: 'index.js',
      cwd: process.env.PROFITENGINE_APP_DIR || '/home/opc/profitengine',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || '3000'
      },
      max_restarts: 10,
      restart_delay: 5000,
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      time: true
    }
  ]
};
