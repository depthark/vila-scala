import type { APIRoute } from 'astro';

import { absolute, withBase } from '../i18n';

/**
 * Generated rather than static, so the sitemap URL always matches the
 * deployment target — origin and base path included.
 */
export const GET: APIRoute = () => {
  const sitemap = absolute(withBase('/sitemap-index.xml'));

  // Training-only agents opt out without blocking Google/Bing or AI search.
  // This policy works before Cloudflare becomes the authoritative DNS provider.
  const trainingAgents = ['GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended', 'Applebot-Extended'];
  return new Response([
    'User-agent: *', 'Allow: /', '',
    ...trainingAgents.map((agent) => `User-agent: ${agent}`),
    'Disallow: /', '',
    `Sitemap: ${sitemap}`, '',
  ].join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
