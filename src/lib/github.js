/**
 * Computes rarity tier and top languages from public GitHub user + repos data.
 */
export function computeCardStats(user, repos) {
  const totalStars = Array.isArray(repos)
    ? repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0)
    : 0;

  const langCounts = {};
  if (Array.isArray(repos)) {
    for (const repo of repos) {
      if (repo.language) {
        langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
      }
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
    topLanguages: topLanguages.length > 0 ? topLanguages : ['Polyglot'],
    rarity,
    powerScore,
  };
}

/**
 * Fetches a GitHub developer profile and their public repositories.
 */
export async function fetchGitHubProfile(rawUsername) {
  const username = rawUsername.trim().replace(/^@/, '');
  if (!username) {
    throw new Error('Please enter a GitHub username.');
  }

  const headers = { Accept: 'application/vnd.github+json' };
  const [userRes, reposRes] = await Promise.all([
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers }),
    fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`,
      { headers }
    ),
  ]);

  if (userRes.status === 404) {
    throw new Error(`GitHub user "${username}" not found.`);
  }
  if (userRes.status === 403) {
    throw new Error('GitHub API rate limit reached. Try again in a minute.');
  }
  if (!userRes.ok) {
    throw new Error(`GitHub API error (${userRes.status}).`);
  }

  const user = await userRes.json();
  const repos = reposRes.ok ? await reposRes.json() : [];
  return computeCardStats(user, repos);
}
