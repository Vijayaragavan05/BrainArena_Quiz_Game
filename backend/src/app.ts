import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.get('/', (_req, res) => {
    res.json({ name: 'BrainArena API', version: '0.1.0' });
  });

  app.use(routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}