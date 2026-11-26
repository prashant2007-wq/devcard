// Shared server-side GitHub fetcher with in-memory cache + ETag conditional requests.
// Prefix "_" ensures Vercel does not expose this file as a public /api route.

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_ENTRIES = 200;
const cache = new Map();

export function computeCardStats(user, repos) {
  const totalStars = Array.isArray(repos)
    ? repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0)
    : 0;

  const langCounts = {};
  if (Array.isArray(repos)) {
    for (const r of repos) {
      if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
    }
  }

  const topLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang]) => lang);

  const followers = user.followers || 0;
  const publicRepos = user.public_repos || 0;
  const powerScore = totalStars * 3 + followers * 2 + publicRepos;

  let rarity = 'Common';
  if (powerScore >= 5000) rarity = 'Mythic';
  else if (powerScore >= 1500) rarity = 'Legendary';
  else if (powerScore >= 400) rarity = 'Epic';
  else if (powerScore >= 100) rarity = 'Rare';

  return {
    username: user.login,
    name: user.name || user.login,
    avatarUrl: user.avatar_url,
    bio: user.bio || 'Building in public.',
    followers,
    publicRepos,
    totalStars,
    topLanguages: topLanguages.length ? topLanguages : ['Polyglot'],
    rarity,
    powerScore,
  };
}

export async function fetchGitHubCached(rawUsername) {
  const username = String(rawUsername || '').trim().replace(/^@/, '');
  if (!username) {
    return { ok: false, status: 400, errorCode: 'MISSING_USERNAME', message: 'Missing username.' };
  }

  const key = username.toLowerCase();
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return { ok: true, status: 200, profile: cached.profile, cached: true };
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'DevCard-Serverless',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const userHeaders = { ...headers };
  if (cached?.etag) {
    userHeaders['If-None-Match'] = cached.etag;
  }

  try {
    const userRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}`,
      { headers: userHeaders }
    );

    // ETag hit: refresh TTL without re-fetching repos or burning rate limit.
    if (userRes.status === 304 && cached) {
      cached.ts = now;
      return { ok: true, status: 200, profile: cached.profile, cached: true };
    }

    if (userRes.status === 404) {
      return {
        ok: false,
        status: 404,
        errorCode: 'NOT_FOUND',
        message: `GitHub user "${username}" not found.`,
      };
    }

    if (userRes.status === 403 || userRes.status === 429) {
      if (cached) {
        return { ok: true, status: 200, profile: cached.profile, cached: true, stale: true };
      }
      return {
        ok: false,
        status: 429,
        errorCode: 'RATE_LIMITED',
        message: 'GitHub API is temporarily rate-limited. Please retry in a moment or preview the sample card.',
      };
    }

    if (!userRes.ok) {
      return {
        ok: false,
        status: 502,
        errorCode: 'UPSTREAM_ERROR',
        message: `GitHub API returned ${userRes.status}.`,
      };
    }

    const user = await userRes.json();
    const reposRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`,
      { headers }
    );
    const repos = reposRes.ok ? await reposRes.json() : [];
    const profile = computeCardStats(user, repos);

    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    cache.set(key, {
      ts: now,
      etag: userRes.headers.get('etag') || null,
      profile,
    });

    return { ok: true, status: 200, profile, cached: false };
  } catch {
    if (cached) {
      return { ok: true, status: 200, profile: cached.profile, cached: true, stale: true };
    }
    return {
      ok: false,
      status: 502,
      errorCode: 'NETWORK_ERROR',
      message: 'Could not reach GitHub right now. Please retry or preview the sample card.',
    };
  }
}
