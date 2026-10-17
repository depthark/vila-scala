# Vila SCALA

Marketing site for **Vila SCALA** — a five-apartment villa house built into the
rock at Veslařská 1039/144, Brno-Jundrov. A rebuild of the original Webnode
site as a static, bilingual, accessible Astro project.

**Live:** https://www.vila-scala.cz

---

## Stack

| | |
|---|---|
| Framework | [Astro 7](https://astro.build) — static output, zero framework runtime |
| Styling | Tailwind CSS 4 (`@theme` tokens, no config file) |
| Runtime / package manager | [Bun](https://bun.sh) for installs and scripts; Node 24 LTS (`.nvmrc`) runs the Astro CLI |
| Images | `astro:assets` + sharp — AVIF/WebP, responsive `srcset`, build-time |
| Fonts | Self-hosted Manrope (display, from Google Fonts) + Inter Variable (UI) |
| Hosting | Cloudflare Pages via Git integration |

The client-side budget is one small module: theme persistence, the mobile
menu, a scroll reveal, the hero video controller, the lightbox and form
validation. No framework, no polyfills, no analytics.

## Getting started

```bash
nvm use            # Node 24 LTS, from .nvmrc
bun install
bun run dev        # http://localhost:4321
```

| Script | Does |
|---|---|
| `bun run dev` | Dev server with HMR |
| `bun run build` | Type-check, then production build into `dist/` |
| `bun run build:ci` | Build only (the type-check runs as its own CI step) |
| `bun run check` | `astro check` — types across `.astro`, `.ts` |
| `bun run preview` | Serve the built `dist/` locally |

## Project layout

```
src/
  assets/          Source images — optimised at build by astro:assets
    brand/         Logo
    floorplans/    Per-unit plans
    images/        Photography and visualisations
  components/      Presentational pieces (Header, Hero, Gallery, UnitIndex, …)
  data/
    site.ts        Address, phone, e-mail, geo, virtual-tour URL
    units.ts       The five apartments: areas, prices, status, media, PDFs
  i18n/
    cs.ts en.ts    Every UI string, both locales
    units.cs.ts    Per-unit prose (kept out of the main dictionary)
    units.en.ts
    index.ts       t(), tu(), path(), alternates(), withBase()
    locales.mjs    Shared with astro.config.mjs
  layouts/         BaseLayout — head, SEO, theme bootstrap, chrome
  pages/           Thin route files; both locales import the same view
  scripts/app.ts   The entire client-side budget
  styles/global.css  Design tokens, base styles, components, utilities
  views/           One component per page, rendered by both locales
public/
  docs/            Unit PDFs, energy certificate, specification
  video/           Hero loop (1280 and 854 wide, H.264, silent)
  og/              Social preview image
```

## Content

Everything editable lives in three places:

- **`src/i18n/cs.ts` and `src/i18n/en.ts`** — every visible string. Czech is the
  source of truth; `en.ts` is typed as `typeof cs`, so a missing or misspelled
  key fails `bun run check` rather than shipping.
- **`src/data/units.ts`** — the apartments. Areas, prices, status
  (`available` / `soon` / `sold`), which photos and which PDF.
- **`src/data/site.ts`** — address, phone, e-mail, coordinates, tour URL.

Adding a language means adding `xx.ts`, listing it in `src/i18n/locales.mjs`,
adding its slugs to the `segments` map in `src/i18n/index.ts`, and creating the
route files under `src/pages/xx/`.

## Routing and i18n

Czech is the default locale and is served without a prefix; English lives under
`/en/`. Slugs are translated:

| | Czech | English |
|---|---|---|
| Home | `/` | `/en/` |
| Project | `/o-nas/` | `/en/about/` |
| Apartments | `/byty/` | `/en/apartments/` |
| Apartment | `/byty/1039-1/` | `/en/apartments/1039-1/` |
| Prices | `/cenik/` | `/en/pricing/` |
| Documents | `/dokumentace/` | `/en/documents/` |
| Contact | `/kontakt/` | `/en/contact/` |

Never hard-code a URL — call `path('units', locale)`. It resolves the locale
prefix, the translated segment and the deployment base path in one place.
For static files under `public/`, wrap the URL in `withBase()`.

## Deployment

Pushing to `main` deploys the `depthark/vila-scala` repository through the
Cloudflare Pages project `vila-scala`. GitHub Actions checks the build separately
and no longer publishes to GitHub Pages.

Cloudflare Pages settings:

- Production branch: `main`
- Build system: version 3
- Build command: `bun run build` (type-check and production build)
- Output directory: `dist`
- Root directory: repository root
- Node version: numeric version in `.nvmrc`; Cloudflare cannot use `lts/krypton`
- Bun version: `packageManager` in `package.json`
- Custom domain: `www.vila-scala.cz`
- Cloudflare redirect: `vila-scala.cz` → `https://www.vila-scala.cz`,
  preserving paths and query strings (effective once nameservers move)

The production origin defaults to `https://www.vila-scala.cz` and the base path
to `/`. `SITE` and `BASE` can override these for local verification. Do not set
a GitHub project base path on Cloudflare.

Never hard-code an absolute URL in a template: use `absolute()` or
`siteRoot()` from `src/i18n`. Canonicals, hreflang, `og:image`, robots and
JSON-LD all resolve against the configured production origin.

The Cloudflare DNS zone is prepared; activation requires Webnode support to
change the nameservers to `lloyd.ns.cloudflare.com` and
`michelle.ns.cloudflare.com`. The `www` CNAME at Webnode also points directly
to `vila-scala.pages.dev` during the transition. Preserve the Webnode mail records (MX, SPF,
DKIM, DMARC, autoconfig and autodiscover) when moving nameservers; only the
website records should point to Cloudflare Pages. Domain registration and
renewal remain with Webnode.

## SEO, HTTPS and crawler policy

- Every indexable Czech/English page has a unique title and description,
  canonical URL, reciprocal `hreflang` links (including `x-default`), and
  Open Graph/Twitter metadata. Apartment previews use their own 1200×630 JPEG.
- `/robots.txt` advertises `/sitemap-index.xml`; the sitemap includes all
  22 public pages and their translated URL pairs. The 404 page is `noindex`.
- JSON-LD describes the website, organization, individual pages, apartment
  complex, apartments, apartment list and visible breadcrumbs. Unit counts
  use `QuantitativeValue`; unpublished prices are omitted. The contact page
  describes a `ContactPage`, without presenting the villa as an estate agency.
- `public/_headers` adds six-month HSTS for the current host, anti-framing,
  MIME-sniffing protection, referrer and permissions policies, and a baseline
  CSP. The CSP restricts embedding, objects and base URLs; it is not a strict
  script allowlist. Matterport tours and the map remain usable.
- Hashed `/_astro/` files are cached for one year; HTML continues to
  revalidate. Pages deployment hosts are `noindex` to avoid duplicate indexing.
- Cloudflare Pages negotiates gzip/Brotli and redirects HTTP to HTTPS;
  do not precompress assets or set `Content-Encoding` manually.
- Cloudflare zone encryption is **Full (Strict)**. AI policies are Search:
  **Allow**, Agent: **Allow**, Training: **Disallow**, with Bot Preference Sync
  enabled. This preserves search access while opting out of training.
  Zone-level controls take effect after the nameserver change. The origin
  robots.txt already disallows GPTBot, ClaudeBot, CCBot, Google-Extended and
  Applebot-Extended; robots directives rely on crawler cooperation.

## Accessibility

Targets WCAG 2.2 AA, verified with Lighthouse (100 on Accessibility, Best
Practices and SEO) and by keyboard.

- Every text pair clears 4.5:1 in both themes; most clear AAA. Control borders
  clear 3:1. The contrast of the palette is the reason those exact hex values
  are in `global.css` — re-check before changing any of them.
- Status is never carried by colour alone: each badge pairs its hue with a
  distinct glyph and a text label.
- Skip link, one `<h1>` per page, landmark regions, visible focus rings that
  the sticky header can never obscure (`scroll-padding-top`).
- Menu and lightbox are real `<dialog>` elements — Escape, focus trapping and
  inertness come from the platform. Focus returns to whatever opened them.
- The hero video is muted, decorative (`aria-hidden`) and pausable, per WCAG
  2.2.2. It never loads for a visitor who asked for reduced motion, has
  Save-Data on, or is on a 2G connection.
- `prefers-reduced-motion: reduce` renders every animation's final state
  immediately. Without JavaScript, all revealed content is visible.

## Media

Photography, floor plans, PDFs and the hero loop were taken from the original
site and are stored in this repository. The hero loop is the original clip
mirrored end-to-end, so it repeats without a visible cut, encoded silent at two
widths; the poster frame is what paints first and what LCP measures.

## Design

`design-system/vila-scala/MASTER.md` holds the generated design-system
starting point. `DESIGN.md` records what was kept, what was overridden, and
why.
