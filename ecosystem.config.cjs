module.exports = {
  apps: [
    {
      name: 'indigobuilders-api',
      script: './server/dist/index.js',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      time: true,
    },
  ],
};
