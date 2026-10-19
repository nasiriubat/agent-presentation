import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createRouter } from './routes.js';

const app = express();
app.use(cors({ origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/] }));
app.use(express.json({ limit: '1mb' }));
app.use(createRouter({ env: process.env }));

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => console.log(`agent server on http://localhost:${port}`));
