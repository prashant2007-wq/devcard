// Serverless endpoint that reads Flagsmith Experiment 532 results
// using the server-side FLAGSMITH_API_KEY (never exposed to the client).

const EXPERIMENT_ID = 532;
const DEFAULT_ENV_KEY = 'TYyFN4ReBv6a7cUXWVFUup';

export default async function handler(req, res) {
  const apiKey = process.env.FLAGSMITH_API_KEY;
  const envKey = process.env.VITE_FLAGSMITH_ENV_KEY || DEFAULT_ENV_KEY;

  if (!apiKey) {
    res.status(200).json({
      configured: false,
      experimentId: EXPERIMENT_ID,
      status: 'unconfigured',
      message: 'Set FLAGSMITH_API_KEY in .env (local) or Vercel Environment Variables to load live Flagsmith results.',
      variants: [],
    });
    return;
  }

  const headers = {
    Authorization: `Api-Key ${apiKey}`,
    Accept: 'application/json',
  };

  try {
    const base = `https://api.flagsmith.com/api/v1/environments/${encodeURIComponent(envKey)}/experiments/${EXPERIMENT_ID}`;
    const [expRes, resultsRes] = await Promise.all([
      fetch(`${base}/`, { headers }),
      fetch(`${base}/results/`, { headers }),
    ]);

    if (!expRes.ok) {
      const text = await expRes.text();
      res.status(expRes.status).json({
        configured: true,
        error: `Flagsmith experiment fetch failed (${expRes.status}): ${text}`,
      });
      return;
    }

    const experiment = await expRes.json();
    const results = resultsRes.ok ? await resultsRes.json() : null;

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      configured: true,
      experimentId: EXPERIMENT_ID,
      name: experiment.name,
      hypothesis: experiment.hypothesis,
      status: experiment.status,
      startedAt: experiment.started_at,
      results,
    });
  } catch (err) {
    res.status(500).json({
      configured: true,
      error: `Server error fetching Flagsmith results: ${err.message}`,
    });
  }
}
