require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'spotify-megamixer',
      script: 'npm',
      args: 'start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
