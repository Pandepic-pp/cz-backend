import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  // Reuse existing connection on Vercel warm invocations
  if (mongoose.connection.readyState === 1) return;

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI!);
    console.log(`[mongodb] connected to ${conn.connection.host}`);
  } catch (err) {
    console.error('[mongodb] connection failed:', (err as Error).message);
    // Throw instead of process.exit so serverless runtimes handle it gracefully
    throw err;
  }
};

export default connectDB;
