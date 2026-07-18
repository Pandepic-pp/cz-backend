import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI!);
    console.log(`[mongodb] connected to ${conn.connection.host}`);
  } catch (err) {
    console.error('[mongodb] connection failed:', (err as Error).message);
    process.exit(1);
  }
};

export default connectDB;
