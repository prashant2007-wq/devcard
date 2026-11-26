// Serverless endpoint returning an embeddable SVG DevCard for GitHub READMEs.
// Never records Flagsmith experiment events.

const ACCENTS = {
  cyan: { primary: '#00f0ff', secondary: '#0077ff' },
  violet: { primary: '#b55cff', secondary: '#ff2e93' },
  emerald: { primary: '#00ffaa', secondary: '#00b894' },
};

const RARITY_COLORS = {
  Mythic: '#ff2e93',
  Legendary: '#ffb800',
  Epic: '#b55cff',
  Rare: '#00f0ff',
  Common: '#7f8ea3',
};

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(str, maxLen) {
  const s = String(str ?? '');
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}

function computeStats(user, repos) {
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
  const score = totalStars * 3 + followers * 2 + publicRepos;

  let rarity = 'Common';
  if (score >= 5000) rarity = 'Mythic';
  else if (score >= 1500) rarity = 'Legendary';
  else if (score >= 400) rarity = 'Epic';
  else if (score >= 100) rarity = 'Rare';

  return {
    username: user.login,
    name: user.name || user.login,
    bio: user.bio || 'Building in public.',
    followers,
    publicRepos,
    totalStars,
    topLanguages: topLanguages.length ? topLanguages : ['Polyglot'],
    rarity,
  };
}

export default async function handler(req, res) {
  const rawUser = String(req.query.username || '').trim().replace(/^@/, '');
  const accentKey = String(req.query.accent || 'cyan').toLowerCase();
  const vibe = String(req.query.vibe || 'cyberpunk').toUpperCase();
  const accent = ACCENTS[accentKey] || ACCENTS.cyan;

  if (!rawUser) {
    res.status(400).setHeader('Content-Type', 'text/plain').send('Missing ?username= parameter');
    return;
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'DevCard-SVG-Generator',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(rawUser)}`, { headers }),
      fetch(
        `https://api.github.com/users/${encodeURIComponent(rawUser)}/repos?per_page=100&sort=updated`,
        { headers }
      ),
    ]);

    if (!userRes.ok) {
      const msg = userRes.status === 404 ? `User @${rawUser} not found` : `GitHub error ${userRes.status}`;
      res
        .status(userRes.status === 404 ? 404 : 502)
        .setHeader('Content-Type', 'image/svg+xml')
        .send(
          `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="140" viewBox="0 0 600 140"><rect width="600" height="140" rx="14" fill="#070b14" stroke="#ff2e93" stroke-width="1.5"/><text x="30" y="75" fill="#e2e8f0" font-family="monospace" font-size="16">DEVCARD // ${escapeXml(msg)}</text></svg>`
        );
      return;
    }

    const user = await userRes.json();
    const repos = reposRes.ok ? await reposRes.json() : [];
    const stats = computeStats(user, repos);
    const rarityColor = RARITY_COLORS[stats.rarity] || '#00f0ff';

    const langPills = stats.topLanguages
      .map((lang, idx) => {
        const x = 32 + idx * 124;
        return `
          <rect x="${x}" y="206" width="114" height="28" rx="6" fill="rgba(255,255,255,0.05)" stroke="${accent.primary}" stroke-opacity="0.45"/>
          <text x="${x + 57}" y="224" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="12">${escapeXml(truncate(lang, 12))}</text>
        `;
      })
      .join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="270" viewBox="0 0 640 270">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#060913"/>
      <stop offset="55%" stop-color="#0d1526"/>
      <stop offset="100%" stop-color="#090d1a"/>
    </linearGradient>
    <linearGradient id="holo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent.primary}" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="${accent.secondary}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${rarityColor}" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="636" height="266" rx="18" fill="url(#bg)" stroke="url(#holo)" stroke-width="2"/>
  <path d="M18 32 L18 18 L32 18 M608 18 L622 18 L622 32 M18 238 L18 252 L32 252 M608 252 L622 252 L622 238" fill="none" stroke="${accent.primary}" stroke-width="2" stroke-opacity="0.8"/>

  <text x="32" y="38" fill="${accent.primary}" font-family="monospace" font-size="11" letter-spacing="2">DEVCARD // ${escapeXml(vibe)}</text>
  <rect x="492" y="22" width="116" height="24" rx="12" fill="${rarityColor}" fill-opacity="0.16" stroke="${rarityColor}" stroke-width="1"/>
  <text x="550" y="38" text-anchor="middle" fill="${rarityColor}" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="1">${escapeXml(stats.rarity.toUpperCase())}</text>

  <text x="32" y="82" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="800">${escapeXml(truncate(stats.name, 24))}</text>
  <text x="32" y="106" fill="${accent.primary}" font-family="monospace" font-size="14">@${escapeXml(stats.username)}</text>
  <text x="32" y="132" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="13">${escapeXml(truncate(stats.bio, 64))}</text>

  <line x1="32" y1="150" x2="608" y2="150" stroke="rgba(255,255,255,0.1)"/>

  <text x="32" y="176" fill="#f8fafc" font-family="monospace" font-size="20" font-weight="bold">${stats.totalStars.toLocaleString()}</text>
  <text x="32" y="192" fill="#64748b" font-family="monospace" font-size="10" letter-spacing="1.5">STARS</text>

  <text x="192" y="176" fill="#f8fafc" font-family="monospace" font-size="20" font-weight="bold">${stats.publicRepos.toLocaleString()}</text>
  <text x="192" y="192" fill="#64748b" font-family="monospace" font-size="10" letter-spacing="1.5">REPOS</text>

  <text x="352" y="176" fill="#f8fafc" font-family="monospace" font-size="20" font-weight="bold">${stats.followers.toLocaleString()}</text>
  <text x="352" y="192" fill="#64748b" font-family="monospace" font-size="10" letter-spacing="1.5">FOLLOWERS</text>

  ${langPills}
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(svg);
  } catch (err) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send(`Card generation error: ${err.message}`);
  }
}
