module.exports = {
  apps: [
    {
      name: 'ikhlas-api',
      cwd: '/home/feril/apps/ikhlas-cp',
      script: 'apps/api/src/server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
