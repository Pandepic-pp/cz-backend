import 'dotenv/config';
import app from '../src/app.js';
import connectDB from '../src/config/db.js';

// Connect on cold start; Mongoose queues operations until ready
connectDB();

export default app;
