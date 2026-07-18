import 'dotenv/config';
import app from './src/app.js';
import connectDB from './src/config/db.js';

const PORT = process.env.PORT ?? 5000;

// Connect eagerly — on Vercel this runs on cold start and is reused across warm invocations
connectDB();

// Only bind a port when running locally; Vercel handles the HTTP server in production
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[server] running on port ${PORT} in ${process.env.NODE_ENV ?? 'development'} mode`);
  });
}

// Required: Vercel expects the Express app as the default export
export default app;
