import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import url, { pathToFileURL } from 'node:url';

function localApiPlugin() {
  return {
    name: 'local-vercel-api',
    configureServer(server) {
      // loadEnv with prefix '' loads ALL .env variables (not just VITE_ ones),
      // so FLAGSMITH_API_KEY and GITHUB_TOKEN are available in the serverless shims.
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const [k, v] of Object.entries(env)) {
        process.env[k] = v; // always overwrite — .env is the source of truth locally
      }

      server.middlewares.use(async (req, res, next) => {
        const parsed = url.parse(req.url || '', true);
        const routeMap = {
          '/api/lab': 'lab.js',
          '/api/card': 'card.js',
          '/api/github': 'github.js',
        };
        const fileName = routeMap[parsed.pathname];
        if (!fileName) {
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
