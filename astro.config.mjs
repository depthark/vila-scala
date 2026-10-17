// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { LOCALES, DEFAULT_LOCALE } from './src/i18n/locales.mjs';
import { segments } from './src/i18n/routes.mjs';

/*
 * Cloudflare Pages serves the site at the domain root. SITE and BASE may
 * be overridden for local verification; production uses www.vila-scala.cz.
 */
const SITE = process.env.SITE || 'https://www.vila-scala.cz';
const BASE = process.env.BASE && process.env.BASE !== '' ? process.env.BASE : '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  /*
   * Opt-in rather than prefetchAll: prefetching every link on the page cost
   * two long tasks inside the TBT window for links nobody follows. The nav
   * and the primary calls to action carry `data-astro-prefetch` instead.
   */
  prefetch: { defaultStrategy: 'hover' },
  i18n: {
    locales: LOCALES,
    defaultLocale: DEFAULT_LOCALE,
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false },
  },
  image: {
    /*
     * Every source image is local; sharp generates the variants at build time.
     * Astro's global responsive styles are deliberately off — each <Image>
     * here already carries explicit `widths`/`sizes` plus its own layout
     * classes, and the injected rules would override them.
     */
    responsiveStyles: false,
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: DEFAULT_LOCALE, locales: { cs: 'cs-CZ', en: 'en' } },
      filter: (page) => !page.includes('/404'),
      // The integration cannot infer translated slugs such as /byty/ and
      // /en/apartments/. Publish the same pairs as the HTML hreflang links.
      serialize(item) {
        const base = BASE.replace(/\/$/, '');
        const pathname = new URL(item.url).pathname.slice(base.length);
        const parts = pathname.split('/').filter(Boolean);
        const locale = parts[0] === 'en' ? 'en' : 'cs';
        if (locale === 'en') parts.shift();
        const route = Object.entries(segments).find(([key, value]) =>
          key !== 'unit' && value[locale] === (parts[0] || ''),
        );
        if (!route) return item;
        item.links = LOCALES.map((lang) => {
          const segment = lang === 'en' ? route[1].en : route[1].cs;
          const translated = [lang === DEFAULT_LOCALE ? '' : lang, segment, ...parts.slice(1)]
            .filter(Boolean).join('/');
          return {
            lang: lang === 'cs' ? 'cs-CZ' : 'en',
            url: new URL(`${base}/${translated}${translated ? '/' : ''}`, SITE).href,
          };
        });
        item.links.push({ lang: 'x-default', url: item.links[0].url });
        return item;
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
