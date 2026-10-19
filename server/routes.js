import express from 'express';

export function createRouter(deps) {
  const router = express.Router();

  router.get('/api/health', (req, res) => {
    res.json({ ok: true, live: true });
  });

  return router;
}
