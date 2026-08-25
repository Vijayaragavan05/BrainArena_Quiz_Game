import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log(`[db] Connected to MongoDB at ${env.MONGO_URI.replace(/:\/\/[^:@]+:([^@]+)@/, '://***:***@')}`);
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[db] Failed to connect to MongoDB: ${msg}`);
    console.error('[db] Check backend/.env MONGO_URI and that your IP is whitelisted in Atlas (Network Access -> 0.0.0.0/0).');
    throw new Error(`MongoDB connection failed: ${msg}`);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}