import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import url, { pathToFileURL } from 'node:url';

function localApiPlugin() {
  return {
    name: 'local-vercel-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined) {
          process.env[k] = v;
        }
      }

      server.middlewares.use(async (req, res, next) => {
        const parsed = url.parse(req.url || '', true);
        if (parsed.pathname !== '/api/lab' && parsed.pathname !== '/api/card') {
          return next();
        }

        const reqShim = Object.assign(req, { query: parsed.query || {} });
        const resShim = Object.assign(res, {
          status(code) {
            res.statusCode = code;
            return resShim;
          },
          json(payload) {
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
            }
            res.end(JSON.stringify(payload));
          },
          send(body) {
            res.end(body);
          },
        });

        try {
          const fileName = parsed.pathname === '/api/lab' ? 'lab.js' : 'card.js';
          const fileUrl = pathToFileURL(path.resolve(process.cwd(), 'api', fileName)).href;
          const { default: handler } = await import(`${fileUrl}?t=${Date.now()}`);
          await handler(reqShim, resShim);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Local API handler error', message: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
});
