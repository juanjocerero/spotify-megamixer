// Carga las variables del fichero .env en el entorno de ESTE MISMO SCRIPT
require('dotenv').config({ path: '/home/juanjocerero/apps/megamixer/.env' });
=======
require('dotenv').config();
>>>>>>> d73ad7d465c0a3dca2ccc88b0ecb859693235d88

module.exports = {
  apps: [
    {
      name: 'megamixer',
      script: 'npm',
      args: 'start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
	      PORT: 3001,
        DATABASE_URL: process.env.DATABASE_URL,
        AUTH_URL: process.env.AUTH_URL,
        AUTH_SECRET: process.env.AUTH_SECRET,
        AUTH_SPOTIFY_ID: process.env.AUTH_SPOTIFY_ID,
        AUTH_SPOTIFY_SECRET: process.env.AUTH_SPOTIFY_SECRET,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAIL_FROM: process.env.EMAIL_FROM
      },
    },
  ],
};
