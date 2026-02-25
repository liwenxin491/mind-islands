module.exports = {
  apps: [
    {
      name: 'mind-islands',
      script: 'npm',
      args: 'start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 8787,
      },
    },
  ],
};
