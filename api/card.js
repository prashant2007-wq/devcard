// Serverless endpoint returning an embeddable SVG DevCard for GitHub READMEs.
// Uses the shared cached GitHub helper. Never records Flagsmith experiment events.
import { fetchGitHubCached } from './_github.js';

const ACCENTS = {
  cyan: { primary: '#38bdf8', secondary: '#818cf8' },
  violet: { primary: '#a78bfa', secondary: '#f472b6' },
  emerald: { primary: '#34d399', secondary: '#38bdf8' },
};

const RARITY_COLORS = {
  Mythic: '#f472b6',
  Legendary: '#fbbf24',
  Epic: '#a78bfa',
  Rare: '#38bdf8',
  Common: '#94a3b8',
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

export default async function handler(req, res) {
  const rawUser = String(req.query.username || '').trim().replace(/^@/, '');
  const accentKey = String(req.query.accent || 'cyan').toLowerCase();
  const vibe = String(req.query.vibe || 'cyberpunk').toUpperCase();
  const accent = ACCENTS[accentKey] || ACCENTS.cyan;

  if (!rawUser) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(400).send('Missing ?username= parameter');
    return;
  }

  const result = await fetchGitHubCached(rawUser);

  if (!result.ok) {
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res
      .status(result.status)
      .send(
        `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="140" viewBox="0 0 600 140"><rect width="600" height="140" rx="14" fill="#07090f" stroke="#f472b6" stroke-width="1.5"/><text x="30" y="75" fill="#f1f5f9" font-family="monospace" font-size="15">DEVCARD // ${escapeXml(result.message)}</text></svg>`
      );
    return;
  }

  const stats = result.profile;
  const rarityColor = RARITY_COLORS[stats.rarity] || '#38bdf8';

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
      <stop offset="0%" stop-color="#07090f"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="holo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent.primary}" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="${accent.secondary}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${rarityColor}" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="636" height="266" rx="18" fill="url(#bg)" stroke="url(#holo)" stroke-width="2"/>
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
}
