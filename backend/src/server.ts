import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { setupQuizSockets } from './sockets/quiz.engine.js';

async function main(): Promise<void> {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN.split(','),
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });

  setupQuizSockets(io);

  server.listen(env.PORT, () => {
    console.log(`[server] BrainArena API listening on http://localhost:${env.PORT}`);
    console.log(`[server] Socket.IO ready on ws://localhost:${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[server] ${signal} received, shutting down...`);
    io.close();
    server.close();
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] fatal startup error:', err);
  process.exit(1);
});