// Serverless endpoint: GET /api/github?username=...
// Uses server-side GITHUB_TOKEN + in-memory/ETag cache. Never logs tokens.
import { fetchGitHubCached } from './_github.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const result = await fetchGitHubCached(req.query.username);

  if (result.ok) {
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ ok: true, profile: result.profile });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(result.status).json({
    ok: false,
    errorCode: result.errorCode,
    message: result.message,
  });
}
