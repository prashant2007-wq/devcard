/**
 * Built-in demo profile used as a fallback if GitHub is unreachable.
 * Never counted as an experiment conversion.
 */
export const SAMPLE_FALLBACK_PROFILE = {
  username: 'octocat',
  name: 'The Octocat',
  avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
  bio: 'I love open source and caffeine.',
  followers: 14200,
  publicRepos: 8,
  totalStars: 3100,
  topLanguages: ['TypeScript', 'Go', 'Rust'],
  rarity: 'Epic',
  isSampleFallback: true,
};

/**
 * Fetches a GitHub developer profile via our serverless `/api/github` endpoint
 * (never calling api.github.com directly from the browser).
 */
export async function fetchGitHubProfile(rawUsername) {
  const username = rawUsername.trim().replace(/^@/, '');
  if (!username) {
    const err = new Error('Please enter a GitHub username.');
    err.code = 'MISSING_USERNAME';
    throw err;
  }

  const res = await fetch(`/api/github?username=${encodeURIComponent(username)}`);
  const contentType = res.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const err = new Error('GitHub proxy endpoint returned an unexpected response.');
    err.code = 'UPSTREAM_ERROR';
    throw err;
  }

  const json = await res.json();
  if (!res.ok || !json.ok) {
    const err = new Error(json.message || `GitHub lookup failed (${res.status}).`);
    err.code = json.errorCode || 'UPSTREAM_ERROR';
    throw err;
  }

  return json.profile;
}
