# DevTinyTools

Free online developer tools. Every tool runs entirely in the browser — JSON is
never uploaded, and there is no backend, database or account system.

Current tools:

| Route             | Tool                        |
| ----------------- | --------------------------- |
| `/`               | Home + tool directory       |
| `/json-formatter` | JSON Formatter & Validator  |
| `/json-validator` | JSON Validator              |
| `/json-minifier`  | JSON Minifier               |
| `/about`          | About the site              |
| `/contact`        | Contact information         |
| `/privacy-policy` | Privacy policy              |

## Stack

- Next.js 16 (App Router, static pages) + React 19 + TypeScript
- Tailwind CSS 4
- Vitest for unit tests
- No runtime dependencies beyond React/Next

JSON handling uses the browser's native `JSON.parse` / `JSON.stringify`. Errors
are located with the engine's own position when it reports one, and otherwise
with a small built-in scanner (`locateJsonError` in `src/lib/json-utils.ts`).

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server on http://localhost:3000
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest (40 unit tests)
npm run build      # production build
npm run check      # lint + typecheck + test + build
```

## Environment variables

Both variables are optional. A Vercel deployment needs no configuration at all.

| Variable                    | Purpose                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`      | Forces the canonical origin used by metadata, `robots.txt` and `sitemap.xml`. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | When set, `/contact` shows a `mailto:` link. When empty, nothing is shown. |

Both are inlined at build time, so changing either one requires a new deployment.

The canonical origin is resolved in this order:

1. `NEXT_PUBLIC_SITE_URL`, when it is a usable absolute URL.
2. `VERCEL_PROJECT_PRODUCTION_URL`, injected by Vercel without any setup — the
   shortest custom domain, or the `*.vercel.app` domain, and present on preview
   deployments too.
3. `https://devtinytools.vercel.app` in production, `http://localhost:3000` in
   development.

A localhost value is ignored in a production build, so a misconfigured
environment cannot publish localhost canonical URLs. `VERCEL_URL` is
deliberately not used, because it changes on every deployment.

The contact address can also be set in code instead of the dashboard: edit
`CONTACT_EMAIL_FALLBACK` in `src/lib/site.ts` and push. Values that do not look
like an email address are ignored rather than rendered into a broken `mailto:`
link, which is why a stray full-width colon or trailing space in the dashboard
field silently results in "no address published yet".

## Project structure

```
src/
  app/                     routes, metadata, robots.ts, sitemap.ts, icons
  components/
    tools/                 client-side tool components
    ui/                    small presentational primitives
  lib/
    json-utils.ts          parse / format / minify / analyse + error location
    examples.ts            sample documents
    site.ts                site config and URL resolution
    tools.ts               tool registry (nav, cards, sitemap)
    ads.ts                 advertising configuration (disabled)
    clipboard.ts           clipboard helper with fallback
    download.ts            blob download + safe filenames
public/
  google5bbee8250864d585.html
                           Google Search Console HTML-file verification token.
                           The file name and its single line of content must
                           stay byte-identical, or verification fails.
```

## Privacy guarantees enforced by the code

- Tool components never call `fetch`, `XMLHttpRequest` or server actions.
- Input is not written to the URL, `localStorage`, `sessionStorage` or cookies.
- Nothing is logged to the console.
- Downloads use fixed, sanitised filenames — never the document content.

## Advertising

No ad code is loaded. `src/lib/ads.ts` holds the configuration and
`src/components/ad-slot.tsx` the three reserved positions. With
`ADS_ENABLED = false` the slot component returns `null`, so no empty boxes
render.

To enable later: set `ADS_ENABLED = true`, fill in `ADSENSE_CLIENT` and the ad
unit ids, then load the AdSense script once in `src/app/layout.tsx`. Reserved
positions do not affect the tool panes, and reserving them does not imply the
site is approved for any ad programme.

## Icons

`src/app/favicon.ico`, `src/app/apple-icon.png` and `src/app/icon.svg` are
generated from the same mark. To regenerate the raster versions after changing
the geometry:

```bash
node scripts/generate-icons.mjs
```

## Deploy

```bash
git init
git add .
git commit -m "feat: DevTinyTools JSON tools"
git branch -M main
git remote add origin git@github.com:<user>/<repo>.git
git push -u origin main
```

Then import the repository at <https://vercel.com/new> and deploy. No other
configuration is required: every page is static, and the canonical origin comes
from `VERCEL_PROJECT_PRODUCTION_URL`, which Vercel fills in automatically. Set
`NEXT_PUBLIC_SITE_URL` only if you want to pin a specific origin, and
`NEXT_PUBLIC_CONTACT_EMAIL` (or `CONTACT_EMAIL_FALLBACK` in `src/lib/site.ts`)
once you have a public contact address to publish.
